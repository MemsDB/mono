import type { DBDoc } from '@memsdb/core';
import type { Data, StorageProvider } from '@memsdb/types/storageProvider';
/**
 * Save and load backups from localStorage - may be subject to localstorage
 * size limits
 * @category Storage Provider
 */
export declare class MemoryStorage implements StorageProvider {
    constructor();
    load(doc: DBDoc): any;
    save(doc: DBDoc, data: Data): boolean;
    delete(doc: DBDoc): void;
}
