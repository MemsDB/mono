import { Backup, BackupProvider } from '@memsdb/types/backupProvider'

/**
 * Save and load backups from localStorage - may be subject to localstorage
 * size limits
 * @category Backup Provider
 */
export class LocalStorageBackup implements BackupProvider {
  constructor() {}

  load() {
    const backup = localStorage.getItem('memsdb')

    if (backup) return JSON.parse(backup)
    else return {}
  }

  save(backup: Backup) {
    localStorage.setItem('memsdb', JSON.stringify(backup))

    return true
  }
}
