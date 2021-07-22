/// <reference types="debug" />
import type { DBDoc as DBDocType, DBCollection as DBCollectionType, DBDocCustomPopulateOpts, DBDocTreeOpts, MemsDBEvent } from '@memsdb/types';
/**
 * Class for creating structured documents
 * @category Core
 */
export declare class DBDoc<T> implements DBDocType<T> {
    /** Document id */
    id: string;
    isCloned: boolean;
    _createdAt: number;
    _updatedAt: number;
    /** Debugger variable */
    readonly doc_: debug.Debugger;
    /** Reference to the parent collection */
    readonly collection: DBCollectionType<T>;
    /** Reference to indexed data for repeated deep data matching */
    indexed: DBDocType<T>['indexed'];
    /** Object for any plugin related data */
    _pluginData: DBDocType<T>['_pluginData'];
    private dataCache;
    /**
     * Construct a new Document with the collections schema and any provided data
     * @param data Data to be assigned to the document schema
     * @param collection Reference to the parent collection
     */
    constructor(data: {
        [key: string]: any;
    }, collection: DBCollectionType<T>, id?: string, isCloned?: boolean);
    /**
     * Listen to changes on a specific key
     * @param key Key to listen to changes on
     * @param func Function to run when changes occur
     */
    subscribe(key: 'root' | keyof T | string, func: (key: string, data: any) => void): void;
    /**
     * Remove all subscribed functions for a specified key
     * @param key Key to stop listening to
     */
    unsubscribe(key: 'root' | keyof T | string): void;
    private updatePathsCache;
    private updateIndexes;
    /**
     * The data of the document as provided by the storage provider
     */
    get data(): any;
    /**
     * Set the value of a key in the doc to a specified value.
     *
     * **This should only be done on shallow key values**, lest you want keys like
     * 'key1.key2.key3' as object keys in your data
     * @param key Key to set the value of
     * @param data Data to set to the afformentioned key
     * @returns Returns nothing
     */
    set(key: string, data: any): void;
    /**
     * Set the root of the data object.
     *
     * This will completely replace the data object
     * @param data Data to set
     */
    setData(data: any, initial?: boolean): void;
    /**
     * Object with functions for handling plugin data
     */
    pluginData: {
        /**
         * Get the data object from a specific plugin
         * @param plugin Plugin name to get data of
         * @returns Data from the plugin
         */
        get: (plugin: string) => any;
        /**
         * Set/replace the data object for a plugin
         * @param plugin Plugin name to set data to
         * @param data Data to replace the plugin data with
         */
        set: (plugin: string, data: any) => void;
        /**
         * Delete the data object of a specific plugin
         * @param plugin Plugin name to delete data of
         */
        delete: (plugin: string) => void;
    };
    /**
     * Delete this document from the db
     */
    delete(): void;
    /**
     * Populate down a tree of documents based on the provided MemsPL populateQuery
     * @param populateQuery MemsPL population query
     * @param filter Filter unspecified keys from the populated documents
     * @returns Cloned version of this document
     */
    populate(populateQuery: string, filter?: boolean): DBDoc<T>;
    /**
     * Populate the document with another document that matches the query.
     * This will return a copy of the document and not a reference to the
     * original.
     *
     * It's recommended you use the provided
     * populate (`doc.populate(...)`) function instead.
     * @param opts Options for the populate. Things like the target field and query don't have to be set
     */
    customPopulate(opts: DBDocCustomPopulateOpts<T>): DBDoc<T>;
    /**
     * Populate a tree of documents. It's recommended you use the provided
     * populate (`doc.populate(...)`) function instead.
     * @param opts Options for making a tree from the provided document
     * @returns A cloned version of this doc that has the data field formatted into a tree
     */
    tree(opts?: DBDocTreeOpts<T>): DBDoc<T>;
    /**
     * Duplicate this document, making mutations to it not affect the original
     */
    clone(): DBDoc<T>;
    /**
     * Emit an event to the attached database
     * @param event Event to emit
     */
    emitEvent(event: MemsDBEvent): void;
    /**
     * Returns a simplified view
     */
    toJSON(): any;
}
