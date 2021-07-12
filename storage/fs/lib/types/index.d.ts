import { StorageProvider, DB, DBDoc } from '@memsdb/types';
/**
 * Save and load backups from localStorage - may be subject to localstorage size limits
 * @category Storage Provider
 */
export declare class FSStorage<T> implements StorageProvider<T> {
    readonly saveDirectory: string;
    readonly prefix: string;
    private db;
    constructor(db: DB, opts?: {
        saveDirectory?: string;
        prefix?: string;
    });
    private normalizePath;
    load(doc: DBDoc<T>): T;
    save(doc: DBDoc<T>, data: T): boolean;
    delete(doc: DBDoc<T>): boolean;
}
