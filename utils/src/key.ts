/**
 * Iterate over a provided key string to get some deeply nested data
 *
 * (This function is run from the query, you shouldn't have to do this manually unless you want to)
 * @param obj Object to iterate through
 * @param key Period delimited string key to be seperated and iterated over
 * @example Deeply nested key retrieval
 * ```typescript
 * nestedKey({layer1: {layer2: {layer3: 'boop'}}}, 'layer1.layer2.layer3') // Returns 'boop'
 * ```
 * @example Single level nested array to retrieve key from
 * ```typescript
 * nestedKey({layer1: [{layerArr1: 'val1'}, {layerArr1: 'val2'}]}, 'layer1.[].layerArr1') // Returns ['val1', 'val2']
 * ```
 * @example Deeply nested arrays inside deeply nested arrays
 * ```typescript
 * nestedKey(
 *   {
 *     layer1: [
 *       {
 *         layerArr1: [
 *           {layerArr2: 'val1-1'},
 *           {layerArr2: 'val1-2'}
 *         ]
 *       },
 *       {
 *         layerArr1: [
 *           {layerArr2: 'val2-1'},
 *           {layerArr2: 'val2-2'}
 *         ]
 *       }
 *     ]
 *   },
 *  'layer1.[].layerArr1.[].layerArr2'
 * ) // Returns ['val1-1', 'val1-2', 'val2-1', 'val2-2']
 * ```
 */
export const nestedKey = (
  obj: { [key: string]: any } | any[],
  key = ''
): any | any[] => {
  // Define a temporary value that will eventually be returned
  let tmpVal

  // Setup a temporary reference to the object we're getting the nested value of
  let tmpProp = obj

  // Return just the updated or created at key value if they're the one's
  // requested
  if (
    (key === '_updatedAt' || key === '_createdAt' || key === 'id') &&
    !Array.isArray(obj)
  ) {
    return obj[key]
  }

  // Split the keys so we can iterate over them
  const keys = key.split('.')

  for (let i = 0; i < keys.length; i++) {
    const keyName = keys[i]
    const nextKeyName = keys[i + 1]

    // Check to make sure either the object contains the key,
    // or we're looking for an array and the key we're on is an array
    if (
      tmpProp.hasOwnProperty(keyName) ||
      (Array.isArray(tmpProp) && (keyName === '[]' || keyName === 'length'))
    ) {
      // Handle iterating over an array
      if (
        Array.isArray(tmpProp) &&
        (keyName === '[]' || keyName === 'length')
      ) {
        // Handle if the user
        if (keyName === 'length') return tmpProp.length

        // As this is an array, map over the tmpProp value
        tmpVal = tmpProp
          .map((val) => {
            // Return the array item if there's no following key to search
            if (keys[i + 1] === undefined) return val
            // Call the function again recursing down to get the inner
            // contents if we have a particularly long key string
            else return nestedKey(val, keys.slice(i + 1).join('.'))
          })
          // Flatten the array to the length of how many keys there are
          .flat(keys.length + 1)
          // Filter out undefined results
          .filter((val) => val !== undefined)
      }
      // Otherwise just set the tmpProp to the key requested and coninue on
      else {
        tmpProp = tmpProp as { [key: string]: any }
        tmpProp = tmpProp[keyName]
      }

      // End of the line, set the returned value to the tmpProp value
      if (i + 1 === keys.length) tmpVal = tmpProp
    } else {
      // Key doesn't exist or can't be iterated, break the for loop and return
      // undefined (probably)
      break
    }
  }

  // Return the result~
  return tmpVal
}
