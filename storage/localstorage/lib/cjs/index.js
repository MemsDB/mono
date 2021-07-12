"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalStorage = void 0;
const localStorage = window.localStorage;
/**
 * Save and load backups from localStorage - may be subject to localstorage size limits
 * @category Storage Provider
 */
class LocalStorage {
    constructor() { }
    load(doc) {
        const data = localStorage.getItem(doc.id);
        if (data)
            return JSON.parse(data);
        else
            return {};
    }
    save(doc, data) {
        localStorage.setItem(doc.id, JSON.stringify(data));
        return true;
    }
    delete(doc) {
        localStorage.removeItem(doc.id);
    }
}
exports.LocalStorage = LocalStorage;
//# sourceMappingURL=index.js.map