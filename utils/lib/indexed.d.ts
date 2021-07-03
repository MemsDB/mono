import type { DBDoc } from '@memsdb/core';
import type { Query } from '@memsdb/types/query';
/**
 * Update an index on a document to increase search speeds for nested keys and arrays
 * @param doc Document to update index on
 * @param key Query key to update index on
 * @ignore
 */
export declare const updateDocIndex: (doc: DBDoc, key?: string) => any;
/**
 * Get/Create an index on the document and/or collection (if reactive) based
 * on the provided query
 * @param param0 Index options
 * @ignore
 */
export declare const getOrCreateIndex: ({ doc, query, }: {
    doc: DBDoc;
    query: Query;
}) => any | any[];
