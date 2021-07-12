"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReactiveIndex = exports.updateReactiveIndex = void 0;
const Query_1 = require("../Query");
/**
 * Set a reactive query on a collection (should be run from the collection, not directly)
 * @ignore
 * @param collection Collection to update reactive index on
 * @param query Queries to run
 */
const updateReactiveIndex = (collection, query) => {
    const ref = collection.reactiveIndexed.get(query);
    ref.docs = Query_1.runQuery(query, collection, collection.docs);
};
exports.updateReactiveIndex = updateReactiveIndex;
/**
 * Create a new reactive index from a query array (should be run from the collection, not directly)
 * @ignore
 * @param collection Collection to create reactive index on
 * @param query Query array to perform
 */
const createReactiveIndex = (collection, query) => {
    if (!collection.reactiveIndexed.has(query)) {
        const docs = Query_1.runQuery(query, collection, collection.docs);
        collection.reactiveIndexed.set(query, { docs });
        return { docs };
    }
    return collection.reactiveIndexed.get(query);
};
exports.createReactiveIndex = createReactiveIndex;
//# sourceMappingURL=ReactiveIndex.js.map