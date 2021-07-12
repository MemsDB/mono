import { Backup, BackupProvider } from '@memsdb/types';
/**
 * Save and load backups from localStorage - may be subject to localstorage
 * size limits
 * @category Backup Provider
 */
export declare class LocalStorageBackup implements BackupProvider {
    constructor();
    load(): any;
    save(backup: Backup): boolean;
}
