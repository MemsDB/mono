import { readFileSync, existsSync, writeFileSync, mkdirSync, rmSync,  } from 'fs'
import { isAbsolute, join, normalize } from 'path'
import { DB, DBDoc } from '@memsdb/core'
import { Data, StorageProvider } from '@memsdb/types/storageProvider'

/**
 * Save and load backups from localStorage - may be subject to localstorage size limits
 * @category Storage Provider
 */
export class LocalStorage implements StorageProvider {
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
    const paths = [this.saveDirectory, `${this.prefix}${docId}`]

    if (!isAbsolute(this.saveDirectory)) {
      paths.unshift(process.cwd())
    }

    return normalize(join(...paths))
  }

  load(doc: DBDoc) {
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
    } else return {}
  }

  save(doc: DBDoc, data: Data) {
    const filePath = this.normalizePath(doc.id)
    
    try {
      writeFileSync(filePath, JSON.stringify(data), {
        encoding: 'utf8'
      })
    } catch (err) {
      console.error(err)
      return false
    }

    return true
  }
  
  delete(doc: DBDoc) {
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