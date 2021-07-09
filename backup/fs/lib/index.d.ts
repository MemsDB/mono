import { Backup, BackupProvider } from '@memsdb/types';
interface FSBackupOpts {
    /**
     * What directory to save the files to, defaults to './'
     */
    saveDirectory?: string;
    /**
     * Filename to save to. You can use %date and %time to get those formatted
     * in. Either or both can be used in a filename exactly once.
     * %date will output something similar to 2021.01.08_15.39.48 (year.month.date_hour.minute.second)
     * %time will output something similar to 1610080788787 (UNIX Epoch)
     */
    filenameFormat?: string;
    /**
     * Number of backup files to keep. Extra files outside this limit will be deleted
     */
    backupLimit?: number;
}
/**
 * Backup MemsDB collections to the filesystem
 * @category Backup Provider
 */
export declare class FSBackup implements BackupProvider {
    private saveDirectory;
    private filenameFormat;
    private backupLimit;
    constructor(opts?: FSBackupOpts);
    /**
     * Loads a backup from the filesystem or returns an object with an error
     */
    load(): any;
    /**
     * Save a backup to the filesystem
     * @param backup Backup data to save
     */
    save(backup: Backup): boolean;
}
export {};
