// ---------------------------------------------------------------------------
// Utilitaires de Chiffrement de Bout en Bout (E2EE) pour le Signaling
// ---------------------------------------------------------------------------
// Utilise l'API native Web Crypto (window.crypto.subtle).
// Zéro dépendance externe.

/**
 * Dérive une clé AES-GCM 256 bits à partir d'un simple mot de passe (le roomId).
 * On utilise SHA-256 pour hacher le roomId (qui peut être court) en une clé de bonne taille.
 */
async function deriveKey(roomId: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.digest(
    'SHA-256',
    enc.encode(roomId)
  );

  return window.crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encode un ArrayBuffer en chaîne Base64.
 */
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Décode une chaîne Base64 en ArrayBuffer.
 */
function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Chiffre un objet JSON en utilisant AES-GCM.
 * @param data L'objet (ex: SimplePeer.SignalData) à chiffrer.
 * @param secret Le secret partagé (ex: roomId).
 * @returns Une chaîne contenant l'IV et les données chiffrées (Base64).
 */
export async function encryptSignalData(data: unknown, secret: string): Promise<string> {
  const key = await deriveKey(secret);
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 12 bytes pour AES-GCM
  const enc = new TextEncoder();
  const encodedData = enc.encode(JSON.stringify(data));

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodedData
  );

  // On concatène IV + EncryptedData pour pouvoir les séparer au déchiffrement
  const payload = new Uint8Array(iv.length + encryptedBuffer.byteLength);
  payload.set(iv, 0);
  payload.set(new Uint8Array(encryptedBuffer), iv.length);

  return bufferToBase64(payload.buffer);
}

/**
 * Déchiffre une chaîne contenant des données chiffrées avec AES-GCM.
 * @param encryptedPayload La chaîne Base64 contenant IV + Data.
 * @param secret Le secret partagé (ex: roomId).
 * @returns L'objet JSON déchiffré.
 */
export async function decryptSignalData<T>(encryptedPayload: string, secret: string): Promise<T> {
  const key = await deriveKey(secret);
  const payloadBuffer = base64ToBuffer(encryptedPayload);
  
  if (payloadBuffer.byteLength < 12) {
    throw new Error("Payload chiffré trop court (IV manquant)");
  }

  // L'IV correspond aux 12 premiers octets
  const iv = payloadBuffer.slice(0, 12);
  const data = payloadBuffer.slice(12);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  const dec = new TextDecoder();
  const jsonString = dec.decode(decryptedBuffer);
  return JSON.parse(jsonString) as T;
}
