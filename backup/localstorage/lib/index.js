/**
 * Save and load backups from localStorage - may be subject to localstorage
 * size limits
 * @category Backup Provider
 */
export class LocalStorageBackup {
    constructor() { }
    load() {
        const backup = localStorage.getItem('memsdb');
        if (backup)
            return JSON.parse(backup);
        else
            return {};
    }
    save(backup) {
        localStorage.setItem('memsdb', JSON.stringify(backup));
        return true;
    }
}
