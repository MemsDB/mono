import { BackupProvider } from '@memsdb/types/backupProvider'

/**
 * Send backups to the void, and retrieve nothing
 * @category Backup Provider
 */
export class VoidBackup implements BackupProvider {
  constructor() {}

  /**
   * Return nothing
   */
  load() {
    return {}
  }

  /**
   * Void save
   */
  save() {
    return true
  }
}
