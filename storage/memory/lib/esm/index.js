/**
 * Save and load backups from localStorage - may be subject to localstorage
 * size limits
 * @category Storage Provider
 */
export class MemoryStorage {
    constructor() { }
    load(doc) {
        return doc.pluginData.get('memoryStorage');
    }
    save(doc, data) {
        doc.pluginData.set('memoryStorage', data);
        return true;
    }
    delete(doc) {
        doc.pluginData.delete('memoryStorage');
    }
}
//# sourceMappingURL=index.js.map