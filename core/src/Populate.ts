/**
 * @packageDocumentation
 * @module populate
 * [[include:populate.md]]
 */
import { v4 } from 'uuid'

import { nestedKey } from './utils/NestedKey'
import { QueryBuilder } from './Query'

import type {
  DB as DBType,
  DBCollection as DBCollectionType,
  DBDoc as DBDocType,
} from '@memsdb/types'
import type { Debugger } from 'debug'

export interface PopulateQuery {
  key: string
  ref?: DBCollectionType<any>
  children?: PopulateQuery[]
  isArr?: boolean
  remoteLocalComparisonKey?: string
  remoteExternalKey?: string
}

type TokenType = 'key' | 'ref' | 'remoteLocalComparisonKey' | 'remoteExternalKey'

/**
 * Tokenify a string array into a usable token array for MemsPL
 * @ignore
 * @param strArr Array of individual characters to be tokenified
 * @param tokenArr Array of tokens to pass in (for if you run the function multiple times or append multiple MemsPL queries)
 */
const tokenify = (strArr: string[] = [], tokenArr: string[] = []): string[] => {
  // Define a token placeholder
  let token = ''

  // Helper function just to push the current token to the tokenArr and reset
  // the token var
  const pushAndReset = () => {
    if (token !== '') tokenArr.push(token)
    token = ''
  }

  // Loop over
  while (strArr.length > 0) {
    const char = strArr.shift()

    switch (char) {
      // Structural characters for array and object handling
      case '[':
      case ']':
      case '<':
      case '>':
      case '{':
      case '}':
      case '(':
      case ')':
        if (token !== '') pushAndReset()
        tokenArr.push(char)
        continue
      case ':':
        const lastToken = tokenArr[tokenArr.length - 1]
        if (lastToken && lastToken === '(') {
          if (token !== '') pushAndReset()
          tokenArr.push(char)
          continue
        } else {
          token += char
          continue
        }

      // newlines, tabs and commas end the current token and continue
      case `\n`:
      case `\t`:
      case ',':
        pushAndReset()
        continue

      // Spaces can get added to a token if it already exists (can't start with a space)
      case ' ':
        if (token !== '') token += char
        continue

      // Handle every other character as part of a token
      default:
        token += char
        continue
    }
  }

  if (token !== '') pushAndReset()

  return tokenArr
}

/**
 * Create an array of queries from a given token array
 * @ignore
 * @param tokenArr Array of tokens to iterate through
 * @param cur Current object to work on
 * @param queries Queries array as a starting point
 * @param __ Debugger function
 */
const createQueries = (
  tokenArr: string[] = [],
  cur: { [key: string]: any } = {},
  queries: { [key: string]: any }[] = [],
  db: DBType,
  __: Debugger
): PopulateQuery[] => {
  // If cur.key is set, push the cur query to the array and reset cur
  const pushAndReset = () => {
    cur.key !== undefined && queries.push(cur)
    cur = {}
  }

  // Handle what key (either key or ref) to set the token to in the query
  let nextTokenType: TokenType = 'key'

  loop: while (tokenArr.length > 0) {
    const token = tokenArr.shift()

    switch (token) {
      // Start of reference type
      case '<':
        /* DEBUG */ __('--%s--, Opening ref', token)
        nextTokenType = 'ref'
        continue

      // End reference type
      case '>':
        /* DEBUG */ __('--%s--, Closing ref', token)
        nextTokenType = 'key'
        continue

      // Start population of array from a remote key
      case '(':
        /* DEBUG */ __('--%s--, Opening remote key', token)
        nextTokenType = 'remoteLocalComparisonKey'
        continue

      case ':':
        nextTokenType = 'remoteExternalKey'
        continue
      // End population of remote key
      case ')':
        /* DEBUG */ __('--%s--, Closing remote key', token)
        nextTokenType = 'key'
        continue

      // Start child queries
      case '[':
      case '{':
        /* DEBUG */ __(
          '--%s--, Opening %s, tokenArr, nextTokenType is %s',
          token,
          token === '[' ? 'array' : 'object',
          nextTokenType
        )
        cur.isArr = token === '[' ? true : false
        // cur.children = []
        cur.children = createQueries(tokenArr, {}, [], db, __.extend(cur.key))

        pushAndReset()

        continue

      // End child queries
      case ']':
      case '}':
        /* DEBUG */ __(
          '--%s--, Closing array or object, tokenArr, nextTokenType is %s, pushing query and resetting cur',
          token,
          nextTokenType
        )
        pushAndReset()
        break loop

      // token is a word, set it to the cur object
      default:
        /* DEBUG */ __(
          '--Default: %s--, Setting `%s` to %s',
          token,
          nextTokenType,
          token
        )
        // If the query already has a defined key, then push and reset the
        // current obj so as to not overwrite the key
        if (cur.key !== undefined) {
          __(
            '--- %s',
            cur.key.substr(cur.key.length - 1) === '.' ? 'true' : 'false'
          )
        }

        // Set the ref or key to the current token
        switch (nextTokenType) {
          case 'key':
          case 'remoteLocalComparisonKey':
          case 'remoteExternalKey':
            cur[nextTokenType] = token
            break
          case 'ref':
            cur[nextTokenType] = db.collections.get(token as string)
            break
        }

        // Continue the while loop when if there are:
        // - More tokens
        // - The next token is an array/object/remote opener
        // - The next token is a remote local or external key
        // - Or if we're still in a reference declaration (gets reset next token)
        if (
          tokenArr.length > 0 &&
          ((nextTokenType === 'key' &&
            (tokenArr[0] === '{' ||
              tokenArr[0] === '[' ||
              tokenArr[0] === '(')) ||
            nextTokenType === 'ref' ||
            nextTokenType === 'remoteExternalKey' ||
            nextTokenType === 'remoteLocalComparisonKey')
        )
          continue
        // Otherwise push the current object to the queries list and reset
        // the current object
        else pushAndReset()
    }
  }

  // Do a final push and reset before returning the queries
  pushAndReset()

  return queries as PopulateQuery[]
}

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
const ParseMemsPL = (
  query = '',
  rootCollection: DBCollectionType<any>,
  _: Debugger
): PopulateQuery[] => {
  const __ = _.extend('ParseMemsPL')
  const strArr = query.split('')

  // Split the input query into an array of tokens
  const tokens = tokenify(strArr)

  __('Parsed tokens: %O', tokens)

  // Convert the token array into a JS structure for querying later
  const queries = createQueries(
    tokens,
    {},
    [],
    rootCollection.db,
    __
  ) as PopulateQuery[]

  __('Parsed queries: %O', queries)

  return queries
}

const getKeyValue = <T>(doc: DBDocType<T>, key: string) => {
  switch (key) {
    case 'id':
    case '_updatedAt':
    case '_createdAt':
      return doc[key]
    default:
      return nestedKey(doc.data, key)
  }
}

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
 * @example populating the submissions key for a user where the author is equal to the users document ID
 * ```typescript
 * populate(`
 *   <submissions>(:author)submissions
 * `)
 * ```
 * @example populating the submissions key for a user where the author is equal to the username field on the users document
 * ```json
 * // Users
 * {
 *    "username": "string",
 * }
 * // Submissions
 * {
 *    "author": "string",
 *    "content": "string"
 * }
 * ```
 * ```typescript
 * populate(`
 *   <submissions>(username:author)submissions{
 *      content
 *   }
 * `)
 * ```
 * [[include:populate.md]]
 */
export const populate = <T>(
  rootCollection: DBCollectionType<T>,
  docs: DBDocType<T>[],
  populateQuery: string,
  filter = false
): DBDocType<T>[] => {
  const _ = rootCollection.col_.extend('populate')
  const parsed = ParseMemsPL(populateQuery, rootCollection, _)

  _('population formatted, running recursive populate')

  const filterDoc = (doc: DBDocType<any>, keys: string[]) => {
    const toRemove = Object.keys(doc.data).filter(key => !keys.includes(key))
    const pluginData = doc._pluginData.get('internal:cloned')
    toRemove.forEach(key => {
      delete pluginData[key]
    })
  }

  /**
   * A recursive function to populate documents down a tree
   * @param queries Populate query array to run
   * @param docsOrig Original document array to dupe, populate, then return
   */
  const runPopulate = (
    queries: PopulateQuery[],
    docsOrig: DBDocType<any>[],
    pop_: Debugger
  ) => {
    const runPop_ = pop_.extend(`<runPopulate>${v4()}`)
    // Duplicate all the original documents so as to avoid mutating the originals with references to the copies
    const duped = docsOrig.map(doc => doc.clone())
    /* DEBUG */ runPop_('Documents duped')

    const keysList: string[] = []
    queries.forEach(query => {
      keysList.push(query.key)
      if (query.remoteLocalComparisonKey !== undefined) keysList.push(query.remoteLocalComparisonKey)
    })

    runPop_('List of keys to keep on document: %O', keysList)

    const mapArray = (arr: any[], query: PopulateQuery) => arr.map((str: string) =>
      query.remoteExternalKey ? query.ref?.find(QueryBuilder.where(query.remoteExternalKey, '===', str)) : query.ref?.id(str)
    )

    const remoteLocalValOrID = <T>(keyVal: string, query: PopulateQuery) => query.remoteExternalKey ? (<DBCollectionType<T>>query.ref).find(QueryBuilder.where(query.remoteExternalKey, '===', keyVal)) : [query.ref?.id(keyVal)]

    // Go down the array of queries to populate documents
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i]

      /* DEBUG */ runPop_('Query picked, %d remaining', queries.length - i - 1)
      // Map over duped documents applying the populations to the correct key
      /* DEBUG */ runPop_(
        'Looping over duplicated docs to run population queries on'
      )
      duped.forEach(doc => {
        let nestedKeyVal: any
        if (query) {
          nestedKeyVal = getKeyValue(doc, query.remoteLocalComparisonKey || query.key)
        }

        /* DEBUG */ runPop_('nestedKeyVal Key: %s', query?.key)
        /* DEBUG */ runPop_('nestedKeyVal Val: %O', nestedKeyVal)

        if (!query) return;

        if (query.ref) {
          // Handle if there are child queries and there's a ref set
          if (query?.children) {
            // Handle whether the key to populate is an array or not
            if (query.isArr || Array.isArray(nestedKeyVal)) {
              let childDocs: any[] = []
              if (nestedKeyVal) {
                if (Array.isArray(nestedKeyVal)) {
                  childDocs = mapArray(nestedKeyVal, query)
                } else {
                  /* DEBUG */ runPop_('nestedKeyVal is not an array')
                  
                  childDocs = remoteLocalValOrID(nestedKeyVal, query)
                }
              } else if (query.remoteLocalComparisonKey && query.remoteExternalKey) {
                const localComparison = getKeyValue(doc, query.remoteLocalComparisonKey)
                childDocs = query.ref.find(QueryBuilder.where(query.remoteExternalKey, '===', localComparison))
              } else {
                /* DEBUG */ runPop_('No provided nestedKeyVal')
              }
              doc.set(
                query.key,
                runPopulate(query.children, childDocs, runPop_)
              )
            }
            // Otherwise set the key to the first result of a populate query
            else {
              /* DEBUG */ runPop_("Query isn't on an array")
              // Find the document
              const localComparison = query.remoteLocalComparisonKey ? getKeyValue(doc, query.remoteLocalComparisonKey) : nestedKeyVal
              let childDoc = query.remoteExternalKey ? query.ref?.find(QueryBuilder.where(query.remoteExternalKey, '===', localComparison)) : query.ref?.id(localComparison)

              if (!query.isArr && Array.isArray(childDoc)) {
                childDoc = childDoc[0]
              }

              // If the child document exists, run a population on it
              if (childDoc && (!Array.isArray(childDoc) || childDoc.length > 0)) {
                // Run runPopulate on it with the child queries
                const childPopulated = runPopulate(
                  query.children,
                  Array.isArray(childDoc) ? childDoc : [childDoc],
                  runPop_
                )

                // Set the key to the first result of the runPopulate if it exists
                if (childPopulated.length > 0)
                  doc.set(query.key, Array.isArray(childDoc) ? childPopulated : childPopulated[0])
              }
            }
          }
          // Handle populations of external documents with no added sub-queries
          else {
            /* DEBUG */ runPop_('No children')
            // Handle if the key is an array of ids or not
            if (query.isArr || Array.isArray(nestedKeyVal)) {
              doc.set(
                query.key,
                mapArray(nestedKeyVal, query)
              )
            }
            // Otherwise just do the single population
            else {
              const childDoc = remoteLocalValOrID(nestedKeyVal, query)

              if (childDoc) doc.set(query.key, childDoc)
            }
          }
        } else {
          /* DEBUG */ runPop_('No ref')
        }

        // if (query?.remote && query?.ref) {
        //   doc.set(
        //     query.key,
        //     query.ref.find(QueryBuilder.where(query.remote, '===', doc.id))
        //   )
        // }

        if (filter) {
          /* DEBUG */ runPop_('Removing unnecessary keys from document')
          filterDoc(doc, keysList)
        }
      })
      /* DEBUG */ runPop_('Finished looping over duplicated docs')
    }

    return duped
  }

  // Run the initial population
  const populated = runPopulate(parsed, docs, _)

  return populated
}
