"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryStorage = void 0;
/**
 * Save and load backups from localStorage - may be subject to localstorage
 * size limits
 * @category Storage Provider
 */
class MemoryStorage {
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
exports.MemoryStorage = MemoryStorage;
//# sourceMappingURL=index.js.map