import { readFileSync, existsSync, writeFileSync, mkdirSync, rmSync } from 'fs'
import { isAbsolute, join, normalize } from 'path'
import { Data, StorageProvider, DB, DBDoc } from '@memsdb/types'
import { validate } from 'uuid'

/**
 * Save and load backups from localStorage - may be subject to localstorage size limits
 * @category Storage Provider
 */
export class FSStorage<T> implements StorageProvider<T> {
  readonly saveDirectory: string
  readonly prefix: string

  private db: DB
  constructor(
    db: DB,
    opts: {
      saveDirectory?: string
      prefix?: string
    } = {}
  ) {
    this.db = db

    const { saveDirectory = './data', prefix = `${this.db.name}_` } = opts

    this.saveDirectory = normalize(saveDirectory)
    this.prefix = prefix

    if (!existsSync(this.saveDirectory)) {
      mkdirSync(this.saveDirectory, {
        recursive: true,
      })
    }
  }

  private normalizePath(docId: string) {
    const paths = [this.saveDirectory]
    if (validate(docId)) {
      paths.push(docId.substr(0, 2), docId.substr(2, 2))
    } else {
      paths.push('alternate')
    }

    const dirPath = normalize(join(...paths))
    const fileName = `${this.prefix}${docId}`

    if (!isAbsolute(this.saveDirectory)) {
      paths.unshift(process.cwd())
    }

    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, {
        recursive: true,
      })
    }

    return normalize(join(dirPath, fileName))
  }

  load(doc: DBDoc<T>): T {
    const filePath = this.normalizePath(doc.id)

    if (existsSync(filePath)) {
      const file = readFileSync(filePath, {
        encoding: 'utf8',
      })

      let docData

      try {
        docData = JSON.parse(file)
      } catch (error) {
        const err = error as Error

        docData = {
          _err: err,
          _errmessage: err.message,
          _errstack: err.stack,
        }
      } finally {
        return docData
      }
    } else return {} as T
  }

  save(doc: DBDoc<T>, data: T) {
    const filePath = this.normalizePath(doc.id)

    try {
      writeFileSync(filePath, JSON.stringify(data), {
        encoding: 'utf8',
      })
    } catch (err) {
      console.error(err)
      return false
    }

    return true
  }

  delete(doc: DBDoc<T>) {
    const filePath = this.normalizePath(doc.id)

    try {
      rmSync(filePath)
    } catch (error) {
      console.error(error)
      return false
    }

    return true
  }
}
