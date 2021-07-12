"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoidBackup = void 0;
/**
 * Send backups to the void, and retrieve nothing
 * @category Backup Provider
 */
class VoidBackup {
    constructor() { }
    /**
     * Return nothing
     */
    load() {
        return {};
    }
    /**
     * Void save
     */
    save() {
        return true;
    }
}
exports.VoidBackup = VoidBackup;
//# sourceMappingURL=index.js.map