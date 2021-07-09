import { nestedKey } from './NestedKey';
/**
 * Update an index on a document to increase search speeds for nested keys and arrays
 * @param doc Document to update index on
 * @param key Query key to update index on
 * @ignore
 */
export const updateDocIndex = (doc, key = '') => {
    if (doc.collection.db.options.useDynamicIndexes) {
        const nestedKeyValue = nestedKey(doc.data, key);
        doc.indexed.set(key, nestedKeyValue);
        return nestedKeyValue;
    }
    else
        return nestedKey(doc.data, key);
};
/**
 * Get/Create an index on the document and/or collection (if reactive) based
 * on the provided query
 * @param param0 Index options
 * @ignore
 */
export const getOrCreateIndex = ({ doc, query, }) => {
    const { key, reactiveQuery } = query;
    if (query.key === 'id')
        return doc.id;
    if (query.key === '_updatedAt')
        return doc._updatedAt;
    if (query.key === '_createdAt')
        return doc._createdAt;
    const normalize = (val) => {
        switch (query.comparison) {
            case '':
                if (val === undefined)
                    return '';
            case undefined:
                if (val === undefined)
                    return undefined;
            default:
                return val;
        }
    };
    // Ensure a reactive index is actually needed
    if (doc.collection.db.options.useDynamicIndexes || reactiveQuery) {
        // Handle whether the key includes an array
        if (key.includes('[]')) {
            // If the key exists in the index list, return that array instead of
            // getting the original which may be however many levels down
            const indexed = doc.indexed.get(key);
            if (indexed)
                return indexed;
            // If it doesn't exist, use the updateDocIndex function to create it and
            // return the results
            else
                return updateDocIndex(doc, key);
        }
        // If not, just return the normal key
        else
            return normalize(nestedKey(doc.data, key));
    }
    // Otherwise just return the nested key
    else
        return normalize(nestedKey(doc.data, key));
};
//# sourceMappingURL=Indexed.js.map