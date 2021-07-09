import type { StorageProvider, DBDoc } from '@memsdb/types';
/**
 * Save and load backups from localStorage - may be subject to localstorage
 * size limits
 * @category Storage Provider
 */
export declare class MemoryStorage<T> implements StorageProvider<T> {
    constructor();
    load(doc: DBDoc<T>): T;
    save(doc: DBDoc<T>, data: T): boolean;
    delete(doc: DBDoc<T>): void;
}
