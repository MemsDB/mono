import type { DBDoc as DBDocType, DBCollection as DBCollectionType, Query as QueryType, QueryBuilder as QueryBuilderType } from '@memsdb/types';
/**
 * Set a reactive query on a collection (should be run from the collection, not directly)
 * @ignore
 * @param collection Collection to update reactive index on
 * @param query Queries to run
 */
export declare const updateReactiveIndex: <T>(collection: DBCollectionType<T>, query: QueryType[] | QueryBuilderType) => void;
/**
 * Create a new reactive index from a query array (should be run from the collection, not directly)
 * @ignore
 * @param collection Collection to create reactive index on
 * @param query Query array to perform
 */
export declare const createReactiveIndex: <T>(collection: DBCollectionType<T>, query: QueryType[] | QueryBuilderType) => {
    docs: DBDocType<any>[];
};
