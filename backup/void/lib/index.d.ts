import { BackupProvider } from '@memsdb/types/backupProvider';
/**
 * Send backups to the void, and retrieve nothing
 * @category Backup Provider
 */
export declare class VoidBackup implements BackupProvider {
    constructor();
    /**
     * Return nothing
     */
    load(): {};
    /**
     * Void save
     */
    save(): boolean;
}
