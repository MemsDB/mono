import { Secret } from 'jsonwebtoken';
import { DB } from '@memsdb/core';
export declare class MemsDBServer {
    private db;
    private _;
    private app;
    /**
     * JWT signing secret
     */
    private secret;
    /**
     * Iterations for hashing strings
     */
    private static keyIterations;
    /**
     * Key length for hashed keys in auth table
     */
    private static keyLength;
    /**
     * Maximum expiry for a token in seconds
     */
    private tokenExpiry;
    /**
     * Require authentication for routes
     */
    private requireAuth;
    readonly port: number;
    constructor(db: DB, opts?: {
        /** Defaults to 16055 */
        port?: number;
        /** JWT signing secret */
        secret?: Secret;
        /** How long a JWT token should stay active for (in seconds) */
        tokenExpiry?: number;
        /** Require Auth */
        requireAuth?: 'none' | 'all';
    });
    private DBEventHandlers;
    /**
     * Register the default paths for a collection
     * @param collection Collection to register
     * @ignore
     */
    private registerCollection;
    private registerAuthRoutes;
    /**
     * Populate a tree of docs with a MemsPL population string
     * @param _debug Debugger parent function
     * @param collection Collection the parent documents are from
     * @param docs Docs slice to apply population to
     * @param populationQuery MemsPL population query to run
     * @param filterPopulatedData Boolean of whether or not to filter unspecified keys
     * @returns populated docs slice
     * @ignore
     */
    private memsdbPopulate;
    /**
     * Apply a limit and offset to an array of documents
     * @param _debug Debugger parent function
     * @param docs Docs array to slice
     * @param limitStr Limit string to parse
     * @param offsetStr Offset string to parse
     * @returns Slice of documents
     */
    private memsdbLimitOffset;
    private memsdbFind;
    private json;
    private parseAuthToken;
    private createAuthToken;
    private static saltHashString;
    private testACL;
    createAuthUser(password?: string): void;
}
