"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FSBackup = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
/**
 * Backup MemsDB collections to the filesystem
 * @category Backup Provider
 */
class FSBackup {
    constructor(opts = {}) {
        const { saveDirectory = './', filenameFormat = '%time_%date.memsdb', backupLimit = 10, } = opts;
        this.saveDirectory = saveDirectory;
        this.filenameFormat = filenameFormat;
        this.backupLimit = backupLimit;
        if (!fs_1.existsSync(this.saveDirectory)) {
            fs_1.mkdirSync(this.saveDirectory, {
                recursive: true,
            });
        }
    }
    /**
     * Loads a backup from the filesystem or returns an object with an error
     */
    load() {
        const dirListing = fs_1.readdirSync(this.saveDirectory);
        const currentFiles = dirListing.filter(file => file.endsWith('.memsdb'));
        const sorted = currentFiles.sort().reverse();
        if (sorted.length === 0)
            return {};
        const newestFile = sorted[0];
        const file = fs_1.readFileSync(path_1.join(this.saveDirectory, newestFile), {
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
            fs_1.writeFileSync(path_1.join(this.saveDirectory, file), JSON.stringify(backup), {
                encoding: 'utf8',
            });
        }
        catch (err) {
            console.error(err);
            return false;
        }
        // Attempt to delete extraneous files. Output to the console but continue on failure.
        try {
            const dirListing = fs_1.readdirSync(this.saveDirectory);
            const currentFiles = dirListing
                .filter(file => file.endsWith('.memsdb'))
                .sort()
                .reverse();
            const toDelete = currentFiles.splice(this.backupLimit);
            toDelete.map(file => fs_1.rmSync(path_1.join(this.saveDirectory, file)));
        }
        catch (err) {
            console.error(err);
        }
        return true;
    }
}
exports.FSBackup = FSBackup;
//# sourceMappingURL=index.js.map