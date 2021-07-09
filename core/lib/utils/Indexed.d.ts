import type { DBDoc as DBDocType, Query as QueryType } from '@memsdb/types';
/**
 * Update an index on a document to increase search speeds for nested keys and arrays
 * @param doc Document to update index on
 * @param key Query key to update index on
 * @ignore
 */
export declare const updateDocIndex: <T>(doc: DBDocType<T>, key?: string) => any;
/**
 * Get/Create an index on the document and/or collection (if reactive) based
 * on the provided query
 * @param param0 Index options
 * @ignore
 */
export declare const getOrCreateIndex: <T>({ doc, query, }: {
    doc: DBDocType<T>;
    query: QueryType;
}) => any | any[];
