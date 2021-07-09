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
export declare const nestedKey: (obj: any[] | {
    [key: string]: any;
}, key?: string) => any | any[];
