import { Backup, BackupProvider } from '@memsdb/types/backupProvider'

const sessionStorage = window.sessionStorage

/**
 * Save and load backups from localStorage - may be subject to sessionStorage
 * size limits
 * @category Backup Provider
 */
export class SessionStorageBackup implements BackupProvider {
  constructor() {}

  load() {
    const backup = sessionStorage.getItem('memsdb')

    if (backup) return JSON.parse(backup)
    else return {}
  }

  save(backup: Backup) {
    sessionStorage.setItem('memsdb', JSON.stringify(backup))

    return true
  }
}
