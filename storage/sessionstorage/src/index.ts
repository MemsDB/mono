import { DBDoc } from '@memsdb/core'
import { Data, StorageProvider } from '@memsdb/types/storageProvider'
const sessionStorage = window.sessionStorage

/**
 * Save and load backups from localStorage - may be subject to sessionStorage
 * size limits
 * @category Storage Provider
 */
export class SessionStorage implements StorageProvider {
  constructor() {}

  load(doc: DBDoc) {
    const data = sessionStorage.getItem(doc.id)

    if (data) return JSON.parse(data)
    else return {}
  }

  save(doc: DBDoc, data: Data) {
    sessionStorage.setItem(doc.id, JSON.stringify(data))

    return true
  }

  delete(doc: DBDoc) {
    sessionStorage.removeItem(doc.id)
  }
}
