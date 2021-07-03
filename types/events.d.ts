import type { DBCollection } from '../collection'
import type { DBDoc } from '../doc'
import type { Backup } from './backupProvider'
import type { AddCollectionOpts } from './DB'
import type { CollectionFindOpts, CollectionInsertOpts } from './Collection'
import type { DocumentCustomPopulateOpts, DocumentTreeOpts } from './Document'
import { DB } from '../db'
import { EventHandler } from '../eventHandler'

/**
 * Fires whenever the db.backup() function is called. Plugins will run BEFORE
 * the BackupProvider writes the structured Backup to disk (or elsewhere).
 * @category Database Event
 */
export interface EventDBBackup {
  event: 'EventDBBackup'
  /**
   * The Backup object that will be written to the BackupProvider. Mutations
   * here will effect what's written to the BackupProvider.
   */
  backup: Backup
}

/**
 * Fires whenever an event handler is added to the database
 * @category Database Event
 */
export interface EventDBHandlerAdded {
  
  event: 'EventDBHandlerAdded'
  /**
   * A reference to the database itself, useful for handlers that require a reference to the DB
   */
  db: DB
  /**
   * A reference to the handler being added.
   */
  handler: EventHandler | ((event: MemsDBEvent) => void)
}

/**
 * Fires whenever the db.backup() function is called. Plugins will run AFTER
 * the BackupProvider writes the structured Backup to the designated backup provider.
 * @category Database Event
 */
export interface EventDBBackupComplete {
  event: 'EventDBBackupComplete'
  /**
   * The Backup object that will be written to the BackupProvider. Mutations
   * here will effect what's written to the BackupProvider.
   */
  backup: Backup
  status: 'success' | 'failed'
}

/**
 * Fires whenever the db.restore() function is called. Plugins will be run
 * BEFORE the BackupProvider loads the content, and before it gets applied to
 * the database.
 * @category Database Event
 */
export interface EventDBRestore {
  event: 'EventDBRestore'
  /**
   * The Backup object that will be restored to the database. Mutations
   * here will be written to the database
   */
  backup: Backup
}

/**
 * Fires whenever the db.restore() function is called. Plugins will be run
 * AFTER the BackupProvider loads the content, and before it gets applied to
 * the database.
 * @category Database Event
 */
export interface EventDBRestoreComplete {
  event: 'EventDBRestoreComplete'
  /**
   * The Backup object that will be written to the BackupProvider. Mutations
   * here will effect what's written to the BackupProvider.
   */
  backup: Backup
}

/**
 * Fires when a collection is added to the database.
 * @category Database Event
 */
export interface EventDBAddCollection {
  event: 'EventDBAddCollection'
  /**
   * A reference to the added collection. Mutate or read as necessary
   */
  collection: DBCollection
  /**
   * Reference to the opts used for adding a collection to the database.
   * Modifying these options will modify original object
   */
  opts: AddCollectionOpts
}

/**
 * Fires when a collection is about to be deleted from the database.
 * @category Database Event
 */
export interface EventDBDeleteCollection {
  event: 'EventDBDeleteCollection'
  /**
   * A reference to the collection about to be deleted.
   */
  collection: DBCollection
}

/**
 * Fires when a collection is deleted from the database.
 * @category Database Event
 */
export interface EventDBDeleteCollectionComplete {
  event: 'EventDBDeleteCollectionComplete'
  /**
   * The name of the collection deleted
   */
  name: string
  /**
   * Whether or not the action was successful
   */
  success: boolean
  /**
   * An error as to why it wasn't successful
   */
  error?: Error
}

/**
 * Fires when the DB goes to clear a collection.
 * @category Database Event
 */
export interface EventDBEmptyCollection {
  event: 'EventDBEmptyCollection'
  /**
   * A reference to the collection
   */
  collection: DBCollection
}

/**
 * Fires when the DB is finished clearing a collection
 * @category Database Event
 */
export interface EventDBEmptyCollectionComplete {
  event: 'EventDBEmptyCollectionComplete'
  /**
   * A reference to the collection
   */
  collection: DBCollection
  /**
   * Whether or not the action was successful
   */
  success: boolean
  /**
   * An error as to why it wasn't successful
   */
  error?: Error
}

/**
 * Fires at the start of find function from a collection. This includes the
 * col.id() function.
 * @category Database Event
 */
export interface EventCollectionFind {
  event: 'EventCollectionFind'
  /**
   * The options provided to the find function. Mutations to this will modify
   * the results of the find function.
   */
  opts: CollectionFindOpts
}

/**
 * Fires at the end of find function from a collection. This includes the
 * col.id() function.
 * @category Database Event
 */
export interface EventCollectionFindComplete {
  event: 'EventCollectionFindComplete'
  /**
   * The options provided to the find function.
   */
  opts: CollectionFindOpts
  /**
   * A reference to the results array returned from the queries. Adjust this
   * to modify what gets returned
   */
  docs: DBDoc[]
}

/**
 * Run before a document is inserted. This allows you to modify the data
 * inserted, bypassing the collection schema.
 * @category Database Event
 */
export interface EventCollectionInsert {
  event: 'EventCollectionInsert'
  /**
   * Data to be used in the creation of a doc on a collection. Mutating this
   * will change what gets written. If you add keys in this step that aren't
   * in the collection schema, they will be omitted from backups.
   */
  opts: CollectionInsertOpts
}

/**
 * Fired after a document is inserted into the collection.
 * @category Database Event
 */
export interface EventCollectionInsertComplete {
  event: 'EventCollectionInsertComplete'
  /**
   * A reference to the inserted document. Mutations here will persist.
   * If you add keys in this step that aren't in the collection schema,
   * they will be omitted from backups.
   */
  doc: DBDoc
  /**
   * Same document as doc, this one won't trigger events when updated though
   */
  unlistenedDoc: DBDoc
  /**
   * A reference to the containing collection
   */
  collection: DBCollection
}

/**
 * Fired after a collection is converted to a string. To prevent an entire
 * collection from being converted, the toJSON function has been replaced
 * with one that simply outputs "(DBCollection<CollectionName>)".
 * @category Database Event
 */
export interface EventCollectionToJSON {
  event: 'EventCollectionToJSON'
  /**
   * String that was originally going to be returned. Modify this key to
   * adjust the output
   */
  str: string
}

/**
 * Fired when a document has its .delete() method called.
 * @category Database Event
 */
export interface EventDocumentDelete {
  event: 'EventDocumentDelete'
  /**
   * A reference to the document before it gets removed from the collection and
   * deleted
   */
  doc: DBDoc
}

/**
 * Fired after a document has finished deleting itself
 * @category Database Event
 */
export interface EventDocumentDeleteComplete {
  event: 'EventDocumentDeleteComplete'
  /**
   * The ID of the document that was just deleted
   */
  id: string
  /**
   * Whether or not the action was successful
   */
  success: boolean
  /**
   * An error as to why it wasn't successful
   */
  error?: Error
}

/**
 * Fired when the .customPopulate() function is run on a document.
 * @category Database Event
 */
export interface EventDocumentCustomPopulate {
  event: 'EventDocumentCustomPopulate'
  /**
   * The cloned document that will be modified. Changes to
   * this document won't persist to the original.
   */
  doc: DBDoc
  /**
   * The CustomPopulateQuery object about to be used. Modify this to
   * alter the outcome of the populate function
   */
  opts: DocumentCustomPopulateOpts
}

/**
 * Fired when the .customPopulate() function is run on a document.
 * @category Database Event
 */
export interface EventDocumentCustomPopulateComplete {
  event: 'EventDocumentCustomPopulateComplete'
  /**
   * The cloned document with the applied mutations. Changes to
   * this document won't persist to the original.
   */
  doc: DBDoc
  /**
   * The CustomPopulateQuery object about to be used. Modify this to
   * alter the outcome of the populate function
   */
  opts: DocumentCustomPopulateOpts
}

/**
 * Fired when the .tree() function is called on a document.
 * @category Database Event
 */
export interface EventDocumentTree {
  event: 'EventDocumentTree'
  /**
   * The cloned document that will be modified. Changes to
   * this document won't persist to the original.
   */
  doc: DBDoc

  opts: DocumentTreeOpts
}

/**
 * Fired when the .tree() function has finished running on a document
 * @category Database Event
 */
export interface EventDocumentTreeComplete {
  event: 'EventDocumentTreeComplete'
  /**
   * The cloned document with the applied mutations. Changes to
   * this document don't persist to the original.
   */
  doc: DBDoc

  opts: DocumentTreeOpts
}

/**
 * Fired when a document is cloned.
 * @category Database Event
 */
export interface EventDocumentClone {
  event: 'EventDocumentClone'
  /**
   * The original document, mutations will persist and will be cloned
   */
  doc: DBDoc
}

/**
 * Fired after a document is cloned.
 * @category Database Event
 */
export interface EventDocumentCloneComplete {
  event: 'EventDocumentCloneComplete'
  /**
   * The cloned document. Changes to this document won't persist/reflect on the
   * original document
   */
  doc: DBDoc
}

/**
 * Fired after a document is updated.
 * @category Database Event
 */
export interface EventCollectionDocumentUpdated {
  event: 'EventCollectionDocumentUpdated'
  /**
   * A reference to the modified document
   */
  doc: DBDoc
  /**
   * A reference to the containing collection
   */
  collection: DBCollection
}

/**
 * Union type of the different supported event types
 * @category Database Event
 */
export type MemsDBEvent =
  | EventDBHandlerAdded
  | EventDBBackup
  | EventDBBackupComplete
  | EventDBRestore
  | EventDBRestoreComplete
  | EventDBAddCollection
  | EventDBDeleteCollection
  | EventDBDeleteCollectionComplete
  | EventDBEmptyCollection
  | EventDBEmptyCollectionComplete
  | EventCollectionFind
  | EventCollectionFindComplete
  | EventCollectionInsert
  | EventCollectionInsertComplete
  | EventCollectionToJSON
  | EventDocumentDelete
  | EventDocumentDeleteComplete
  | EventDocumentCustomPopulate
  | EventDocumentCustomPopulateComplete
  | EventDocumentTree
  | EventDocumentTreeComplete
  | EventDocumentClone
  | EventDocumentCloneComplete
  | EventCollectionDocumentUpdated

export type EventName = Pick<MemsDBEvent, 'event'>['event']

export type EventHandlerType = (
  event: MemsDBEvent
) => (any | void) | Promise<any | void>

export type EventHandlersType = Record<
  EventName,
  EventHandlerType | EventHandlerType[] | undefined
>
