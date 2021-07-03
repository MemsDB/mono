/**
 * @packageDocumentation
 * @module populate
 * [[include:populate.md]]
 */
import { v4 } from 'uuid';
import { nestedKey } from './key';
/**
 * Tokenify a string array into a usable token array for MemsPL
 * @ignore
 * @param strArr Array of individual characters to be tokenified
 * @param tokenArr Array of tokens to pass in (for if you run the function multiple times or append multiple MemsPL queries)
 */
const tokenify = (strArr = [], tokenArr = []) => {
    // Define a token placeholder
    let token = '';
    // Helper function just to push the current token to the tokenArr and reset
    // the token var
    const pushAndReset = () => {
        if (token !== '')
            tokenArr.push(token);
        token = '';
    };
    // Loop over
    while (strArr.length > 0) {
        const char = strArr.shift();
        switch (char) {
            // Structural characters for array and object handling
            case '[':
            case ']':
            case '<':
            case '>':
            case '{':
            case '}':
                if (token !== '')
                    pushAndReset();
                tokenArr.push(char);
                continue;
            // newlines, tabs and commas end the current token and continue
            case `\n`:
            case `\t`:
            case ',':
                pushAndReset();
                continue;
            // Spaces can get added to a token if it already exists (can't start with a space)
            case ' ':
                if (token !== '')
                    token += char;
                continue;
            // Handle every other character as part of a token
            default:
                token += char;
                continue;
        }
    }
    return tokenArr;
};
/**
 * Create an array of queries from a given token array
 * @ignore
 * @param tokenArr Array of tokens to iterate through
 * @param cur Current object to work on
 * @param queries Queries array as a starting point
 * @param __ Debugger function
 */
const createQueries = (tokenArr = [], cur = {}, queries = [], db, __) => {
    // If cur.key is set, push the cur query to the array and reset cur
    const pushAndReset = () => {
        cur.key !== undefined && queries.push(cur);
        cur = {};
    };
    // Handle what key (either key or ref) to set the token to in the query
    let nextTokenType = 'key';
    loop: while (tokenArr.length > 0) {
        const token = tokenArr.shift();
        switch (token) {
            // Start of reference type
            case '<':
                /* DEBUG */ __('--%s--, Opening ref', token);
                nextTokenType = 'ref';
                continue;
            // End reference type
            case '>':
                /* DEBUG */ __('--%s--, Closing ref', token);
                nextTokenType = 'key';
                continue;
            // Start child queries
            case '[':
            case '{':
                /* DEBUG */ __('--%s--, Opening %s, tokenArr, nextTokenType is %s', token, token === '[' ? 'array' : 'object', nextTokenType);
                cur.isArr = token === '[' ? true : false;
                // cur.children = []
                cur.children = createQueries(tokenArr, {}, [], db, __.extend(cur.key));
                pushAndReset();
                continue;
            // End child queries
            case ']':
            case '}':
                /* DEBUG */ __('--%s--, Closing array or object, tokenArr, nextTokenType is %s, pushing query and resetting cur', token, nextTokenType);
                pushAndReset();
                break loop;
            // token is a word, set it to the cur object
            default:
                /* DEBUG */ __('--Default: %s--, Setting `%s` to %s', token, nextTokenType, token);
                // If the query already has a defined key, then push and reset the
                // current obj so as to not overwrite the key
                if (cur.key !== undefined) {
                    __('--- %s', cur.key.substr(cur.key.length - 1) === '.' ? 'true' : 'false');
                }
                // Set the ref or key to the current token
                cur[nextTokenType] =
                    nextTokenType === 'ref' ? db.collections[token] : token;
                // Continue the while loop when if there are:
                // - More tokens
                // - The next token is an array/object opener
                // - Or if we're still in a reference declaration (gets reset next token)
                if (tokenArr.length > 0 &&
                    ((nextTokenType === 'key' &&
                        (tokenArr[0] === '{' || tokenArr[0] === '[')) ||
                        nextTokenType === 'ref'))
                    continue;
                // Otherwise push the current object to the queries list and reset
                // the current object
                else
                    pushAndReset();
        }
    }
    // Do a final push and reset before returning the queries
    pushAndReset();
    return queries;
};
/**
 * Parse MemsDB Population Language (MemsPL) into something usable by memsdb
 * @param query MemsPL to parse into a populate query
 * @param db Database reference for collections
 * @ignore
 * @example
 * parseMemsPL(`
 *   <submissions>submissions[
 *     <comments>comments[
 *       <users>user{
 *         username
 *       }
 *     ]
 *   ],
 *   <users>followers[
 *     username
 *   ],
 *   dateCreated
 * `)
 */
const ParseMemsPL = (query = '', rootCollection, _) => {
    const __ = _.extend('ParseMemsPL');
    const strArr = query.split('');
    // Split the input query into an array of tokens
    const tokens = tokenify(strArr);
    __('Parsed tokens: %s', JSON.stringify(tokens, undefined, 2));
    // Convert the token array into a JS structure for querying later
    const queries = createQueries(tokens, {}, [], rootCollection.db, __);
    __('Parsed queries: %s', JSON.stringify(queries, undefined, 2));
    return queries;
};
/**
 * Populate an array of documents into a tree based on a MemsDB Population Language (MemsPL) string
 * @param rootCollection Collection to initially populate on (root document collection)
 * @param docs Array of documents to populate - normally from find() results
 * @param populateQuery MemPL string to use
 * @param filter Filter out non-specified keys
 * @example
 * ```typescript
 * populate(`
 *   <submissions>submissions[
 *     <comments>comments[
 *       <users>user{
 *         username
 *       }
 *     ]
 *   ],
 *   <users>followers[
 *     username
 *   ],
 *   dateCreated
 * `)
 * ```
 * [[include:populate.md]]
 */
export const populate = (rootCollection, docs, populateQuery, filter = false) => {
    const _ = rootCollection.col_.extend('populate');
    const parsed = ParseMemsPL(populateQuery, rootCollection, _);
    _('population formatted, running recursive populate');
    const filterDoc = (doc, keys) => {
        const toRemove = Object.keys(doc.data).filter((key) => !keys.includes(key));
        toRemove.forEach((key) => delete doc.data[key]);
    };
    /**
     * A recursive function to populate documents down a tree
     * @param queries Populate query array to run
     * @param docsOrig Original document array to dupe, populate, then return
     */
    const runPopulate = (queries, docsOrig, pop_) => {
        const runPop_ = pop_.extend(`<runPopulate>${v4()}`);
        // Duplicate all the original documents so as to avoid mutating the originals with references to the copies
        const duped = docsOrig.map((doc) => doc.clone());
        /* DEBUG */ runPop_('Documents duped');
        const keysList = queries.map((query) => query.key);
        runPop_('List of keys to keep on document: %O', keysList);
        // Go down the array of queries to populate documents
        for (let i = 0; i < queries.length; i++) {
            const query = queries[i];
            /* DEBUG */ runPop_('Query picked, %d remaining', queries.length - i - 1);
            // Map over duped documents applying the populations to the correct key
            /* DEBUG */ runPop_('Looping over duplicated docs to run population queries on');
            duped.forEach((doc) => {
                let nestedKeyVal;
                if (query) {
                    switch (query.key) {
                        case 'id':
                        case '_updatedAt':
                        case '_createdAt':
                            nestedKeyVal = doc[query.key];
                            break;
                        default:
                            nestedKeyVal = nestedKey(doc.data, query.key);
                            break;
                    }
                }
                /* DEBUG */ runPop_('nestedKeyVal Key: %s', query?.key);
                /* DEBUG */ runPop_('nestedKeyVal Val: %O', nestedKeyVal);
                if (query?.ref) {
                    // Handle if there are child queries and there's a ref set
                    if (query?.children) {
                        // Handle whether the key to populate is an array or not
                        if (query.isArr || Array.isArray(nestedKeyVal)) {
                            let childDocs = [];
                            if (nestedKeyVal) {
                                if (Array.isArray(nestedKeyVal)) {
                                    childDocs = nestedKeyVal.map((id) => query.ref?.id(id));
                                }
                                else {
                                    /* DEBUG */ runPop_('nestedKeyVal is not an array');
                                    childDocs = [query.ref?.id(nestedKeyVal)];
                                }
                            }
                            else {
                                /* DEBUG */ runPop_('No provided nestedKeyVal');
                            }
                            doc.set(query.key, runPopulate(query.children, childDocs, runPop_));
                        }
                        // Otherwise set the key to the first result of a populate query
                        else {
                            /* DEBUG */ runPop_('Query isn\'t on an array');
                            // Find the document
                            const childDoc = query.ref.id(nestedKeyVal);
                            // If the child document exists, run a population on it
                            if (childDoc) {
                                // Run runPopulate on it with the child queries
                                const childPopulated = runPopulate(query.children, [childDoc], runPop_);
                                // Set the key to the first result of the runPopulate if it exists
                                if (childPopulated.length > 0)
                                    doc.set(query.key, childPopulated[0]);
                            }
                        }
                    }
                    // Handle populations of external documents with no added sub-queries
                    else {
                        /* DEBUG */ runPop_('No children');
                        // Handle if the key is an array of ids or not
                        if (query.isArr || Array.isArray(nestedKeyVal)) {
                            doc.set(query.key, nestedKeyVal.map((id) => {
                                if (query.ref) {
                                    const childDoc = query.ref.id(id);
                                    if (childDoc)
                                        return childDoc;
                                }
                                return id;
                            }));
                        }
                        // Otherwise just do the single population
                        else {
                            const childDoc = query.ref.id(nestedKeyVal);
                            if (childDoc)
                                doc.set(query.key, childDoc);
                        }
                    }
                }
                else {
                    /* DEBUG */ runPop_('No ref');
                }
                if (filter) {
                    /* DEBUG */ runPop_('Removing unnecessary keys from document');
                    filterDoc(doc, keysList);
                }
            });
            /* DEBUG */ runPop_('Finished looping over duplicated docs');
        }
        return duped;
    };
    // Run the initial population
    const populated = runPopulate(parsed, docs, _);
    return populated;
};
//# sourceMappingURL=populate.js.map