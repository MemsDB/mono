import { readFileSync, existsSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { isAbsolute, join, normalize } from 'path';
import { validate } from 'uuid';
/**
 * Save and load backups from localStorage - may be subject to localstorage size limits
 * @category Storage Provider
 */
export class FSStorage {
    constructor(db, opts = {}) {
        this.db = db;
        const { saveDirectory = './data', prefix = `${this.db.name}_` } = opts;
        this.saveDirectory = normalize(saveDirectory);
        this.prefix = prefix;
        if (!existsSync(this.saveDirectory)) {
            mkdirSync(this.saveDirectory, {
                recursive: true,
            });
        }
    }
    normalizePath(docId) {
        const paths = [this.saveDirectory];
        if (validate(docId)) {
            paths.push(docId.substr(0, 2), docId.substr(2, 2));
        }
        else {
            paths.push('alternate');
        }
        const dirPath = normalize(join(...paths));
        const fileName = `${this.prefix}${docId}`;
        if (!isAbsolute(this.saveDirectory)) {
            paths.unshift(process.cwd());
        }
        if (!existsSync(dirPath)) {
            mkdirSync(dirPath, {
                recursive: true,
            });
        }
        return normalize(join(dirPath, fileName));
    }
    load(doc) {
        const filePath = this.normalizePath(doc.id);
        if (existsSync(filePath)) {
            const file = readFileSync(filePath, {
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
            writeFileSync(filePath, JSON.stringify(data), {
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
            rmSync(filePath);
        }
        catch (error) {
            console.error(error);
            return false;
        }
        return true;
    }
}
//# sourceMappingURL=index.js.map