/// <reference types="debug" />
import type { DB as DBType, DBCollection as DBCollectionType, DBCollectionFindOpts, DBCollectionInsertOpts, DBDoc as DBDocType, DBCollectionInsertManyOpts, MemsDBEvent, Query, QueryBuilder } from '@memsdb/types';
/**
 * Class for creating collections of structured documents
 * @category Core
 */
export declare class DBCollection<T extends {
    [key: string]: any;
}> implements DBCollectionType<T> {
    /** Name of the collection */
    readonly name: string;
    /** Schema every document should adhere to */
    readonly schema: T;
    /** Document array */
    docs: DBDocType<T>[];
    /** Debugger variable */
    readonly col_: debug.Debugger;
    /** Reference to the DB object */
    readonly db: DBType;
    /** Map for reactive query results */
    reactiveIndexed: Map<Query[] | QueryBuilder, {
        docs: DBDocType<T>[];
    }>;
    /**
     * Create a structured collection of documents
     * @param db Database reference
     * @param schema Schema for content to adhere to
     */
    constructor(db: DBType, schema: {
        name: string;
        structure: T;
    });
    /**
     * Find a specific document by its id
     * @param idStr ID to filter by
     */
    id(idStr: string): DBDocType<T>;
    /**
     * Run a set of queries to filter documents
     * @param queries Array of queries to run
     * @param reactive Create and keep a reactive index of the query on the
     *    collection under collection.reactive[queryArr]
     * @category Query
     */
    find(opts?: DBCollectionFindOpts): DBDocType<T>[];
    /**
     * Insert a new document into the array. Defaults will be loaded from the schema
     * @param opts Insert document options
     */
    insertOne(opts: DBCollectionInsertOpts<T>): DBDocType<T>;
    /**
     * Alias of insertOne
     * @param opts Insert document options
     */
    insert(opts: DBCollectionInsertOpts<T>): DBDocType<T>;
    /**
     * Add any amount of new documents to the collection
     * @param docs New documents to be added
     */
    insertMany(opts: DBCollectionInsertManyOpts<T>): this;
    /**
     * Emit an event to the attached database
     * @param event Event to emit
     */
    emitEvent(event: MemsDBEvent): void;
    /**
     * Custom handler for toString to avoid recursion of toString and toJSON
     */
    toString(): string;
    /**
     * Custom handler for toJSON to avoid recursion of toString and toJSON
     */
    toJSON(): string;
}
