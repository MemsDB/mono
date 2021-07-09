import type { Data, StorageProvider, DBDoc } from '@memsdb/types'

/**
 * Save and load backups from localStorage - may be subject to localstorage
 * size limits
 * @category Storage Provider
 */
export class MemoryStorage<T> implements StorageProvider<T> {
  constructor() {}

  load(doc: DBDoc<T>): T {
    return doc.pluginData.get('memoryStorage') 
  }

  save(doc: DBDoc<T>, data: T) {
    doc.pluginData.set('memoryStorage', data)

    return true
  }

  delete(doc: DBDoc<T>) {
    doc.pluginData.delete('memoryStorage')
  }
}
