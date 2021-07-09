/**
 * Debounce a function so it only runs the one time for function calls within
 * a length of time of eachother
 * @ignore
 * @param callback Function to debounce
 * @param waitFor Amount of time to wait for
 * @returns The result of the function
 */
export declare const debounce: <T extends (...args: any[]) => any>(callback: T, waitFor: number) => (...args: Parameters<T>) => ReturnType<T>;
