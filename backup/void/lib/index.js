/**
 * Send backups to the void, and retrieve nothing
 * @category Backup Provider
 */
export class VoidBackup {
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
//# sourceMappingURL=index.js.map