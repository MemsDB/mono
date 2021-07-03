/// <reference types="debug" />
import type { DBCollection } from './DBCollection';
import type { DocumentCustomPopulateOpts, DocumentTreeOpts } from '@memsdb/types/Document';
import type { MemsDBEvent } from '@memsdb/types/events';
/**
 * Class for creating structured documents
 * @category Core
 */
export declare class DBDoc {
    /** Document id */
    id: string;
    private isCloned;
    _createdAt: number;
    _updatedAt: number;
    /** Debugger variable */
    readonly doc_: debug.Debugger;
    /** Reference to the parent collection */
    readonly collection: DBCollection;
    /** Reference to indexed data for repeated deep data matching */
    indexed: {
        [key: string]: any | any[];
    };
    /** Object for any plugin related data */
    _pluginData: {
        [key: string]: any;
    };
    /**
     * Construct a new Document with the collections schema and any provided data
     * @param data Data to be assigned to the document schema
     * @param collection Reference to the parent collection
     */
    constructor(data: {
        [key: string]: any;
    }, collection: DBCollection, id?: string, isCloned?: boolean);
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
    setData(data: any): void;
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
    populate(populateQuery: string, filter?: boolean): any;
    /**
     * Populate the document with another document that matches the query.
     * This will return a copy of the document and not a reference to the
     * original.
     *
     * It's recommended you use the provided
     * populate (`doc.populate(...)`) function instead.
     * @param opts Options for the populate. Things like the target field and query don't have to be set
     */
    customPopulate(opts: DocumentCustomPopulateOpts): DBDoc;
    /**
     * Populate a tree of documents. It's recommended you use the provided
     * populate (`doc.populate(...)`) function instead.
     * @param opts Options for making a tree from the provided document
     * @returns A cloned version of this doc that has the data field formatted into a tree
     */
    tree(opts?: DocumentTreeOpts): DBDoc;
    /**
     * Duplicate this document, making mutations to it not affect the original
     */
    clone(): DBDoc;
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
