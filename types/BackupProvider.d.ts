/**
 * How a backup will be output by the DB and how it should be returned from
 * the load function
 */
export interface Backup {
  [key: string]: {
    keys: string[]
    values: any[][]
  }
}

/**
 * The required structure for a BackupProvider to function
 */
export interface BackupProvider {
  save: (backup: Backup) => boolean
  load: () => Backup
}
