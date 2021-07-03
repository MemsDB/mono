/**
 * Debounce a function so it only runs the one time for function calls within
 * a length of time of eachother
 * @ignore
 * @param callback Function to debounce
 * @param waitFor Amount of time to wait for
 * @returns The result of the function
 */
export const debounce = <T extends (...args: any[]) => any>(
  callback: T,
  waitFor: number
) => {
  let timeout: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>): ReturnType<T> => {
    let result: any
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      result = callback(...args)
    }, waitFor)
    return result
  }
}
