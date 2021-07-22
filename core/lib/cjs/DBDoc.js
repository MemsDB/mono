"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DBDoc = void 0;
const uuid_1 = require("uuid");
const smoldash_1 = require("smoldash");
const Indexed_1 = require("./utils/Indexed");
const ReactiveIndex_1 = require("./utils/ReactiveIndex");
const NestedKey_1 = require("./utils/NestedKey");
const Debounce_1 = require("./utils/Debounce");
const Populate_1 = require("./Populate");
/**
 * Class for creating structured documents
 * @category Core
 */
class DBDoc {
    /**
     * Construct a new Document with the collections schema and any provided data
     * @param data Data to be assigned to the document schema
     * @param collection Reference to the parent collection
     */
    constructor(data, collection, id = uuid_1.v4(), isCloned = false) {
        this.isCloned = false;
        this._createdAt = Date.now();
        this._updatedAt = Date.now();
        /** Reference to indexed data for repeated deep data matching */
        this.indexed = new Map();
        /** Object for any plugin related data */
        this._pluginData = new Map();
        this.dataCache = new Map();
        this.updatePathsCache = new Map();
        this.updateIndexes = Debounce_1.debounce((path) => {
            const _ = this.doc_.extend(`updateIndexes`);
            /* DEBUG */ _('Document was modified at path %s', path);
            this._updatedAt = Date.now();
            if (this.indexed.size > 0) {
                /* DEBUG */ _('Indexes in collection, updating each collection index');
                for (const key in this.indexed) {
                    Indexed_1.updateDocIndex(this, key);
                    _('Updated index "%s" for document %s', key, this.id);
                }
                /* DEBUG */ _('Finished updating %d indexes', this.indexed.size);
            }
            if (this.collection.reactiveIndexed.size > 0) {
                /* DEBUG */ _('Updating reactive indexes');
                for (const key of this.collection.reactiveIndexed.keys()) {
                    ReactiveIndex_1.updateReactiveIndex(this.collection, key);
                    /* DEBUG */ _('Updated collection reactive index for key %j', key);
                }
                /* DEBUG */ _('Finished updating %d reactive indexes', this.collection.reactiveIndexed.size);
            }
            /* DEBUG */ _('Emitting event "EventCollectionDocumentUpdated"');
            this.collection.emitEvent({
                event: 'EventCollectionDocumentUpdated',
                doc: this,
                collection: this.collection,
                paths: this.updatePathsCache,
            });
            this.updatePathsCache.clear();
        }, 300);
        /**
         * Object with functions for handling plugin data
         */
        this.pluginData = {
            /**
             * Get the data object from a specific plugin
             * @param plugin Plugin name to get data of
             * @returns Data from the plugin
             */
            get: (plugin) => {
                const _ = this.doc_.extend('pluginData:get');
                const data = this._pluginData.get(plugin);
                /* DEBUG */ _('Data retrieved for plugin `%s`', plugin);
                return data;
            },
            /**
             * Set/replace the data object for a plugin
             * @param plugin Plugin name to set data to
             * @param data Data to replace the plugin data with
             */
            set: (plugin, data) => {
                const _ = this.doc_.extend('pluginData:set');
                this._pluginData.set(plugin, data);
                /* DEBUG */ _('Data set for plugin `%s`', plugin);
            },
            /**
             * Delete the data object of a specific plugin
             * @param plugin Plugin name to delete data of
             */
            delete: (plugin) => {
                const _ = this.doc_.extend('pluginData:delete');
                this._pluginData.delete(plugin);
                /* DEBUG */ _('Deleted plugin data for plugin `%s`', plugin);
            },
        };
        this.collection = collection;
        // Ensure the document has a valid and unique ID
        this.id = id;
        const _ = (this.doc_ = collection.col_.extend(`<doc>${this.id}`));
        this.isCloned = isCloned;
        // Ensure this.data is a replica of the schema before assigning the new data
        this.setData(smoldash_1.merge(smoldash_1.cloneDeep(this.collection.schema), smoldash_1.cloneDeep(data)), true);
        this.pluginData.set('internal:subscriptions', new Map());
        // Assign the data to the new document
        /* DEBUG */ _('Document %s constructed', this.id);
    }
    /**
     * Listen to changes on a specific key
     * @param key Key to listen to changes on
     * @param func Function to run when changes occur
     */
    subscribe(key, func) {
        const subscriptionMap = this.pluginData.get('internal:subscriptions');
        const subscribedKey = subscriptionMap.get(key);
        if (subscribedKey) {
            subscribedKey.push(func);
        }
        else {
            subscriptionMap.set(key, [func]);
        }
    }
    /**
     * Remove all subscribed functions for a specified key
     * @param key Key to stop listening to
     */
    unsubscribe(key) {
        const subscriptionMap = this.pluginData.get('internal:subscriptions');
        subscriptionMap.delete(key);
    }
    /**
     * The data of the document as provided by the storage provider
     */
    get data() {
        const _ = this.doc_.extend('data:get');
        let data;
        const details = {
            _createdAt: this._createdAt,
            _updatedAt: this._updatedAt,
            id: this.id,
        };
        const cached = this.dataCache.get('root');
        if (cached) {
            /* DEBUG */ _('dataCache present, returning cache');
            return { ...cached, ...details };
        }
        if (this.isCloned) {
            /* DEBUG */ _('Document is cloned, retrieving internal cloned data');
            data = this.pluginData.get('internal:cloned');
            /* DEBUG */ _('Retreived internal cloned data');
        }
        else {
            /* DEBUG */ _('Retrieving data from storage engine');
            data = this.collection.db.storageEngine.load(this);
            /* DEBUG */ _('Data retrieved from storage engine');
        }
        /* DEBUG */ _('Setting dataCache');
        this.dataCache.set('root', data);
        /* DEBUG */ _('Initialising dataCache auto-delete countdown');
        setTimeout(() => {
            /* DEBUG */ _('Clearing dataCache');
            this.dataCache.delete('root');
        }, 500);
        /* DEBUG */ _('Returning data');
        return { ...data, ...details };
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
    set(key, data) {
        this.updatePathsCache.set(key, data);
        const _ = this.doc_.extend('data:set');
        const docData = this.data;
        const subscriptionMap = this.pluginData.get('internal:subscriptions');
        const keySubscriptions = subscriptionMap.get(key);
        const rootSubscriptions = subscriptionMap.get('root');
        /* DEBUG */ _('Setting key `%s`');
        docData[key] = data;
        if (this.isCloned) {
            /* DEBUG */ _('Document is a clone, not saving or updating document or indexes');
            this.pluginData.set('internal:cloned', docData);
        }
        else {
            /* DEBUG */ _('Saving document');
            this.collection.db.storageEngine.save(this, docData);
            /* DEBUG */ _('Finished saving document, Updating indexes');
            this.updateIndexes(key);
            /* DEBUG */ _('Finished updating indexes. Applying key and data to  key and root subscriptions');
            if (keySubscriptions)
                keySubscriptions.forEach(func => func(key, data));
            if (rootSubscriptions)
                rootSubscriptions.forEach(func => func(key, data));
            /* DEBUG */ _('Finished running subscriptions');
        }
        this.dataCache.delete('root');
    }
    /**
     * Set the root of the data object.
     *
     * This will completely replace the data object
     * @param data Data to set
     */
    setData(data, initial = false) {
        const _ = this.doc_.extend('data:setData');
        this.updatePathsCache.set('root', data);
        if (this.isCloned) {
            /* DEBUG */ _('Document is a clone, setting internal data instead of to storage engine');
            this.pluginData.set('internal:cloned', data);
            /* DEBUG */ _('Finished setting document plugin data');
        }
        else {
            /* DEBUG */ _('Saving document');
            this.collection.db.storageEngine.save(this, data);
            if (!initial) {
                /* DEBUG */ _('Finished saving document, Updating indexes');
                this.updateIndexes('root');
                /* DEBUG */ _('Finished updating indexes');
                const subscriptionMap = this.pluginData.get('internal:subscriptions');
                const keySubscriptions = subscriptionMap.get('root');
                if (keySubscriptions)
                    keySubscriptions.forEach(func => func('root', data));
            }
        }
        this.dataCache.delete('root');
    }
    /**
     * Delete this document from the db
     */
    delete() {
        const _ = this.doc_.extend('delete');
        try {
            /* DEBUG */ _('Emitting event "EventDocumentDelete"');
            this.emitEvent({
                event: 'EventDocumentDelete',
                doc: this,
            });
            /* DEBUG */ _('Splicing document from collection');
            this.collection.docs.splice(this.collection.docs.findIndex((val) => val === this), 1);
            this.collection.idMap.delete(this.id);
            /* DEBUG */ _('Deleting document data');
            if (this.isCloned) {
                /* DEBUG */ _('Document is cloned, removing plugin data');
                this.pluginData.delete('internal:cloned');
            }
            else {
                /* DEBUG */ _('Deleting document data from storage engine');
                this.collection.db.storageEngine.delete(this);
                /* DEBUG */ _('Deleted document data from storage engine');
            }
            /* DEBUG */ _('Updating reactive indexes');
            for (const key of this.collection.reactiveIndexed.keys()) {
                /* DEBUG */ _('Updating reactive index');
                ReactiveIndex_1.updateReactiveIndex(this.collection, key);
            }
            /* DEBUG */ _('Updated reactive indexes');
            /* DEBUG */ _('Emitting event "EventDocumentDeleteComplete"');
            this.emitEvent({
                event: 'EventDocumentDeleteComplete',
                id: this.id,
                success: true,
            });
        }
        catch (err) {
            /* DEBUG */ _('Failed to delete this document `%s`, %J', err.message, err);
            /* DEBUG */ _('Emitting event "EventDocumentDeleteComplete" with error');
            this.emitEvent({
                event: 'EventDocumentDeleteComplete',
                id: this.id,
                success: false,
                error: err,
            });
        }
    }
    /**
     * Populate down a tree of documents based on the provided MemsPL populateQuery
     * @param populateQuery MemsPL population query
     * @param filter Filter unspecified keys from the populated documents
     * @returns Cloned version of this document
     */
    populate(populateQuery, filter = false) {
        const _ = this.doc_.extend('populate');
        /* DEBUG */ _('Running populate on document');
        const [populated] = Populate_1.populate(this.collection, [this], populateQuery, filter);
        /* DEBUG */ _('Finished populating document');
        return populated;
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
    customPopulate(opts) {
        // Debugger variable
        const _ = this.doc_.extend('customPopulate');
        // Construct a new document based on the original so as to not perform a mutation
        /* DEBUG */ _('Creating identical document so as to avoid mutations');
        const resultDoc = this.clone();
        /* DEBUG */ this.doc_('Emitting event "EventDocumentCustomPopulate"');
        this.emitEvent({
            event: 'EventDocumentCustomPopulate',
            doc: resultDoc,
            opts,
        });
        // Destructure out variables
        const { srcField, targetField = 'id', targetCol, query = [
            {
                key: targetField,
                operation: '===',
                comparison: srcField === 'id' ? this.id : this.data[srcField],
                inverse: false,
            },
        ], destinationField = 'children', unwind = false, } = opts;
        /* DEBUG */ _('Populating document `%s` field with results from `%s.%s`', destinationField, targetCol, targetField);
        /* DEBUG */ _('Finding child documents');
        const queriedDocuments = targetCol.find({ queries: query });
        // Set a specific field to the results of the query, unwinding if necessary
        /* DEBUG */ _('Setting field on document to contain children. Unwind: %s', unwind ? 'true' : 'false');
        resultDoc.set(destinationField, unwind && queriedDocuments.length < 2
            ? queriedDocuments[0]
            : queriedDocuments);
        /* DEBUG */ this.doc_('Emitting event "EventDocumentCustomPopulateComplete"');
        this.emitEvent({
            event: 'EventDocumentCustomPopulateComplete',
            doc: resultDoc,
            opts,
        });
        // Return the copied document and not the original
        /* DEBUG */ _('Finished populating field, returning ghost document');
        return resultDoc;
    }
    /**
     * Populate a tree of documents. It's recommended you use the provided
     * populate (`doc.populate(...)`) function instead.
     * @param opts Options for making a tree from the provided document
     * @returns A cloned version of this doc that has the data field formatted into a tree
     */
    tree(opts = {}) {
        opts = {
            populations: [],
            maxDepth: 0,
            currentDepth: 1,
            ...opts,
        };
        // Debugger variable
        const _ = this.doc_.extend('tree');
        const doc = this.clone();
        /* DEBUG */ this.doc_('Emitting event "EventDocumentTree"');
        this.emitEvent({
            event: 'EventDocumentTree',
            doc,
            opts,
        });
        if (!opts)
            return doc;
        /* DEBUG */ _('Number of populations: %d', opts.populations?.length);
        // Map over populations array to run individual populations
        opts.populations?.map((q, i) => {
            if (this.collection.name === q.collection.name) {
                /* DEBUG */ _('Running population number %d', i);
                const children = q.collection.find({
                    queries: [
                        {
                            key: q.targetField,
                            operation: '===',
                            comparison: q.srcField === 'id'
                                ? this.id
                                : NestedKey_1.nestedKey(this.data, q.srcField),
                            inverse: false,
                        },
                    ],
                });
                if (opts.maxDepth && opts.currentDepth <= opts.maxDepth)
                    doc.set(q.destinationField, children.map(child => child.tree({
                        ...opts,
                        currentDepth: opts.currentDepth + 1,
                    })));
            }
        });
        /* DEBUG */ _('Emitting event "EventDocumentTreeComplete"');
        this.emitEvent({
            event: 'EventDocumentTreeComplete',
            doc,
            opts,
        });
        /* DEBUG */ _('Finished running %d populations, returning result', opts.populations?.length);
        return doc;
    }
    /**
     * Duplicate this document, making mutations to it not affect the original
     */
    clone() {
        /* DEBUG */ this.doc_('Emitting event "EventDocumentClone"');
        this.emitEvent({
            event: 'EventDocumentClone',
            doc: this,
        });
        const cloned = new DBDoc({}, this.collection, this.id, true);
        cloned.setData(smoldash_1.cloneDeep(this.data));
        cloned._createdAt = this._createdAt;
        cloned._updatedAt = this._updatedAt;
        /* DEBUG */ this.doc_('Emitting event "EventDocumentClone"');
        this.emitEvent({
            event: 'EventDocumentCloneComplete',
            doc: cloned,
        });
        return cloned;
    }
    /**
     * Emit an event to the attached database
     * @param event Event to emit
     */
    emitEvent(event) {
        this.collection.emitEvent(event);
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
        };
    }
}
exports.DBDoc = DBDoc;
//# sourceMappingURL=DBDoc.js.map