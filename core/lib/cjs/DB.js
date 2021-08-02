"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DB = void 0;
const uuid_1 = require("uuid");
const debug_1 = __importDefault(require("debug"));
const backup_void_1 = require("@memsdb/backup-void");
const storage_memory_1 = require("@memsdb/storage-memory");
const memsdb_ = debug_1.default('memsdb');
/**
 * Database constructor containing all the initialised collections
 * @category Core
 */
class DB {
    /**
     * Construct a new in memory db with the provided collection references
     * @param name Name of database
     * @param opts Options object to modify DB behaviour (mostly unused)
     */
    constructor(name = uuid_1.v4(), opts = {}) {
        /** Key based object containing all the collections */
        this.name = 'memsdb';
        this.collections = new Map();
        /**
         * @ignore
         * List of event handlers
         */
        this.eventHandlers = new Map();
        this.queryHandlers = new Map();
        this.name = name;
        const _ = this.db_ = memsdb_.extend(`<db>${name}`);
        const { useDynamicIndexes = false, backupProvider = new backup_void_1.VoidBackup(), eventHandlers, storageEngine = new storage_memory_1.MemoryStorage(), } = opts;
        this.options = {
            useDynamicIndexes,
            backupProvider,
        };
        this.storageEngine = storageEngine;
        if (eventHandlers) {
            /* DEBUG */ _('Adding event handlers');
            const eventTypes = Object.keys(eventHandlers);
            const addEventHandler = (type, handler) => {
                const evHandler = this.eventHandlers.get(type);
                if (evHandler) {
                    evHandler.push(handler);
                }
                else
                    this.eventHandlers.set(type, [handler]);
            };
            eventTypes.forEach(handlerType => {
                if (eventHandlers) {
                    const handlers = eventHandlers[handlerType];
                    if (!handlers)
                        return;
                    if (Array.isArray(handlers))
                        handlers.forEach(handler => addEventHandler(handlerType, handler));
                    else
                        addEventHandler(handlerType, handlers);
                }
            });
        }
    }
    /**
     * Add custom query handlers to allow for custom filtering
     * @param queryHandler QueryHandler or QueryHandler array to add to the map.
     */
    addQueryHandler(queryHandler) {
        if (Array.isArray(queryHandler))
            queryHandler.forEach(this.addQueryHandler);
        else
            this.queryHandlers.set(queryHandler.operator, queryHandler.func);
    }
    /**
     * Add an EventHandler class to the DB
     * @param eventHandler EventHandler or array of EventHandler classes to add to the DB
     */
    addEventHandler(eventHandler) {
        const addHandler = (handler) => {
            const handlerType = handler.eventType;
            const evHandlers = this.eventHandlers.get(handlerType);
            if (evHandlers) {
                evHandlers.push(handler.func);
            }
            else
                this.eventHandlers.set(handlerType, [handler.func]);
        };
        if (Array.isArray(eventHandler)) {
            eventHandler.forEach(addHandler);
        }
        else {
            addHandler(eventHandler);
            this.emitEvent({
                event: 'EventDBHandlerAdded',
                db: this,
                handler: eventHandler,
            });
        }
    }
    /**
     * Loop over the EventHandlers and emit the event to the provided function
     * @param event Event to emit
     */
    emitEvent(event) {
        const evHandlers = this.eventHandlers.get(event.event);
        if (evHandlers) {
            evHandlers.forEach(handler => handler(event));
        }
    }
    /**
     * Return a specified collection by name
     * @param name Collection name to select
     */
    c(name) {
        /* DEBUG */ this.db_('Finding and returning collection with name/key of `%s`', name);
        return this.collections.get(name);
    }
    /**
     * Alias of this.c() - Returns a specified collection
     * @param name Name of collection to retrieve
     */
    collection(name) {
        return this.c(name);
    }
    /**
     * Add a new collection to the DB. It won't replace a collection unless you specify to
     * @param collection Collection to add to the db
     * @param replace Replace the specified collection if it exists
     */
    addCollection(collection, opts = { replace: false }) {
        const _ = this.db_.extend('addCollection');
        /* DEBUG */ _('Adding collection `%s` to DB. Replace if it already exists:', collection.name, opts.replace ? 'true' : 'false');
        /* DEBUG */ _('Emitting event "EventDBAddCollection"');
        this.emitEvent({
            event: 'EventDBAddCollection',
            collection,
            opts,
        });
        const hasCollection = this.collections.has(collection.name);
        if (!hasCollection || opts.replace) {
            /* DEBUG */ _('Replacing or setting collection');
            this.collections.set(collection.name, collection);
        }
        return collection;
    }
    /**
     * Delete a collection and all its documents
     * @param name Collection name to delete
     */
    deleteCollection(name) {
        const _ = this.db_.extend('deleteCollection');
        try {
            /* DEBUG */ _('Removing collection `%s` from DB', name);
            const collection = this.collections.get(name);
            if (!collection)
                return this;
            /* DEBUG */ _('Emitting event "EventDBAddCollection"');
            this.emitEvent({
                event: 'EventDBDeleteCollection',
                collection: collection,
            });
            collection.docs.forEach(doc => doc.delete());
            this.collections.delete(name);
            /* DEBUG */ _('Emitting event "EventDBDeleteCollectionComplete"');
            this.emitEvent({
                event: 'EventDBDeleteCollectionComplete',
                name,
                success: true,
            });
        }
        catch (err) {
            /* DEBUG */ _("Collection deletion failed successfully, collection `%s` doesn't exist", name);
            /* DEBUG */ _('Emitting event "EventDBDeleteCollectionComplete" with error');
            this.emitEvent({
                event: 'EventDBDeleteCollectionComplete',
                name,
                success: false,
                error: err,
            });
        }
        finally {
            return this;
        }
    }
    /**
     * Empty out a collection, deleting the documents but leaving the collection
     * structure intact
     * @param name Empty out a specified collection
     */
    emptyCollection(name) {
        const _ = this.db_.extend('emptyCollection');
        const collection = this.collection(name);
        if (!collection)
            return this;
        try {
            /* DEBUG */ _('Emptying collection `%s`. Current document count: %d', name, collection.docs.length);
            /* DEBUG */ _('Emitting event "EventDBEmptyCollection"');
            this.emitEvent({
                event: 'EventDBEmptyCollection',
                collection: collection,
            });
            collection.docs.forEach(doc => doc.delete());
            collection.docs.length = 0;
            /* DEBUG */ _('Emptying collection `%s` completed. Current document count: %d', name, collection.docs.length);
            /* DEBUG */ _('Emitting event "EventDBEmptyCollection"');
            this.emitEvent({
                event: 'EventDBEmptyCollectionComplete',
                collection: collection,
                success: true,
            });
        }
        catch (err) {
            /* DEBUG */ _('Emptying collection `%s` failed as it does not exist.', name);
            /* DEBUG */ _('Emitting event "EventDBEmptyCollection" with error');
            this.emitEvent({
                event: 'EventDBEmptyCollectionComplete',
                collection,
                success: false,
                error: err,
            });
        }
        finally {
            return this;
        }
    }
    /**
     * Backup collection data to the provided BackupProvider.
     */
    backup() {
        const _ = this.db_.extend('backup');
        /* DEBUG */ _('Starting backup');
        const backup = {};
        /* DEBUG */ _('Serialising collections');
        this.collections.forEach((collection, key) => {
            const keys = Object.keys(collection.schema);
            const values = collection.docs.map(doc => [
                doc.id,
                doc._createdAt,
                doc._updatedAt,
                ...keys.map(key => doc.data[key]),
            ]);
            keys.unshift('id', '_createdAt', '_updatedAt');
            backup[key] = {
                keys,
                values,
            };
        });
        /* DEBUG */ _('Data structure created for backup');
        /* DEBUG */ _('Emitting event "EventDBBackup"');
        this.emitEvent({
            event: 'EventDBBackup',
            backup,
        });
        /* DEBUG */ _('Backing up database to BackupProvider');
        const backedUp = this.options.backupProvider.save(backup);
        /* DEBUG */ _('Backed up to BackupProvider, status: %s', backedUp ? 'success' : 'failed');
        /* DEBUG */ _('Emitting event "EventDBBackupComplete"');
        this.emitEvent({
            event: 'EventDBBackupComplete',
            backup,
            status: backedUp ? 'success' : 'failed',
        });
        /* DEBUG */ _('Backup finished, result: %s', backedUp ? 'Data backed up' : 'Data NOT backed up');
    }
    /**
     * Restore collection documents from a backup using the provided
     * BackupProvider. This won't overwrite any documents
     */
    restore() {
        const _ = this.db_.extend('restore');
        /* DEBUG */ _('Restoring database collections from BackupProvider');
        const backup = this.options.backupProvider.load();
        /* DEBUG */ _('Emitting event "EventDBRestore"');
        this.emitEvent({
            event: 'EventDBRestore',
            backup,
        });
        /* DEBUG */ _('Collection data loaded from BackupProvider');
        const collectionKeys = Object.keys(backup);
        /* DEBUG */ _('%d collections to restore', collectionKeys.length);
        collectionKeys.forEach(colKey => {
            const col = this.collection(colKey);
            if (!col)
                return;
            const data = backup[colKey];
            data.values.forEach(docData => {
                const doc = {};
                data.keys.forEach((key, i) => {
                    // Skip the ID, _createdAt, and _updatedAt
                    if (i < 3)
                        return;
                    doc[key] = docData[i];
                });
                const newDoc = col.insert({
                    doc,
                    id: docData[0],
                });
                newDoc._createdAt = docData[1];
                newDoc._createdAt = docData[2];
            });
        });
        /* DEBUG */ _('Emitting event "EventDBRestoreComplete"');
        this.emitEvent({
            event: 'EventDBRestoreComplete',
            backup,
        });
        /* DEBUG */ _('Database restored');
    }
}
exports.DB = DB;
//# sourceMappingURL=DB.js.map