import { DBDoc } from "../doc";

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
export interface StorageProvider {
  save: (doc: DBDoc, data: Data) => boolean
  load: (doc: DBDoc) => Data
  delete: (doc: DBDoc) => void
}
