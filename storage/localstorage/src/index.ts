import { Data, StorageProvider, DBDoc } from '@memsdb/types'
const localStorage = window.localStorage

/**
 * Save and load backups from localStorage - may be subject to localstorage size limits
 * @category Storage Provider
 */
export class LocalStorage<T> implements StorageProvider<T> {
  constructor() {}

  load(doc: DBDoc<T>): T {
    const data = localStorage.getItem(doc.id)

    if (data) return JSON.parse(data)
    else return {} as T
  }

  save(doc: DBDoc<T>, data: T) {
    localStorage.setItem(doc.id, JSON.stringify(data))

    return true
  }

  delete(doc: DBDoc<T>) {
    localStorage.removeItem(doc.id)
  }
}
