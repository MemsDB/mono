import debug from 'debug';
import type { DBCollection } from './DBCollection';
import type { EventHandler } from './DBEventHandler';
import type { BackupProvider } from '@memsdb/types/backupProvider';
import type { EventHandlersType, MemsDBEvent } from '@memsdb/types/events';
import type { AddCollectionOpts } from '@memsdb/types/DB';
import type { StorageProvider } from '@memsdb/types/storageProvider';
/**
 * Database constructor containing all the initialised collections
 * @category Core
 */
export declare class DB {
    /** Key based object containing all the collections */
    readonly name: string;
    collections: {
        [key: string]: DBCollection;
    };
    /** Debugger variable */
    readonly db_: debug.Debugger;
    options: {
        useDynamicIndexes: boolean;
        backupProvider: BackupProvider;
    };
    /**
     * @ignore
     * List of event handlers
     */
    private eventHandlers;
    readonly storageEngine: StorageProvider;
    /**
     * Construct a new in memory db with the provided collection references
     * @param name Name of database
     * @param opts Options object to modify DB behaviour (mostly unused)
     */
    constructor(name?: string, opts?: {
        /**
         * Automatically generate dynamic indexes - link deeply nested content
         * in a document to the root document to speed up future query results
         */
        useDynamicIndexes?: boolean;
        /**
         * BackupProvider to save and restore documents/collections to and from
         */
        backupProvider?: BackupProvider;
        /**
         * Map of plugins to apply to the database
         */
        eventHandlers?: EventHandlersType;
        /**
         * Storage provider for document data
         */
        storageEngine?: StorageProvider;
    });
    /**
     * Add an EventHandler class to the DB
     * @param eventHandler EventHandler or array of EventHandler classes to add to the DB
     */
    addEventHandler(eventHandler: EventHandler | EventHandler[]): void;
    /**
     * Loop over the EventHandlers and emit the event to the provided function
     * @param event Event to emit
     */
    emitEvent(event: MemsDBEvent): void;
    /**
     * Return a specified collection by name
     * @param name Collection name to select
     */
    c(name: string): DBCollection;
    /**
     * Alias of this.c() - Returns a specified collection
     * @param name Name of collection to retrieve
     */
    collection(name: string): DBCollection;
    /**
     * Add a new collection to the DB. It won't replace a collection unless you specify to
     * @param collection Collection to add to the db
     * @param replace Replace the specified collection if it exists
     */
    addCollection(collection: DBCollection, opts?: AddCollectionOpts): DBCollection;
    /**
     * Delete a collection and all its documents
     * @param name Collection name to delete
     */
    deleteCollection(name: string): this;
    /**
     * Empty out a collection, deleting the documents but leaving the collection
     * structure intact
     * @param name Empty out a specified collection
     */
    emptyCollection(name: string): this;
    /**
     * Backup collection data to the provided BackupProvider.
     */
    backup(): void;
    /**
     * Restore collection documents from a backup using the provided
     * BackupProvider. This won't overwrite any documents
     */
    restore(): void;
}
