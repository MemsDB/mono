import { existsSync, mkdirSync } from 'fs';
import { readFileSync, writeFileSync, readdirSync, rmSync } from 'fs';
import { join } from 'path';
/**
 * Backup MemsDB collections to the filesystem
 * @category Backup Provider
 */
export class FSBackup {
    constructor(opts = {}) {
        const { saveDirectory = './', filenameFormat = '%time_%date.memsdb', backupLimit = 10, } = opts;
        this.saveDirectory = saveDirectory;
        this.filenameFormat = filenameFormat;
        this.backupLimit = backupLimit;
        if (!existsSync(this.saveDirectory)) {
            mkdirSync(this.saveDirectory, {
                recursive: true,
            });
        }
    }
    /**
     * Loads a backup from the filesystem or returns an object with an error
     */
    load() {
        const dirListing = readdirSync(this.saveDirectory);
        const currentFiles = dirListing.filter((file) => file.endsWith('.memsdb'));
        const sorted = currentFiles.sort().reverse();
        if (sorted.length === 0)
            return {};
        const newestFile = sorted[0];
        const file = readFileSync(join(this.saveDirectory, newestFile), {
            encoding: 'utf8',
        });
        let backup;
        try {
            backup = JSON.parse(file);
        }
        catch (error) {
            const err = error;
            backup = {
                _err: err,
                _errmessage: err.message,
                _errstack: err.stack,
            };
        }
        finally {
            return backup;
        }
    }
    /**
     * Save a backup to the filesystem
     * @param backup Backup data to save
     */
    save(backup) {
        // Time constants
        const now = new Date();
        const year = now.getFullYear();
        const month = `${now.getMonth() + 1}`.padStart(2, '0');
        const date = `${now.getDate()}`.padStart(2, '0');
        const hour = `${now.getHours()}`.padStart(2, '0');
        const minute = `${now.getMinutes()}`.padStart(2, '0');
        const second = `${now.getSeconds()}`.padStart(2, '0');
        // Generate filname
        const file = this.filenameFormat
            .replace('%time', now.getTime().toString())
            .replace('%date', `${year}.${month}.${date}_${hour}.${second}.${minute}`);
        // Attempt to write the file to disk, return false on failure
        try {
            writeFileSync(join(this.saveDirectory, file), JSON.stringify(backup), {
                encoding: 'utf8',
            });
        }
        catch (err) {
            console.error(err);
            return false;
        }
        // Attempt to delete extraneous files. Output to the console but continue on failure.
        try {
            const dirListing = readdirSync(this.saveDirectory);
            const currentFiles = dirListing
                .filter((file) => file.endsWith('.memsdb'))
                .sort()
                .reverse();
            const toDelete = currentFiles.splice(this.backupLimit);
            toDelete.map((file) => rmSync(join(this.saveDirectory, file)));
        }
        catch (err) {
            console.error(err);
        }
        return true;
    }
}
//# sourceMappingURL=index.js.map