/**
 * Debounce a function so it only runs the one time for function calls within
 * a length of time of eachother
 * @ignore
 * @param callback Function to debounce
 * @param waitFor Amount of time to wait for
 * @returns The result of the function
 */
export const debounce = (callback, waitFor) => {
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
//# sourceMappingURL=debounce.js.map