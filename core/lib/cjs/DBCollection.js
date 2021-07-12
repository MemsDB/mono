"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DBCollection = void 0;
const Query_1 = require("./Query");
const ReactiveIndex_1 = require("./utils/ReactiveIndex");
const DBDoc_1 = require("./DBDoc");
/**
 * Class for creating collections of structured documents
 * @category Core
 */
class DBCollection {
    /**
     * Create a structured collection of documents
     * @param db Database reference
     * @param schema Schema for content to adhere to
     */
    constructor(db, schema) {
        /** Map for reactive query results */
        this.reactiveIndexed = new Map();
        this.idMap = new Map();
        this.schema = schema.structure;
        this.docs = [];
        this.name = schema.name;
        this.col_ = db.db_.extend(`<col>${schema.name}`);
        this.db = db;
        this.db.addCollection(this, { replace: true });
    }
    /**
     * Find a specific document by its id
     * @param idStr ID to filter by
     */
    id(idStr) {
        /* DEBUG */ this.col_('Finding document by id `%s`', idStr);
        const doc = this.idMap.get(idStr);
        /* DEBUG */ this.col_('Document found for id:`%s` %s', idStr, doc ? 'true' : 'false');
        return doc;
    }
    /**
     * Run a set of queries to filter documents
     * @param queries Array of queries to run
     * @param reactive Create and keep a reactive index of the query on the
     *    collection under collection.reactive[queryArr]
     * @category Query
     */
    find(opts = {}) {
        const _ = this.col_.extend('find');
        const { queries = [], reactive = false } = opts;
        /* DEBUG */ _('Starting find query');
        let docs = [];
        /* DEBUG */ _('Emitting event "EventCollectionFind"');
        this.emitEvent({
            event: 'EventCollectionFind',
            opts,
        });
        if (!queries) {
            /* DEBUG */ _('No query specified, using empty array');
            docs = Query_1.runQuery([], this, this.docs);
        }
        else if (reactive) {
            /* DEBUG */ _('Query is reactive, creating reactive indexes');
            const { docs: docsResutls } = ReactiveIndex_1.createReactiveIndex(this, queries);
            this.reactiveIndexed.get(queries);
            /* DEBUG */ _('Finished creating reactive indexes, setting docs to reactive query result');
            docs = docsResutls;
        }
        else {
            /* DEBUG */ _('Query is NOT reactive, running query');
            docs = Query_1.runQuery(queries, this, this.docs);
            /* DEBUG */ _('Finished running query');
        }
        /* DEBUG */ _('Emitting event "EventCollectionFindComplete"');
        this.emitEvent({
            event: 'EventCollectionFindComplete',
            opts,
            docs,
        });
        /* DEBUG */ _('Documents found for query: %d', docs.length);
        return docs;
    }
    /**
     * Insert a new document into the array. Defaults will be loaded from the schema
     * @param opts Insert document options
     */
    insertOne(opts) {
        const _ = this.col_.extend('insertOne');
        opts = {
            reactiveUpdate: true,
            ...opts,
        };
        /* DEBUG */ _('Emitting event "EventCollectionInsert"');
        this.emitEvent({
            event: 'EventCollectionInsert',
            opts,
        });
        /* DEBUG */ _('Creating new document');
        if (opts.id) {
            /* DEBUG */ _("ID specified, ensuring document with ID %s doesn't already exist", opts.id);
            const oldDoc = this.id(opts.id);
            if (oldDoc) {
                /* DEBUG */ _('Document with ID %s exists, returning document', opts.id);
                return oldDoc;
            }
            /* DEBUG */ _("Document with ID %s doesn't exist, continuing with document creation", opts.id);
        }
        const newDoc = new DBDoc_1.DBDoc(opts.doc, this, opts.id);
        /* DEBUG */ _('Created document with id: %s, pushing to collection', newDoc.id);
        this.docs.push(newDoc);
        this.idMap.set(newDoc.id, newDoc);
        for (const key of this.reactiveIndexed.keys()) {
            /* DEBUG */ _('Updating index');
            if (opts.reactiveUpdate)
                ReactiveIndex_1.updateReactiveIndex(this, key);
        }
        /* DEBUG */ _('Emitting event "EventCollectionInsertComplete"');
        this.emitEvent({
            event: 'EventCollectionInsertComplete',
            doc: newDoc,
            collection: this,
        });
        /* DEBUG */ _('Document: %s, pushed to collection', newDoc.id);
        return newDoc;
    }
    /**
     * Alias of insertOne
     * @param opts Insert document options
     */
    insert(opts) {
        const _ = this.col_.extend('insert');
        /* DEBUG */ _('Inserting one decoument');
        return this.insertOne(opts);
    }
    /**
     * Add any amount of new documents to the collection
     * @param docs New documents to be added
     */
    insertMany(opts) {
        const _ = this.col_.extend('insertMany');
        /* DEBUG */ _('Creating %d new documents', opts.doc.length);
        opts.doc.map((doc, i, arr) => this.insertOne({
            doc,
            reactiveUpdate: i === arr.length - 1 && opts.reactiveUpdate === true,
        }));
        /* DEBUG */ _('Finished inserting documents');
        return this;
    }
    /**
     * Emit an event to the attached database
     * @param event Event to emit
     */
    emitEvent(event) {
        this.db.emitEvent(event);
    }
    /**
     * Custom handler for toString to avoid recursion of toString and toJSON
     */
    toString() {
        return `(DBCollection<${this.name}>)`;
    }
    /**
     * Custom handler for toJSON to avoid recursion of toString and toJSON
     */
    toJSON() {
        const str = this.toString();
        /* DEBUG */ this.col_('Emitting event "EventCollectionToJSON"');
        const event = {
            event: 'EventCollectionToJSON',
            str,
        };
        this.emitEvent(event);
        return event.str;
    }
}
exports.DBCollection = DBCollection;
//# sourceMappingURL=DBCollection.js.map