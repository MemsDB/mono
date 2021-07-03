import { DB, DBDoc } from '@memsdb/core';
import { Data, StorageProvider } from '@memsdb/types/storageProvider';
/**
 * Save and load backups from localStorage - may be subject to localstorage size limits
 * @category Storage Provider
 */
export declare class LocalStorage implements StorageProvider {
    readonly saveDirectory: string;
    readonly prefix: string;
    private db;
    constructor(db: DB, opts?: {
        saveDirectory?: string;
        prefix?: string;
    });
    private normalizePath;
    load(doc: DBDoc): any;
    save(doc: DBDoc, data: Data): boolean;
    delete(doc: DBDoc): boolean;
}
