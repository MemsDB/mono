/// <reference types="debug" />
import { DBDoc } from './DBDoc';
import type { QueryBuilder } from '@memsdb/utils';
import type { CollectionFindOpts, CollectionInsertManyOpts, CollectionInsertOpts } from '@memsdb/types/Collection';
import type { DB } from './DB';
import type { Query } from '@memsdb/types/query';
import type { SchemaTemplateType } from '@memsdb/types';
import type { MemsDBEvent } from '@memsdb/types/events';
/**
 * Class for creating collections of structured documents
 * @category Core
 */
export declare class DBCollection {
    /** Name of the collection */
    readonly name: string;
    /** Schema every document should adhere to */
    readonly schema: {
        [key: string]: any;
    };
    /** Document array */
    docs: DBDoc[];
    /** Debugger variable */
    readonly col_: debug.Debugger;
    /** Reference to the DB object */
    readonly db: DB;
    /** Map for reactive query results */
    reactiveIndexed: Map<Query[] | QueryBuilder, {
        docs: DBDoc[];
    }>;
    /**
     * Create a structured collection of documents
     * @param db Database reference
     * @param schema Schema for content to adhere to
     */
    constructor(db: DB, schema: SchemaTemplateType);
    /**
     * Find a specific document by its id
     * @param idStr ID to filter by
     */
    id(idStr: string): DBDoc | undefined;
    /**
     * Run a set of queries to filter documents
     * @param queries Array of queries to run
     * @param reactive Create and keep a reactive index of the query on the
     *    collection under collection.reactive[queryArr]
     * @category Query
     */
    find(opts?: CollectionFindOpts): DBDoc[];
    /**
     * Insert a new document into the array. Defaults will be loaded from the schema
     * @param opts Insert document options
     */
    insertOne(opts: CollectionInsertOpts): DBDoc;
    /**
     * Alias of insertOne
     * @param opts Insert document options
     */
    insert(opts: CollectionInsertOpts): DBDoc;
    /**
     * Add any amount of new documents to the collection
     * @param docs New documents to be added
     */
    insertMany(opts: CollectionInsertManyOpts): this;
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
