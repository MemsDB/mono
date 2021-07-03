import { DBDoc } from '@memsdb/core';
import { Data, StorageProvider } from '@memsdb/types/storageProvider';
/**
 * Save and load backups from localStorage - may be subject to sessionStorage
 * size limits
 * @category Storage Provider
 */
export declare class SessionStorage implements StorageProvider {
    constructor();
    load(doc: DBDoc): any;
    save(doc: DBDoc, data: Data): boolean;
    delete(doc: DBDoc): void;
}
