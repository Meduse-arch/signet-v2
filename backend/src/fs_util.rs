use std::fs;
use std::io::Write;
use std::path::Path;

/// Écrit `data` dans `path` de façon atomique : écriture dans un fichier `.tmp`
/// voisin, `fsync`, puis `rename` (remplace la cible). Un crash en cours
/// d'écriture laisse l'ancien fichier intact.
pub fn atomic_write(path: &Path, data: &[u8]) -> Result<(), String> {
    let file_name = path
        .file_name()
        .ok_or_else(|| "Chemin de fichier invalide".to_string())?
        .to_string_lossy()
        .into_owned();
    let tmp_path = path.with_file_name(format!("{}.tmp", file_name));

    let result = (|| -> std::io::Result<()> {
        let mut file = fs::File::create(&tmp_path)?;
        file.write_all(data)?;
        file.sync_all()?;
        fs::rename(&tmp_path, path)
    })();

    if let Err(e) = result {
        let _ = fs::remove_file(&tmp_path);
        return Err(format!("Erreur écriture atomique: {}", e));
    }
    Ok(())
}
