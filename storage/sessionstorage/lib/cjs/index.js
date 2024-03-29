"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionStorage = void 0;
const sessionStorage = window.sessionStorage;
/**
 * Save and load backups from localStorage - may be subject to sessionStorage
 * size limits
 * @category Storage Provider
 */
class SessionStorage {
    constructor() { }
    load(doc) {
        const data = sessionStorage.getItem(doc.id);
        if (data)
            return JSON.parse(data);
        else
            return {};
    }
    save(doc, data) {
        sessionStorage.setItem(doc.id, JSON.stringify(data));
        return true;
    }
    delete(doc) {
        sessionStorage.removeItem(doc.id);
    }
}
exports.SessionStorage = SessionStorage;
//# sourceMappingURL=index.js.map