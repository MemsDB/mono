import type { DBCollection as DBCollectionType, DBDoc as DBDocType } from '@memsdb/types';
export interface PopulateQuery {
    key: string;
    ref?: DBCollectionType<any>;
    children?: PopulateQuery[];
    isArr?: boolean;
    remote?: string;
}
/**
 * Populate an array of documents into a tree based on a MemsDB Population Language (MemsPL) string
 * @param rootCollection Collection to initially populate on (root document collection)
 * @param docs Array of documents to populate - normally from find() results
 * @param populateQuery MemPL string to use
 * @param filter Filter out non-specified keys
 * @example
 * ```typescript
 * populate(`
 *   <submissions>submissions[
 *     <comments>comments[
 *       <users>user{
 *         username
 *       }
 *     ]
 *   ],
 *   <users>followers[
 *     username
 *   ],
 *   dateCreated
 * `)
 * ```
 * [[include:populate.md]]
 */
export declare const populate: <T>(rootCollection: DBCollectionType<T>, docs: DBDocType<T>[], populateQuery: string, filter?: boolean) => DBDocType<T>[];
