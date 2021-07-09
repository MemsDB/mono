import { StorageProvider, DBDoc } from '@memsdb/types'
const sessionStorage = window.sessionStorage

/**
 * Save and load backups from localStorage - may be subject to sessionStorage
 * size limits
 * @category Storage Provider
 */
export class SessionStorage<T> implements StorageProvider<T> {
  constructor() {}

  load(doc: DBDoc<T>): T {
    const data = sessionStorage.getItem(doc.id)

    if (data) return JSON.parse(data)
    else return {} as T
  }

  save(doc: DBDoc<T>, data: T) {
    sessionStorage.setItem(doc.id, JSON.stringify(data))

    return true
  }

  delete(doc: DBDoc<T>) {
    sessionStorage.removeItem(doc.id)
  }
}
