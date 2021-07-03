const localStorage = window.localStorage;
/**
 * Save and load backups from localStorage - may be subject to localstorage size limits
 * @category Storage Provider
 */
export class LocalStorage {
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
