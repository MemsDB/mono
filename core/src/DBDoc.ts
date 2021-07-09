import { v4 } from 'uuid'
import { cloneDeep, merge } from 'smoldash'
import { updateDocIndex } from './utils/Indexed'
import { updateReactiveIndex } from './utils/ReactiveIndex'
import { nestedKey } from './utils/NestedKey'
import { debounce } from './utils/Debounce'
import { populate } from './Populate'

import type {
  DBDoc as DBDocType,
  DBCollection as DBCollectionType,
  DBDocCustomPopulateOpts,
  DBDocTreeOpts,
  MemsDBEvent
} from '@memsdb/types'

/**
 * Class for creating structured documents
 * @category Core
 */
export class DBDoc<T> implements DBDocType<T> {
  /** Document id */
  id: string

  isCloned: boolean = false

  _createdAt: number = Date.now()
  _updatedAt: number = Date.now()

  /** Debugger variable */
  readonly doc_: debug.Debugger
  /** Reference to the parent collection */
  readonly collection: DBCollectionType<T>

  /** Reference to indexed data for repeated deep data matching */
  indexed: DBDocType<T>['indexed'] = new Map()

  /** Object for any plugin related data */
  _pluginData: DBDocType<T>['_pluginData'] = new Map()

  /**
   * Construct a new Document with the collections schema and any provided data
   * @param data Data to be assigned to the document schema
   * @param collection Reference to the parent collection
   */
  constructor(
    data: { [key: string]: any },
    collection: DBCollectionType<T>,
    id = v4(),
    isCloned = false
  ) {
    this.collection = collection

    // Ensure the document has a valid and unique ID
    this.id = id

    this.isCloned = isCloned

    // Ensure this.data is a replica of the schema before assigning the new data
    this.setData(merge(cloneDeep(this.collection.schema), cloneDeep(data)))

    // Assign the data to the new document
    this.doc_ = collection.col_.extend(`<doc>${this.id}`)
  }

  private updateIndexes = debounce((path: string) => {
    /* DEBUG */ this.collection.col_(
      'Document %s was modified at path %s',
      this.id,
      path
    )
    this._updatedAt = Date.now()
    if (Object.keys(this.indexed).length > 0) {
      for (const key in this.indexed) {
        updateDocIndex<T>(this as DBDocType<T>, key)
        this.collection.col_('Updated index "%s" for document %s', key, this.id)
      }
    }
    for (const key of this.collection.reactiveIndexed.keys()) {
      updateReactiveIndex(this.collection, key)
      this.collection.col_('Updated collection reactive index for key %j', key)
    }
    /* DEBUG */ this.collection.col_(
      'Emitting event "EventCollectionDocumentUpdated"'
    )
    this.collection.emitEvent({
      event: 'EventCollectionDocumentUpdated',
      doc: this,
      collection: this.collection,
    })
  }, 300)

  /**
   * The data of the document as provided by the storage provider
   */
  get data() {
    let data

    const details = {
      _createdAt: this._createdAt,
      _updatedAt: this._updatedAt,
      id: this.id,
    }

    if (this.isCloned) {
      data = this.pluginData.get('internal:cloned')
    } else {
      data = this.collection.db.storageEngine.load(this)
    }

    return { ...data, ...details }
  }

  /**
   * Set the value of a key in the doc to a specified value.
   *
   * **This should only be done on shallow key values**, lest you want keys like
   * 'key1.key2.key3' as object keys in your data
   * @param key Key to set the value of
   * @param data Data to set to the afformentioned key
   * @returns Returns nothing
   */
  set(key: string, data: any) {
    const docData = this.data

    if (data === '') {
      return
    } else {
      docData[key] = data
    }

    if (this.isCloned) {
      this.pluginData.set('internal:cloned', docData)
    } else {
      this.collection.db.storageEngine.save(this, docData)
      this.updateIndexes(key)
    }
  }

  /**
   * Set the root of the data object.
   *
   * This will completely replace the data object
   * @param data Data to set
   */
  setData(data: any) {
    if (this.isCloned) {
      this.pluginData.set('internal:cloned', data)
    } else {
      this.collection.db.storageEngine.save(this, data)
      this.updateIndexes('root')
    }
  }

  /**
   * Object with functions for handling plugin data
   */
  pluginData = {
    /**
     * Get the data object from a specific plugin
     * @param plugin Plugin name to get data of
     * @returns Data from the plugin
     */
    get: (plugin: string) => {
      return this._pluginData.get(plugin)
    },
    /**
     * Set/replace the data object for a plugin
     * @param plugin Plugin name to set data to
     * @param data Data to replace the plugin data with
     */
    set: (plugin: string, data: any) => {
      this._pluginData.set(plugin, data)
    },
    /**
     * Delete the data object of a specific plugin
     * @param plugin Plugin name to delete data of
     */
    delete: (plugin: string) => {
      this._pluginData.delete(plugin)
    },
  }

  /**
   * Delete this document from the db
   */
  delete() {
    try {
      /* DEBUG */ this.doc_('Emitting event "EventDocumentDelete"')
      this.emitEvent({
        event: 'EventDocumentDelete',
        doc: this,
      })

      /* DEBUG */ this.doc_('Splicing document from collection')
      this.collection.docs.splice(
        this.collection.docs.findIndex((val: any) => val === this),
        1
      )

      for (const key of this.collection.reactiveIndexed.keys()) {
        /* DEBUG */ this.doc_('Updating reactive index')
        updateReactiveIndex(this.collection, key)
      }

      /* DEBUG */ this.doc_('Emitting event "EventDocumentDeleteComplete"')
      this.emitEvent({
        event: 'EventDocumentDeleteComplete',
        id: this.id,
        success: true,
      })
    } catch (err) {
      /* DEBUG */ this.doc_('Failed to delete this document, %J', err)
      /* DEBUG */ this.doc_(
        'Emitting event "EventDocumentDeleteComplete" with error'
      )
      this.emitEvent({
        event: 'EventDocumentDeleteComplete',
        id: this.id,
        success: false,
        error: err as Error,
      })
    }
  }

  /**
   * Populate down a tree of documents based on the provided MemsPL populateQuery
   * @param populateQuery MemsPL population query
   * @param filter Filter unspecified keys from the populated documents
   * @returns Cloned version of this document
   */
  populate(populateQuery: string, filter = false): DBDoc<T> {
    const [populated] = populate<T>(this.collection, [this], populateQuery, filter)

    return populated as DBDoc<T>
  }

  /**
   * Populate the document with another document that matches the query.
   * This will return a copy of the document and not a reference to the
   * original.
   *
   * It's recommended you use the provided
   * populate (`doc.populate(...)`) function instead.
   * @param opts Options for the populate. Things like the target field and query don't have to be set
   */
  customPopulate(opts: DBDocCustomPopulateOpts) {
    // Debugger variable
    const populate_ = this.doc_.extend('customPopulate')

    // Construct a new document based on the original so as to not perform a mutation
    /* DEBUG */ populate_(
      'Creating identical document so as to avoid mutations'
    )
    const resultDoc = this.clone()

    /* DEBUG */ this.doc_('Emitting event "EventDocumentCustomPopulate"')
    this.emitEvent({
      event: 'EventDocumentCustomPopulate',
      doc: resultDoc,
      opts,
    })

    // Destructure out variables
    const {
      srcField,
      targetField = 'id',
      targetCol,
      query = [
        {
          key: targetField,
          operation: '===',
          comparison: srcField === 'id' ? this.id : this.data[srcField],
          inverse: false,
        },
      ],
      destinationField = 'children',
      unwind = false,
    } = opts

    /* DEBUG */ populate_(
      'Populating document `%s` field with results from `%s.%s`',
      destinationField,
      targetCol,
      targetField
    )

    /* DEBUG */ populate_('Finding child documents')
    const queriedDocuments = targetCol.find({ queries: query })

    // Set a specific field to the results of the query, unwinding if necessary
    /* DEBUG */ populate_(
      'Setting field on document to contain children. Unwind: %s',
      unwind ? 'true' : 'false'
    )

    resultDoc.set(
      destinationField,
      unwind && queriedDocuments.length < 2
        ? queriedDocuments[0]
        : queriedDocuments
    )

    /* DEBUG */ this.doc_(
      'Emitting event "EventDocumentCustomPopulateComplete"'
    )
    this.emitEvent({
      event: 'EventDocumentCustomPopulateComplete',
      doc: resultDoc,
      opts,
    })

    // Return the copied document and not the original
    /* DEBUG */ populate_('Finished populating field, returning ghost document')
    return resultDoc
  }

  /**
   * Populate a tree of documents. It's recommended you use the provided
   * populate (`doc.populate(...)`) function instead.
   * @param opts Options for making a tree from the provided document
   * @returns A cloned version of this doc that has the data field formatted into a tree
   */
  tree(opts: DBDocTreeOpts = {}) {
    opts = {
      populations: [],
      maxDepth: 0,
      currentDepth: 1,
      ...opts,
    }
    // Debugger variable
    const tree_ = this.doc_.extend('tree')

    const doc = this.clone()

    /* DEBUG */ this.doc_('Emitting event "EventDocumentTree"')
    this.emitEvent({
      event: 'EventDocumentTree',
      doc,
      opts,
    })

    if (!opts) return doc

    /* DEBUG */ tree_('Number of populations: %d', opts.populations?.length)

    // Map over populations array to run individual populations
    opts.populations?.map((q, i) => {
      if (this.collection.name === q.collection.name) {
        /* DEBUG */ tree_('Running population number %d', i)

        const children = q.collection.find({
          queries: [
            {
              key: q.targetField,
              operation: '===',
              comparison:
                q.srcField === 'id'
                  ? this.id
                  : nestedKey(this.data, q.srcField),
              inverse: false,
            },
          ],
        })

        if (opts.maxDepth && <number>opts.currentDepth <= opts.maxDepth)
          doc.set(
            q.destinationField,
            children.map((child: DBDoc<T>) =>
              child.tree({
                ...opts,
                currentDepth: <number>opts.currentDepth + 1,
              })
            )
          )
      }
    })

    /* DEBUG */ this.doc_('Emitting event "EventDocumentTreeComplete"')
    this.emitEvent({
      event: 'EventDocumentTreeComplete',
      doc,
      opts,
    })

    /* DEBUG */ tree_(
      'Finished running %d populations, returning result',
      opts.populations?.length
    )
    return doc
  }

  /**
   * Duplicate this document, making mutations to it not affect the original
   */
  clone() {
    /* DEBUG */ this.doc_('Emitting event "EventDocumentClone"')
    this.emitEvent({
      event: 'EventDocumentClone',
      doc: this,
    })
    const cloned = new DBDoc({}, this.collection, this.id, true)

    cloned.setData(cloneDeep(this.data))

    cloned._createdAt = this._createdAt
    cloned._updatedAt = this._updatedAt

    /* DEBUG */ this.doc_('Emitting event "EventDocumentClone"')
    this.emitEvent({
      event: 'EventDocumentCloneComplete',
      doc: cloned,
    })

    return cloned
  }

  /**
   * Emit an event to the attached database
   * @param event Event to emit
   */
  emitEvent(event: MemsDBEvent) {
    this.collection.emitEvent(event)
  }

  /**
   * Returns a simplified view
   */
  toJSON() {
    return {
      ...this.data,
      id: this.id,
      _type: `(DBCollection<${this.collection.name}<DBDoc>>)`,
      _indexes: Object.keys(this.indexed),
    }
  }
}
