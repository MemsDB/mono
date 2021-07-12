"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalStorageBackup = void 0;
/**
 * Save and load backups from localStorage - may be subject to localstorage
 * size limits
 * @category Backup Provider
 */
class LocalStorageBackup {
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
exports.LocalStorageBackup = LocalStorageBackup;
//# sourceMappingURL=index.js.map