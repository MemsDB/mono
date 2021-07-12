import { runQuery } from '../Query';
/**
 * Set a reactive query on a collection (should be run from the collection, not directly)
 * @ignore
 * @param collection Collection to update reactive index on
 * @param query Queries to run
 */
export const updateReactiveIndex = (collection, query) => {
    const ref = collection.reactiveIndexed.get(query);
    ref.docs = runQuery(query, collection, collection.docs);
};
/**
 * Create a new reactive index from a query array (should be run from the collection, not directly)
 * @ignore
 * @param collection Collection to create reactive index on
 * @param query Query array to perform
 */
export const createReactiveIndex = (collection, query) => {
    if (!collection.reactiveIndexed.has(query)) {
        const docs = runQuery(query, collection, collection.docs);
        collection.reactiveIndexed.set(query, { docs });
        return { docs };
    }
    return collection.reactiveIndexed.get(query);
};
//# sourceMappingURL=ReactiveIndex.js.map