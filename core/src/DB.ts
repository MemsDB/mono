import { v4 } from 'uuid'
import debug from 'debug'
import { VoidBackup } from '@memsdb/backup-void'
import { MemoryStorage } from '@memsdb/storage-memory'

import type {
  DB as DBType,
  DBCollection as DBCollectionType,
  StorageProvider as StorageProviderType,
  Backup, BackupProvider,
  MemsDBEvent,
  EventHandler,
  EventHandlerType,
  EventHandlersType,
  EventName,
} from '@memsdb/types'

const memsdb_ = debug('memsdb')

/**
 * Database constructor containing all the initialised collections
 * @category Core
 */
export class DB implements DBType {
  /** Key based object containing all the collections */
  readonly name: string = 'memsdb'
  collections: DBType['collections'] = new Map()
  /** Debugger variable */
  readonly db_: debug.Debugger
  options: DBType['options']

  /**
   * @ignore
   * List of event handlers
   */
  private eventHandlers: Map<EventName, EventHandlerType[]> = new Map()

  readonly storageEngine: StorageProviderType<any>

  /**
   * Construct a new in memory db with the provided collection references
   * @param name Name of database
   * @param opts Options object to modify DB behaviour (mostly unused)
   */
  constructor(
    name: string = v4(),
    opts: {
      /**
       * Automatically generate dynamic indexes - link deeply nested content
       * in a document to the root document to speed up future query results
       */
      useDynamicIndexes?: boolean
      /**
       * BackupProvider to save and restore documents/collections to and from
       */
      backupProvider?: BackupProvider
      /**
       * Map of plugins to apply to the database
       */
      eventHandlers?: EventHandlersType
      /**
       * Storage provider for document data
       */
      storageEngine?: StorageProviderType<any>
    } = {}
  ) {
    this.name = name
    this.db_ = memsdb_.extend(`<db>${name}`)

    const {
      useDynamicIndexes = false,
      backupProvider = new VoidBackup(),
      eventHandlers,
      storageEngine = new MemoryStorage(),
    } = opts

    this.options = {
      useDynamicIndexes,
      backupProvider,
    }

    this.storageEngine = storageEngine

    if (eventHandlers) {
      const eventTypes = Object.keys(eventHandlers)

      const addEventHandler = (type: EventName, handler: EventHandlerType) => {
        const evHandler = this.eventHandlers.get(type)
        if (evHandler) {
          evHandler.push(handler)
        } else this.eventHandlers.set(type, [handler])
      }

      eventTypes.forEach(handlerType => {
        if (eventHandlers) {
          const handlers = eventHandlers[<EventName>handlerType]

          if (!handlers) return
          if (Array.isArray(handlers))
            handlers.forEach(handler =>
              addEventHandler(<EventName>handlerType, handler)
            )
          else addEventHandler(<EventName>handlerType, handlers)
        }
      })
    }
  }

  /**
   * Add an EventHandler class to the DB
   * @param eventHandler EventHandler or array of EventHandler classes to add to the DB
   */
  addEventHandler(eventHandler: EventHandler | EventHandler[]) {
    const addHandler = (handler: EventHandler) => {
      const handlerType = handler.eventType

      const keys = Object.keys(this.eventHandlers)

      const evHandlers = this.eventHandlers.get(handlerType)

      if (evHandlers) {
        evHandlers.push(handler.func)
      } else this.eventHandlers.set(handlerType, [handler.func])
    }

    if (Array.isArray(eventHandler)) {
      eventHandler.forEach(addHandler)
    } else {
      addHandler(eventHandler)

      this.emitEvent({
        event: 'EventDBHandlerAdded',
        db: this,
        handler: eventHandler,
      })
    }
  }

  /**
   * Loop over the EventHandlers and emit the event to the provided function
   * @param event Event to emit
   */
  emitEvent(event: MemsDBEvent): void {
    const evHandlers = this.eventHandlers.get(event.event)
    if (evHandlers) {
      evHandlers.forEach(handler => handler(event))
    }
  }

  /**
   * Return a specified collection by name
   * @param name Collection name to select
   */
  c(name: string) {
    /* DEBUG */ this.db_(
      'Finding and returning collection with name/key of `%s`',
      name
    )
    return this.collections.get(name)
  }

  /**
   * Alias of this.c() - Returns a specified collection
   * @param name Name of collection to retrieve
   */
  collection(name: string) {
    return this.c(name)
  }

  /**
   * Add a new collection to the DB. It won't replace a collection unless you specify to
   * @param collection Collection to add to the db
   * @param replace Replace the specified collection if it exists
   */
  addCollection(collection: DBCollectionType<any>, opts = { replace: false }) {
    /* DEBUG */ this.db_(
      'Adding collection `%s` to DB. Replace if it already exists:',
      collection.name,
      opts.replace ? 'true' : 'false'
    )

    /* DEBUG */ this.db_('Emitting event "EventDBAddCollection"')
    this.emitEvent({
      event: 'EventDBAddCollection',
      collection,
      opts,
    })

    const hasCollection = this.collections.has(collection.name)

    if (!hasCollection || opts.replace)
      this.collections.set(collection.name, collection)

    return collection
  }

  /**
   * Delete a collection and all its documents
   * @param name Collection name to delete
   */
  deleteCollection(name: string) {
    try {
      /* DEBUG */ this.db_('Removing collection `%s` from DB', name)
      const collection = this.collections.get(name)
      
      if (!collection) return this;

      /* DEBUG */ this.db_('Emitting event "EventDBAddCollection"')
      this.emitEvent({
        event: 'EventDBDeleteCollection',
        collection: collection,
      })

      collection.docs.forEach(doc => doc.delete())

      this.collections.delete(name)

      /* DEBUG */ this.db_('Emitting event "EventDBDeleteCollectionComplete"')
      this.emitEvent({
        event: 'EventDBDeleteCollectionComplete',
        name,
        success: true,
      })
    } catch (err) {
      /* DEBUG */ this.db_(
        "Collection deletion failed successfully, collection `%s` doesn't exist",
        name
      )

      /* DEBUG */ this.db_(
        'Emitting event "EventDBDeleteCollectionComplete" with error'
      )
      this.emitEvent({
        event: 'EventDBDeleteCollectionComplete',
        name,
        success: false,
        error: err as Error,
      })
    } finally {
      return this
    }
  }

  /**
   * Empty out a collection, deleting the documents but leaving the collection
   * structure intact
   * @param name Empty out a specified collection
   */
  emptyCollection(name: string) {
    const collection = this.collection(name)
    if (!collection) return this
    
    try {

      /* DEBUG */ this.db_(
        'Emptying collection `%s`. Current document count: %d',
        name,
        collection.docs.length
      )

      /* DEBUG */ this.db_('Emitting event "EventDBEmptyCollection"')
      this.emitEvent({
        event: 'EventDBEmptyCollection',
        collection: collection,
      })

      collection.docs.forEach(doc => doc.delete())
      collection.docs.length = 0
      /* DEBUG */ this.db_(
        'Emptying collection `%s` completed. Current document count: %d',
        name,
        collection.docs.length
      )

      /* DEBUG */ this.db_('Emitting event "EventDBEmptyCollection"')
      this.emitEvent({
        event: 'EventDBEmptyCollectionComplete',
        collection: collection,
        success: true,
      })
    } catch (err) {
      /* DEBUG */ this.db_(
        'Emptying collection `%s` failed as it does not exist.',
        name
      )

      /* DEBUG */ this.db_('Emitting event "EventDBEmptyCollection" with error')
      this.emitEvent({
        event: 'EventDBEmptyCollectionComplete',
        collection,
        success: false,
        error: err as Error,
      })
    } finally {
      return this
    }
  }

  /**
   * Backup collection data to the provided BackupProvider.
   */
  backup() {
    /* DEBUG */ this.db_('Starting backup')
    const backup: Backup = {}

    /* DEBUG */ this.db_('Serialising collections')
    this.collections.forEach((collection, key) => {
      const keys = Object.keys(collection.schema)
      const values = collection.docs.map(doc => [
        doc.id,
        ...keys.map(key => doc.data[key]),
      ])

      keys.unshift('id')

      backup[key] = {
        keys,
        values,
      }
    })
    /* DEBUG */ this.db_('Data structure created for backup')

    /* DEBUG */ this.db_('Emitting event "EventDBBackup"')
    this.emitEvent({
      event: 'EventDBBackup',
      backup,
    })

    /* DEBUG */ this.db_('Backing up database to BackupProvider')
    const backedUp = this.options.backupProvider.save(backup)
    /* DEBUG */ this.db_(
      'Backed up to BackupProvider, status: %s',
      backedUp ? 'success' : 'failed'
    )

    /* DEBUG */ this.db_('Emitting event "EventDBBackupComplete"')
    this.emitEvent({
      event: 'EventDBBackupComplete',
      backup,
      status: backedUp ? 'success' : 'failed',
    })

    /* DEBUG */ this.db_(
      'Backup finished, result: %s',
      backedUp ? 'Data backed up' : 'Data NOT backed up'
    )
  }

  /**
   * Restore collection documents from a backup using the provided
   * BackupProvider. This won't overwrite any documents
   */
  restore() {
    /* DEBUG */ this.db_('Restoring database collections from BackupProvider')
    const backup = this.options.backupProvider.load()

    /* DEBUG */ this.db_('Emitting event "EventDBRestore"')
    this.emitEvent({
      event: 'EventDBRestore',
      backup,
    })

    /* DEBUG */ this.db_('Collection data loaded from BackupProvider')

    const collectionKeys = Object.keys(backup)

    /* DEBUG */ this.db_('%d collections to restore', collectionKeys.length)

    collectionKeys.forEach(colKey => {
      const col = this.collection(colKey)
      if (!col) return

      const data = backup[colKey]

      data.values.forEach(docData => {
        const doc: { [key: string]: any } = {}

        data.keys.forEach((key, i) => {
          // Skip the ID
          if (i === 0) return
          doc[key] = docData[i]
        })

        col.insertOne({
          doc,
          id: docData[0],
        })
      })
    })

    /* DEBUG */ this.db_('Emitting event "EventDBRestoreComplete"')
    this.emitEvent({
      event: 'EventDBRestoreComplete',
      backup,
    })

    /* DEBUG */ this.db_('Database restored')
  }
}
