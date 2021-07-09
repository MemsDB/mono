import { runQuery } from './Query'
import { updateReactiveIndex, createReactiveIndex } from './utils/ReactiveIndex'

import { DBDoc } from './DBDoc'
import type {
  DB as DBType,
  DBCollection as DBCollectionType,
  DBCollectionFindOpts,
  DBCollectionInsertOpts,
  DBDoc as DBDocType,
  DBCollectionInsertManyOpts,
  MemsDBEvent,
  Query,
  QueryBuilder,
} from '@memsdb/types'

/**
 * Class for creating collections of structured documents
 * @category Core
 */
export class DBCollection<T extends { [key: string]: any }>
  implements DBCollectionType<T>
{
  /** Name of the collection */
  readonly name: string
  /** Schema every document should adhere to */
  readonly schema: T
  /** Document array */
  docs: DBDocType<T>[]
  /** Debugger variable */
  readonly col_: debug.Debugger
  /** Reference to the DB object */
  readonly db: DBType
  /** Map for reactive query results */
  reactiveIndexed: Map<Query[] | QueryBuilder, { docs: DBDocType<T>[] }> =
    new Map()

  /**
   * Create a structured collection of documents
   * @param db Database reference
   * @param schema Schema for content to adhere to
   */
  constructor(
    db: DBType,
    schema: {
      name: string
      structure: T
    }
  ) {
    this.schema = schema.structure
    this.docs = []
    this.name = schema.name

    this.col_ = db.db_.extend(`<col>${schema.name}`)

    this.db = db
    this.db.addCollection(this as DBCollectionType<T>, { replace: true })
  }

  /**
   * Find a specific document by its id
   * @param idStr ID to filter by
   */
  id(idStr: string) {
    /* DEBUG */ this.col_('Finding document by id `%s`', idStr)
    const doc = this.docs.find(doc => doc.id === idStr)
    /* DEBUG */ this.col_(
      'Document found for id:`%s` %s',
      idStr,
      doc ? 'true' : 'false'
    )
    return doc as DBDocType<T>
  }

  /**
   * Run a set of queries to filter documents
   * @param queries Array of queries to run
   * @param reactive Create and keep a reactive index of the query on the
   *    collection under collection.reactive[queryArr]
   * @category Query
   */
  find(opts: DBCollectionFindOpts = {}): DBDocType<T>[] {
    const { queries = [], reactive = false } = opts
    /* DEBUG */ this.col_('Starting find query')
    let docs: DBDocType<T>[] = []

    /* DEBUG */ this.col_('Emitting event "EventCollectionFind"')
    this.emitEvent({
      event: 'EventCollectionFind',
      opts,
    })

    if (!queries) {
      /* DEBUG */ this.col_('No query specified, using empty array')
      docs = runQuery([], this, this.docs)
    } else if (reactive) {
      createReactiveIndex(this, queries as Query[])
      docs = runQuery(queries as Query[], this, this.docs)
    } else {
      docs = runQuery(queries as Query[], this, this.docs)
    }

    /* DEBUG */ this.col_('Emitting event "EventCollectionFindComplete"')
    this.emitEvent({
      event: 'EventCollectionFindComplete',
      opts,
      docs,
    })

    /* DEBUG */ this.col_('Documents found for query: %d', docs.length)
    return docs
  }

  /**
   * Insert a new document into the array. Defaults will be loaded from the schema
   * @param opts Insert document options
   */
  insertOne(opts: DBCollectionInsertOpts<T>): DBDocType<T> {
    opts = {
      reactiveUpdate: true,
      ...opts,
    }

    /* DEBUG */ this.col_('Emitting event "EventCollectionInsert"')
    this.emitEvent({
      event: 'EventCollectionInsert',
      opts,
    })

    /* DEBUG */ this.col_('Creating new document')

    if (opts.id) {
      /* DEBUG */ this.col_(
        "ID specified, ensuring document with ID %s doesn't already exist",
        opts.id
      )
      const oldDoc = this.id(opts.id)
      if (oldDoc) {
        /* DEBUG */ this.col_(
          'Document with ID %s exists, returning document',
          opts.id
        )
        return oldDoc
      }
      /* DEBUG */ this.col_(
        "Document with ID %s doesn't exist, continuing with document creation",
        opts.id
      )
    }

    const newDoc = new DBDoc<T>(opts.doc, this, opts.id)
    /* DEBUG */ this.col_(
      'Created document with id: %s, pushing to collection',
      newDoc.id
    )

    this.docs.push(newDoc as DBDocType<T>)

    for (const key of this.reactiveIndexed.keys()) {
      /* DEBUG */ this.col_('Updating index')
      if (opts.reactiveUpdate)
        updateReactiveIndex(this as DBCollectionType<T>, key)
    }

    /* DEBUG */ this.col_('Emitting event "EventCollectionInsertComplete"')
    this.emitEvent({
      event: 'EventCollectionInsertComplete',
      doc: newDoc,
      collection: this,
    })

    /* DEBUG */ this.col_('Document: %s, pushed to collection', newDoc.id)
    return newDoc
  }

  /**
   * Alias of insertOne
   * @param opts Insert document options
   */
  insert(opts: DBCollectionInsertOpts<T>) {
    return this.insertOne(opts) as DBDocType<T>
  }

  /**
   * Add any amount of new documents to the collection
   * @param docs New documents to be added
   */
  insertMany(opts: DBCollectionInsertManyOpts<T>) {
    /* DEBUG */ this.col_('Creating %d new documents', opts.doc.length)
    opts.doc.map((doc, i, arr) =>
      this.insertOne({
        doc,
        reactiveUpdate: i === arr.length - 1 && opts.reactiveUpdate === true,
      })
    )
    return this
  }

  /**
   * Emit an event to the attached database
   * @param event Event to emit
   */
  emitEvent(event: MemsDBEvent) {
    this.db.emitEvent(event)
  }

  /**
   * Custom handler for toString to avoid recursion of toString and toJSON
   */
  toString() {
    return `(DBCollection<${this.name}>)`
  }

  /**
   * Custom handler for toJSON to avoid recursion of toString and toJSON
   */
  toJSON() {
    const str = this.toString()

    /* DEBUG */ this.col_('Emitting event "EventCollectionToJSON"')
    const event: MemsDBEvent = {
      event: 'EventCollectionToJSON',
      str,
    }
    this.emitEvent(event)

    return event.str
  }
}
