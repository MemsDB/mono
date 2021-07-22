import type debug from 'debug'
import type { BackupProvider } from './BackupProvider'
import type {
  EventHandler,
  EventHandlersType,
  MemsDBEvent,
} from './DBEventHandler'
import type { Query, QueryBuilder } from './Query'
import type { QueryHandler, QueryHandlerFunction } from './QueryHandler'
import type { StorageProvider } from './StorageProvider'

export interface DBAddCollectionOpts {
  replace?: boolean
}

export declare class DB{
  readonly name: string
  /** Key based Map containing all the collections */
  collections: Map<string, DBCollection<any>>
  /** Debugger variable */
  readonly db_: debug.Debugger

  options: {
    useDynamicIndexes: boolean
    backupProvider: BackupProvider
  }

  /** Storage engine to use for storing document data */
  storageEngine: StorageProvider<any>

  /**
   * Construct a new in db with the provided collection references.
   * This defaults to in memory document storage and void backups
   * @param name Name of database
   * @param opts Options object to modify DB behaviour (mostly unused)
   */
  constructor(
    name: string,
    opts?: {
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
      storageEngine?: StorageProvider<any>
    }
  )

  queryHandlers: Map<string, QueryHandlerFunction>

  /**
   * Add additional query operators/handlers to the search functionality
   * @param queryHandler QueryHandler to add
   */
  addQueryHandler(queryHandler: QueryHandler): void

  /**
   * Add an EventHandler class to the DB
   * @param eventHandler EventHandler or array of EventHandler classes to add to the DB
   */
  addEventHandler(eventHandler: EventHandler | EventHandler[]): void

  /**
   * Loop over the EventHandlers and emit the event to the provided function
   * @param event Event to emit
   */
  emitEvent(event: MemsDBEvent): void

  /**
   * Return a specified collection by name
   * @param name Collection name to select
   */
  c(name: string): DBCollection<any> | undefined

  /**
   * Alias of this.c() - Returns a specified collection
   * @param name Name of collection to retrieve
   */
  collection(name: string): DBCollection<any> | undefined

  /**
   * Add a new collection to the DB. It won't replace a collection unless you specify to
   * @param collection Collection to add to the db
   * @param replace Replace the specified collection if it exists
   */
  addCollection(
    collection: DBCollection<any>,
    opts?: DBAddCollectionOpts
  ): DBCollection<any>

  /**
   * Delete a collection and all its documents
   * @param name Collection name to delete
   */
  deleteCollection(name: string): ThisType<DB>

  /**
   * Empty out a collection, deleting the documents but leaving the collection
   * structure intact
   * @param name Empty out a specified collection
   */
  emptyCollection(name: string): ThisType<DB>

  /**
   * Backup collection data to the provided BackupProvider.
   */
  backup(): void

  /**
   * Restore collection documents from a backup using the provided
   * BackupProvider. This won't overwrite any documents
   */
  restore(): void
}

export interface DBCollectionFindOpts {
  queries?: Query[] | QueryBuilder;
  reactive?: boolean
}

export interface DBCollectionInsertOpts <T>{
  doc: T
  id?: string
  reactiveUpdate?: boolean
}

export interface DBCollectionInsertManyOpts <T>{
    doc: T[]
    reactiveUpdate?: boolean
}

export declare class DBCollection<T extends { [key: string]: any }> {
  /** Name of the collection */
  readonly name: string
  /** Schema every document should adhere to */
  readonly schema: T
  /** Document array */
  docs: DBDoc<T>[]
  
  idMap: Map<string, DBDoc<T>>
  /** Debugger variable */
  readonly col_: debug.Debugger
  /** Reference to the DB object */
  readonly db: DB
  /** Map for reactive query results */
  reactiveIndexed: Map<Query[] | QueryBuilder, { docs: DBDoc<any>[] }>

  /**
   * Create a structured collection of documents
   * @param db Database reference
   * @param schema Schema for content to adhere to
   */
  constructor(
    db: DB,
    schema: {
      /** Name of the collection schema */
      name: string
      /**
       * Structure of the collection. A key's value will be treated as
       * the default value for that key
       */
      structure: T
    }
  )

  /**
   * Find a specific document by its id
   * @param idStr ID to filter by
   */
  id(idStr: string): DBDoc<T> | null

  /**
   * Run a set of queries to filter documents
   * @param queries Array of queries to run
   * @param reactive Create and keep a reactive index of the query on the
   *    collection under collection.reactive[queryArr]
   * @category Query
   */
  find(opts: DBCollectionFindOpts): DBDoc<T>[]

  /**
   * Insert a new document into the array. Defaults will be loaded from the schema
   * @param opts Insert document options
   */
  insertOne(opts: DBCollectionInsertOpts<T>): DBDoc<T>

  /**
   * Alias of insertOne
   * @param opts Insert document options
   */
  insert(opts: DBCollectionInsertOpts<T>): DBDoc<T>

  /**
   * Add any amount of new documents to the collection
   * @param docs New documents to be added
   */
  insertMany(opts: DBCollectionInsertManyOpts<T>): ThisType<DBCollection<T>>

  /**
   * Emit an event to the attached database
   * @param event Event to emit
   */
  emitEvent(event: MemsDBEvent): void

  /**
   * Custom handler for toString to avoid recursion of toString and toJSON
   */
  toString(): string

  /**
   * Custom handler for toJSON to avoid recursion of toString and toJSON
   */
  toJSON(): string
}

export interface DBDocCustomPopulateOpts <T>{
  /* Where on the source doc to compare to */
  srcField: string
  /* Where on the comparison doc to compare to */
  targetField: string
  /* Where to place the child documents matching this query */
  destinationField: string
  /* The collection to pull child documents from for this query */
  collection: DBCollection<T>
  targetCol: DBCollection<T>
  query: Query[]
  unwind: boolean
}

export interface DBDocTreeOpts<T> {
  populations?: DBDocCustomPopulateOpts<T>[]
  maxDepth?: number
  currentDepth?: number
}

export declare class DBDoc<T> {
  /** Document id */
  id: string

  isCloned: boolean

  _createdAt: number
  _updatedAt: number

  /** Debugger variable */
  readonly doc_: debug.Debugger
  /** Reference to the parent collection */
  readonly collection: DBCollection<T>

  /** Reference to indexed data for repeated deep data matching */
  indexed: Map<string, any | any[]>

  /** Object for any plugin related data */
  _pluginData: Map<string, any | any[]>

  /**
   * Construct a new Document with the collections schema and any provided data
   * @param data Data to be assigned to the document schema
   * @param collection Reference to the parent collection
   * @param id Optional ID to set to the document
   * @param isCloned Whether or not this is a _real_ document (for data storage and other tidbits)
   */
  constructor(
    data: { [key: string]: any },
    collection: DBCollection<T>,
    id?: string,
    isCloned?: boolean
  )

  /**
   * Listen to changes on a specific key
   * @param key Key to listen to changes on
   * @param func Function to run when changes occur
   */
  subscribe(key: 'root' | keyof T | string, func: (key: string, data: any) => void): void
  
  /**
   * Remove all subscribed functions for a specified key
   * @param key Key to stop listening to
   */
  unsubscribe(key: 'root' | keyof T | string): void

  /**
   * The data of the document as provided by the storage provider
   */
  get data(): DBDoc<T>['collection']['schema']

  /**
   * Set the value of a key in the doc to a specified value.
   *
   * **This should only be done on shallow key values**, lest you want keys like
   * 'key1.key2.key3' as object keys in your data
   * @param key Key to set the value of
   * @param data Data to set to the afformentioned key
   * @returns Returns nothing
   */
  set(key: string, data: any): void

  /**
   * Set the root of the data object.
   *
   * This will completely replace the data object
   * @param data Data to set
   */
  setData(data: T): void

  /**
   * Object with functions for handling plugin data
   */
  pluginData: {
    /**
     * Get the data object from a specific plugin
     * @param plugin Plugin name to get data of
     * @returns Data from the plugin
     */
    get: (plugin: string) => any
    /**
     * Set/replace the data object for a plugin
     * @param plugin Plugin name to set data to
     * @param data Data to replace the plugin data with
     */
    set: (plugin: string, data: any) => void
    /**
     * Delete the data object of a specific plugin
     * @param plugin Plugin name to delete data of
     */
    delete: (plugin: string) => void
  }
  /**
   * Delete this document from the db
   */
  delete(): void

  /**
   * Populate down a tree of documents based on the provided MemsPL populateQuery
   * @param populateQuery MemsPL population query
   * @param filter Filter unspecified keys from the populated documents
   * @returns Cloned version of this document
   */
  populate(populateQuery: string, filter?: boolean): DBDoc<T>

  /**
   * Populate the document with another document that matches the query.
   * This will return a copy of the document and not a reference to the
   * original.
   * 
   * It's recommended you use the provided
   * populate (`doc.populate(...)`) function instead.
   * @param opts Options for the populate. Things like the target field and query don't have to be set
   */
  customPopulate(opts: DBDocCustomPopulateOpts<T>): DBDoc<any>

  /**
   * Populate a tree of documents. It's recommended you use the provided
   * populate (`doc.populate(...)`) function instead.
   * @param opts Options for making a tree from the provided document
   * @returns A cloned version of this doc that has the data field formatted into a tree
   */
  tree(opts?: DBDocTreeOpts<T>): DBDoc<any>

  /**
   * Duplicate this document, making mutations to it not affect the original
   */
  clone(): DBDoc<T>

  /**
   * Emit an event to the attached database
   * @param event Event to emit
   */
  emitEvent(event: MemsDBEvent): void

  /**
   * Returns a simplified view
   */
  toJSON(): string
}