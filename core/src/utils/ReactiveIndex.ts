import { runQuery } from '../Query'

import type {
  DBDoc as DBDocType,
  DBCollection as DBCollectionType,
  Query as QueryType,
  QueryBuilder as QueryBuilderType,
} from '@memsdb/types'

/**
 * Set a reactive query on a collection (should be run from the collection, not directly)
 * @ignore
 * @param collection Collection to update reactive index on
 * @param query Queries to run
 */
export const updateReactiveIndex = <T>(
  collection: DBCollectionType<T>,
  query: QueryType[] | QueryBuilderType
) => {
  const ref = collection.reactiveIndexed.get(query) as { docs: DBDocType<T>[] }

  ref.docs.length = 0
  ref.docs.push(...runQuery(query, collection, collection.docs))
}

/**
 * Create a new reactive index from a query array (should be run from the collection, not directly)
 * @ignore
 * @param collection Collection to create reactive index on
 * @param query Query array to perform
 */
export const createReactiveIndex = <T>(
  collection: DBCollectionType<T>,
  query: QueryType[] | QueryBuilderType
) => {
  if (!collection.reactiveIndexed.has(query)) {
    const docs = runQuery(query, collection, collection.docs)
    collection.reactiveIndexed.set(query, { docs })
  }

  return collection.reactiveIndexed.get(query) as { docs: DBDocType<T>[] }
}
