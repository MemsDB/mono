"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FSStorage = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
/**
 * Save and load backups from localStorage - may be subject to localstorage size limits
 * @category Storage Provider
 */
class FSStorage {
    constructor(db, opts = {}) {
        this.db = db;
        const { saveDirectory = './data', prefix = `${this.db.name}_` } = opts;
        this.saveDirectory = path_1.normalize(saveDirectory);
        this.prefix = prefix;
        if (!fs_1.existsSync(this.saveDirectory)) {
            fs_1.mkdirSync(this.saveDirectory, {
                recursive: true,
            });
        }
    }
    normalizePath(docId) {
        const paths = [this.saveDirectory, `${this.prefix}${docId}`];
        if (!path_1.isAbsolute(this.saveDirectory)) {
            paths.unshift(process.cwd());
        }
        return path_1.normalize(path_1.join(...paths));
    }
    load(doc) {
        const filePath = this.normalizePath(doc.id);
        if (fs_1.existsSync(filePath)) {
            const file = fs_1.readFileSync(filePath, {
                encoding: 'utf8',
            });
            let docData;
            try {
                docData = JSON.parse(file);
            }
            catch (error) {
                const err = error;
                docData = {
                    _err: err,
                    _errmessage: err.message,
                    _errstack: err.stack,
                };
            }
            finally {
                return docData;
            }
        }
        else
            return {};
    }
    save(doc, data) {
        const filePath = this.normalizePath(doc.id);
        try {
            fs_1.writeFileSync(filePath, JSON.stringify(data), {
                encoding: 'utf8',
            });
        }
        catch (err) {
            console.error(err);
            return false;
        }
        return true;
    }
    delete(doc) {
        const filePath = this.normalizePath(doc.id);
        try {
            fs_1.rmSync(filePath);
        }
        catch (error) {
            console.error(error);
            return false;
        }
        return true;
    }
}
exports.FSStorage = FSStorage;
//# sourceMappingURL=index.js.map