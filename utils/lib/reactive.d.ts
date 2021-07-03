import { QueryBuilder } from './query';
import type { DBDoc, DBCollection } from '@memsdb/core';
import type { Query } from '@memsdb/types/query';
/**
 * Set a reactive query on a collection (should be run from the collection, not directly)
 * @ignore
 * @param collection Collection to update reactive index on
 * @param query Queries to run
 */
export declare const updateReactiveIndex: (collection: DBCollection, query: Query[] | QueryBuilder) => void;
/**
 * Create a new reactive index from a query array (should be run from the collection, not directly)
 * @ignore
 * @param collection Collection to create reactive index on
 * @param query Query array to perform
 */
export declare const createReactiveIndex: (collection: DBCollection, query: Query[] | QueryBuilder) => {
    docs: DBDoc[];
};
