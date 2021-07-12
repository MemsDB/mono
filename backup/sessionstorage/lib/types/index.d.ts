import { Backup, BackupProvider } from '@memsdb/types';
/**
 * Save and load backups from localStorage - may be subject to sessionStorage
 * size limits
 * @category Backup Provider
 */
export declare class SessionStorageBackup implements BackupProvider {
    constructor();
    load(): any;
    save(backup: Backup): boolean;
}
