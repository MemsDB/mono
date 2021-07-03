import { v4 } from 'uuid';
import debug from 'debug';
import { VoidBackup } from '@memsdb/backup-void';
import { MemoryStorage } from '@memsdb/storage-memory';
const memsdb_ = debug('memsdb');
/**
 * Database constructor containing all the initialised collections
 * @category Core
 */
export class DB {
    /**
     * Construct a new in memory db with the provided collection references
     * @param name Name of database
     * @param opts Options object to modify DB behaviour (mostly unused)
     */
    constructor(name = v4(), opts = {}) {
        /** Key based object containing all the collections */
        this.name = 'memsdb';
        this.collections = {};
        /**
         * @ignore
         * List of event handlers
         */
        this.eventHandlers = {};
        this.name = name;
        this.db_ = memsdb_.extend(`<db>${name}`);
        const { useDynamicIndexes = false, backupProvider = new VoidBackup(), eventHandlers, storageEngine = new MemoryStorage() } = opts;
        this.options = {
            useDynamicIndexes,
            backupProvider
        };
        this.storageEngine = storageEngine;
        if (eventHandlers) {
            const eventTypes = Object.keys(eventHandlers);
            const addEventHandler = (type, handler) => {
                if (this.eventHandlers[type]) {
                    this.eventHandlers[type].push(handler);
                }
                else
                    this.eventHandlers[type] = [handler];
            };
            eventTypes.forEach((handlerType) => {
                if (eventHandlers) {
                    const handlers = eventHandlers[handlerType];
                    if (!handlers)
                        return;
                    if (Array.isArray(handlers))
                        handlers.forEach((handler) => addEventHandler(handlerType, handler));
                    else
                        addEventHandler(handlerType, handlers);
                }
            });
        }
    }
    /**
     * Add an EventHandler class to the DB
     * @param eventHandler EventHandler or array of EventHandler classes to add to the DB
     */
    addEventHandler(eventHandler) {
        const addHandler = (handler) => {
            if (!this.eventHandlers[handler.eventType]) {
                this.eventHandlers[handler.eventType].push(handler.func);
            }
            else
                this.eventHandlers[handler.eventType] = [handler.func];
        };
        if (Array.isArray(eventHandler)) {
            eventHandler.forEach(addHandler);
        }
        else {
            addHandler(eventHandler);
            this.emitEvent({
                event: 'EventDBHandlerAdded',
                db: this,
                handler: eventHandler
            });
        }
    }
    /**
     * Loop over the EventHandlers and emit the event to the provided function
     * @param event Event to emit
     */
    emitEvent(event) {
        if (this.eventHandlers[event.event]) {
            this.eventHandlers[event.event].forEach((handler) => handler(event));
        }
    }
    /**
     * Return a specified collection by name
     * @param name Collection name to select
     */
    c(name) {
        /* DEBUG */ this.db_('Finding and returning collection with name/key of `%s`', name);
        return this.collections[name];
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
        /* DEBUG */ this.db_('Adding collection `%s` to DB. Replace if it already exists:', collection.name, opts.replace ? 'true' : 'false');
        /* DEBUG */ this.db_('Emitting event "EventDBAddCollection"');
        this.emitEvent({
            event: 'EventDBAddCollection',
            collection,
            opts,
        });
        if (!this.collections[collection.name] || opts.replace)
            this.collections[collection.name] = collection;
        return collection;
    }
    /**
     * Delete a collection and all its documents
     * @param name Collection name to delete
     */
    deleteCollection(name) {
        let success = true;
        let error;
        try {
            /* DEBUG */ this.db_('Removing collection `%s` from DB', name);
            /* DEBUG */ this.db_('Emitting event "EventDBAddCollection"');
            this.emitEvent({
                event: 'EventDBDeleteCollection',
                collection: this.collections[name],
            });
            this.collections[name].docs.forEach((doc) => doc.delete());
            delete this.collections[name];
            /* DEBUG */ this.db_('Emitting event "EventDBDeleteCollectionComplete"');
            this.emitEvent({
                event: 'EventDBDeleteCollectionComplete',
                name,
                success: true,
            });
        }
        catch (err) {
            /* DEBUG */ this.db_("Collection deletion failed successfully, collection `%s` doesn't exist", name);
            /* DEBUG */ this.db_('Emitting event "EventDBDeleteCollectionComplete" with error');
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
        try {
            /* DEBUG */ this.db_('Emptying collection `%s`. Current document count: %d', name, this.collections[name].docs.length);
            /* DEBUG */ this.db_('Emitting event "EventDBEmptyCollection"');
            this.emitEvent({
                event: 'EventDBEmptyCollection',
                collection: this.collections[name],
            });
            this.collections[name].docs.forEach((doc) => doc.delete());
            this.collections[name].docs.length = 0;
            /* DEBUG */ this.db_('Emptying collection `%s` completed. Current document count: %d', name, this.collections[name].docs.length);
            /* DEBUG */ this.db_('Emitting event "EventDBEmptyCollection"');
            this.emitEvent({
                event: 'EventDBEmptyCollectionComplete',
                collection: this.collections[name],
                success: true,
            });
        }
        catch (err) {
            /* DEBUG */ this.db_('Emptying collection `%s` failed as it does not exist.', name);
            /* DEBUG */ this.db_('Emitting event "EventDBEmptyCollection" with error');
            this.emitEvent({
                event: 'EventDBEmptyCollectionComplete',
                collection: this.collections[name],
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
        /* DEBUG */ this.db_('Starting backup');
        const backup = {};
        const collections = Object.keys(this.collections);
        /* DEBUG */ this.db_('Serialising collections');
        collections.forEach((col) => {
            const collection = this.collections[col];
            const keys = Object.keys(collection.schema);
            const values = collection.docs.map((doc) => [
                doc.id,
                ...keys.map((key) => doc.data[key]),
            ]);
            keys.unshift('id');
            backup[col] = {
                keys,
                values,
            };
        });
        /* DEBUG */ this.db_('Data structure created for backup');
        /* DEBUG */ this.db_('Emitting event "EventDBBackup"');
        this.emitEvent({
            event: 'EventDBBackup',
            backup,
        });
        /* DEBUG */ this.db_('Backing up database to BackupProvider');
        const backedUp = this.options.backupProvider.save(backup);
        /* DEBUG */ this.db_('Backed up to BackupProvider, status: %s', backedUp ? 'success' : 'failed');
        /* DEBUG */ this.db_('Emitting event "EventDBBackupComplete"');
        this.emitEvent({
            event: 'EventDBBackupComplete',
            backup,
            status: backedUp ? 'success' : 'failed',
        });
        /* DEBUG */ this.db_('Backup finished, result: %s', backedUp ? 'Data backed up' : 'Data NOT backed up');
    }
    /**
     * Restore collection documents from a backup using the provided
     * BackupProvider. This won't overwrite any documents
     */
    restore() {
        /* DEBUG */ this.db_('Restoring database collections from BackupProvider');
        const backup = this.options.backupProvider.load();
        /* DEBUG */ this.db_('Emitting event "EventDBRestore"');
        this.emitEvent({
            event: 'EventDBRestore',
            backup,
        });
        /* DEBUG */ this.db_('Collection data loaded from BackupProvider');
        const collectionKeys = Object.keys(backup);
        /* DEBUG */ this.db_('%d collections to restore', collectionKeys.length);
        collectionKeys.forEach((colKey) => {
            const col = this.collections[colKey];
            if (!col)
                return;
            const data = backup[colKey];
            data.values.forEach((docData) => {
                const doc = {};
                data.keys.forEach((key, i) => {
                    // Skip the ID
                    if (i === 0)
                        return;
                    doc[key] = docData[i];
                });
                col.insertOne({
                    doc,
                    id: docData[0],
                });
            });
        });
        /* DEBUG */ this.db_('Emitting event "EventDBRestoreComplete"');
        this.emitEvent({
            event: 'EventDBRestoreComplete',
            backup,
        });
        /* DEBUG */ this.db_('Database restored');
    }
}
//# sourceMappingURL=DB.js.map