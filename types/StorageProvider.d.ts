import type { DBDoc } from './Core'

/**
 * How a backup will be output by the DB and how it should be returned from
 * the load function
 */
export interface Data {
  [key: string]: any
}

/**
 * The required structure for a BackupProvider to function
 */
export interface StorageProvider<T>{
  save: (doc: DBDoc<T>, data: T) => boolean
  load: (doc: DBDoc<T>) => T
  delete: (doc: DBDoc<T>) => void
}
