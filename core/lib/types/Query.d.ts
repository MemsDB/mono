import type { Query as QueryType, QueryBuilder as QueryBuilderType, Operators, DBDoc as DBDocType, DBCollection as DBCollectionType } from '@memsdb/types';
import type { Debugger } from 'debug';
import type { QueryHandler as QueryHandlerType } from '@memsdb/types/QueryHandler';
/**
 * Run a query to filter out specific documents
 * @ignore
 * @param queryArr Array of query objects to run/loop through
 * @param col Collection to run query on
 * @param seedDocs Document array to filter, either from the collection, or from recursion
 * @category Query
 */
export declare const runQuery: (queryArr: QueryType[] | QueryBuilderType, col: DBCollectionType<any>, seedDocs: DBDocType<any>[], nested_?: Debugger | undefined, nestedOp_?: Operators | undefined) => DBDocType<any>[];
declare type WhereCallback = (query: QueryBuilderType) => QueryBuilderType;
/**
 * Helper class to easily generate queries
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
export declare class QueryBuilder implements QueryBuilderType {
    queries: QueryType[];
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
    static where(key: string, operation: Operators, comparison: any, inverse?: boolean): QueryBuilderType;
    /**
     * Generate a nested || query
     * @param queryFunc callback for generating || queries with a nested QueryBuilder
     */
    orWhere(queryFunc: WhereCallback): QueryBuilderType;
    /**
     * Generate a nested || query
     * @param queryFunc callback for generating || queries with a nested QueryBuilder
     */
    static orWhere(queryFunc: WhereCallback): QueryBuilderType;
    /**
     * Generate && queries for nesting within || queries
     * @param queryFunc callback for generating queries with a nested QueryBuilder
     */
    andWhere(queryFunc: WhereCallback): QueryBuilderType;
    /**
     * Generate && queries for nesting within || queries
     * @param queryFunc callback for generating queries with a nested QueryBuilder
     */
    static andWhere(queryFunc: WhereCallback): QueryBuilderType;
}
/**
 * Helper class to create Query handlers for addition into a database
 *
 * @category Query
 * @category Core
 */
export declare class QueryHandler implements QueryHandlerType {
    /** Event type of this handler */
    operator: string;
    /**
     * Handler function for this event type.
     * This function will get called in order of addition to the DB
     */
    func: (key: string, value: any, comparison: any) => boolean;
    /**
     * Create a new EventHandler to handle events in MemsDB
     * @param eventType MemsDB event type to be handled
     * @param func Function to run on event
     */
    constructor(operator: string, func: (key: string, value: any, comparison: any) => boolean);
}
export {};
