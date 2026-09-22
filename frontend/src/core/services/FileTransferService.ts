import { invoke } from '@tauri-apps/api/core';

export type SendBinaryFn = (data: Uint8Array) => void;

/**
 * Structure de l'En-tête Binaire (140 octets au total)
 * 0-3   : Signature 'FILE' (70, 73, 76, 69)
 * 4-7   : chunkIndex (Uint32 Little Endian)
 * 8-11  : totalChunks (Uint32 Little Endian)
 * 12-139: filename (String UTF-8 paddée de zéros, max 128 octets)
 */
const HEADER_SIZE = 140;
const CHUNK_SIZE = 64 * 1024; // 64 KB par morceau pour WebRTC

const isTauri = () => '__TAURI_INTERNALS__' in window;

interface IncomingFile {
  totalChunks: number;
  receivedCount: number;
  chunks: Uint8Array[];
}

class FileTransferServiceImpl {
  private incomingFiles: Map<string, IncomingFile> = new Map();
  private blobCache: Map<string, string> = new Map();

  public hasFile(filename: string): boolean {
    return this.blobCache.has(filename);
  }

  public getFileUrl(filename: string): string {
    return this.blobCache.get(filename) || '';
  }

  /**
   * Lit un fichier local via Rust et l'envoie en morceaux via WebRTC.
   */
  public async sendFile(filename: string, sendBinary: SendBinaryFn): Promise<void> {
    try {
      console.log(`[FileTransfer] Début d'envoi du fichier : ${filename}`);
      // L'appel Rust `read_asset` renvoie un Array de numbers (Vec<u8>)
      const data: number[] = await invoke('read_asset', { hash: filename });
      const bytes = new Uint8Array(data);
      
      const totalChunks = Math.ceil(bytes.length / CHUNK_SIZE);
      const encoder = new TextEncoder();
      const filenameBytes = encoder.encode(filename);

      if (filenameBytes.length > 128) {
        throw new Error("Le nom de fichier est trop long pour le transfert.");
      }

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, bytes.length);
        const chunkData = bytes.slice(start, end);

        // Préparation du buffer (Header + Data)
        const buffer = new ArrayBuffer(HEADER_SIZE + chunkData.length);
        const view = new DataView(buffer);
        const uint8View = new Uint8Array(buffer);

        // 1. Signature 'FILE'
        view.setUint8(0, 70); // F
        view.setUint8(1, 73); // I
        view.setUint8(2, 76); // L
        view.setUint8(3, 69); // E

        // 2. Index et Total
        view.setUint32(4, i, true); // true = LittleEndian
        view.setUint32(8, totalChunks, true);

        // 3. Filename
        uint8View.set(filenameBytes, 12);

        // 4. Data
        uint8View.set(chunkData, HEADER_SIZE);

        // Envoi
        sendBinary(uint8View);

        // Petit délai pour ne pas saturer le tampon d'envoi WebRTC
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      console.log(`[FileTransfer] Fichier ${filename} envoyé avec succès en ${totalChunks} morceaux.`);
    } catch (err) {
      console.error(`[FileTransfer] Erreur lors de l'envoi de ${filename}:`, err);
    }
  }

  /**
   * Réceptionne un chunk binaire, le stocke, et reconstruit le fichier si terminé.
   * Déclenche un événement global quand le fichier est prêt.
   */
  public async receiveChunk(raw: Uint8Array, onFileComplete?: (filename: string, blobUrl?: string) => void): Promise<void> {
    if (raw.length < HEADER_SIZE) return;

    const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
    
    // Vérification de sécurité de la signature
    if (view.getUint8(0) !== 70 || view.getUint8(1) !== 73 || view.getUint8(2) !== 76 || view.getUint8(3) !== 69) {
      return;
    }

    const chunkIndex = view.getUint32(4, true);
    const totalChunks = view.getUint32(8, true);

    // Extraction du filename (lire jusqu'au premier zéro)
    const filenameBytes = raw.subarray(12, HEADER_SIZE);
    let nameLen = 0;
    while (nameLen < 128 && filenameBytes[nameLen] !== 0) nameLen++;
    const filename = new TextDecoder().decode(filenameBytes.subarray(0, nameLen));

    const chunkData = raw.subarray(HEADER_SIZE);

    if (!this.incomingFiles.has(filename)) {
      this.incomingFiles.set(filename, {
        totalChunks,
        receivedCount: 0,
        chunks: new Array(totalChunks)
      });
      console.log(`[FileTransfer] Réception du fichier ${filename} commencée (${totalChunks} morceaux)`);
    }

    const fileState = this.incomingFiles.get(filename)!;
    
    // Si on n'avait pas encore reçu ce morceau
    if (!fileState.chunks[chunkIndex]) {
      fileState.chunks[chunkIndex] = chunkData;
      fileState.receivedCount++;
    }

    if (fileState.receivedCount === fileState.totalChunks) {
      console.log(`[FileTransfer] Fichier ${filename} reçu entièrement. Reconstruction...`);
      
      // Assemblage final
      let totalSize = 0;
      for (const c of fileState.chunks) totalSize += c.length;
      const fullFile = new Uint8Array(totalSize);
      let offset = 0;
      for (const c of fileState.chunks) {
        fullFile.set(c, offset);
        offset += c.length;
      }

      this.incomingFiles.delete(filename);

      // On extrait l'extension pour le MIME type et la sauvegarde
      const parts = filename.split('.');
      const ext = parts.length > 1 ? parts.pop() : 'bin';

      if (isTauri()) {
        try {
          // Enregistre dans la bibliothèque locale (Rust)
          await invoke('upload_asset', { data: Array.from(fullFile), extension: ext });
          console.log(`[FileTransfer] Fichier ${filename} sauvegardé localement via Rust !`);
          if (onFileComplete) onFileComplete(filename);
        } catch (err) {
          console.error(`[FileTransfer] Erreur sauvegarde locale pour ${filename}:`, err);
        }
      } else {
        // Enregistrement en mémoire (Navigateur Standard)
        const mimeType = ext === 'png' ? 'image/png' : (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg' : (ext === 'webp') ? 'image/webp' : 'application/octet-stream';
        const blob = new Blob([fullFile], { type: mimeType });
        const url = URL.createObjectURL(blob);
        this.blobCache.set(filename, url);
        console.log(`[FileTransfer] Fichier ${filename} sauvegardé en mémoire (Blob URL) !`);
        if (onFileComplete) onFileComplete(filename, url);
      }
    }
  }
}

export const FileTransferService = new FileTransferServiceImpl();
