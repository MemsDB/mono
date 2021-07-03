import { runQuery, QueryBuilder } from './query'

import type { DBDoc, DBCollection } from '@memsdb/core'
import type { Query } from '@memsdb/types/query'

/**
 * Set a reactive query on a collection (should be run from the collection, not directly)
 * @ignore
 * @param collection Collection to update reactive index on
 * @param query Queries to run
 */
export const updateReactiveIndex = (
  collection: DBCollection,
  query: Query[] | QueryBuilder
) => {
  const ref = collection.reactiveIndexed.get(query) as { docs: DBDoc[] }

  ref.docs.length = 0
  ref.docs.push(...runQuery(query, collection, collection.docs))
}

/**
 * Create a new reactive index from a query array (should be run from the collection, not directly)
 * @ignore
 * @param collection Collection to create reactive index on
 * @param query Query array to perform
 */
export const createReactiveIndex = (
  collection: DBCollection,
  query: Query[] | QueryBuilder
) => {
  if (!collection.reactiveIndexed.has(query)) {
    const docs = runQuery(query, collection, collection.docs)
    collection.reactiveIndexed.set(query, { docs })
  }

  return collection.reactiveIndexed.get(query) as { docs: DBDoc[] }
}
