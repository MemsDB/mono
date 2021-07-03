import type { Query, Operators } from '@memsdb/types/query';
import type { DBCollection, DBDoc } from '@memsdb/core';
import type { Debugger } from 'debug';
/**
 * Run a query to filter out specific documents
 * @ignore
 * @param queryArr Array of query objects to run/loop through
 * @param col Collection to run query on
 * @param seedDocs Document array to filter, either from the collection, or from recursion
 * @category Query
 */
export declare const runQuery: (queryArr: Query[] | QueryBuilder, col: DBCollection, seedDocs: DBDoc[], nested_?: Debugger | undefined, nestedOp_?: Operators | undefined) => DBDoc[];
declare type WhereCallback = (query: QueryBuilder) => QueryBuilder;
/**
 * Helper function to easily generate queries
 * @example Simple example showing a basic set of where's (&& together) to get documents with a value between (inclusive) 40 and 50
 * ```typescript
 * const query = QueryBuilder
 *   .where('myKey', '>=' 40)
 *   .where('myKey', '<=', 50)
 * ```
 *
 * @example Using the orWhere function to generate OR queries
 * ```typescript
 * const query = QueryBuilder
 *   .orWhere(or => or
 *     .where('myKey', '===', true)
 *     .where('mySecondKey', '===', 52, true)
 *   )
 * ```
 * ```sql
 * -- The equivalent SQL query would be as follows --
 * SELECT
 *   *
 * FROM
 *   collection
 * WHERE
 *   myKey = TRUE
 *   AND mySecondKey != 52
 * ```
 *
 * @example Nested AND queries in an OR query
 * ```typescript
 * const query = QueryBuilder
 *   .orWhere(or => or
 *     .andWhere(
 *       and => and
 *         .where('key1', '===', 21)
 *         .where('key2', '===', 'boop')
 *     )
 *     .andWhere(
 *       and => and
 *         .where('key3', '>=', 1)
 *         .where('key4', '<=', 100)
 *     )
 *   )
 * ```
 * ```typescript
 * // The above is kind of like the following if statement
 * if(
 *   (
 *     key1 === 21 &&
 *     key2 === 'boop'
 *   ) ||
 *   (
 *     key3 >= 1 &&
 *     key4 <= 100
 *   )
 * )
 * ```
 * ```sql
 * -- Or like the following SQL query --
 * SELECT
 *   *
 * FROM
 *   collection
 * WHERE
 *   (
 *     key1 = 21
 *     AND key2 = 'boop'
 *   )
 *   OR (
 *     key3 >= 1
 *     AND key4 <= 100
 *   )
 * ```
 * @category Query
 */
export declare class QueryBuilder {
    queries: Query[];
    constructor();
    /**
     * Generate a new query for the array
     * @param key Key to search on (run through nestedKey function)
     * @param operation Comparison operation to use
     * @param comparison What to compare against
     * @param inverse Inverse the result of the where query
     */
    where(key: string, operation: Operators, comparison: any, inverse?: boolean): this;
    /**
     * Generate a new query for the array
     * @param key Key to search on (run through nestedKey function)
     * @param operation Comparison operation to use
     * @param comparison What to compare against
     * @param inverse Inverse the result of the where query
     */
    static where(key: string, operation: Operators, comparison: any, inverse?: boolean): QueryBuilder;
    /**
     * Generate a nested || query
     * @param queryFunc callback for generating || queries with a nested QueryBuilder
     */
    orWhere(queryFunc: WhereCallback): this;
    /**
     * Generate a nested || query
     * @param queryFunc callback for generating || queries with a nested QueryBuilder
     */
    static orWhere(queryFunc: WhereCallback): QueryBuilder;
    /**
     * Generate && queries for nesting within || queries
     * @param queryFunc callback for generating queries with a nested QueryBuilder
     */
    andWhere(queryFunc: WhereCallback): this;
    /**
     * Generate && queries for nesting within || queries
     * @param queryFunc callback for generating queries with a nested QueryBuilder
     */
    static andWhere(queryFunc: WhereCallback): QueryBuilder;
}
export {};
