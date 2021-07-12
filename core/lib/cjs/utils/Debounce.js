"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.debounce = void 0;
/**
 * Debounce a function so it only runs the one time for function calls within
 * a length of time of eachother
 * @ignore
 * @param callback Function to debounce
 * @param waitFor Amount of time to wait for
 * @returns The result of the function
 */
const debounce = (callback, waitFor) => {
    let timeout;
    return (...args) => {
        let result;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            result = callback(...args);
        }, waitFor);
        return result;
    };
};
exports.debounce = debounce;
//# sourceMappingURL=Debounce.js.map