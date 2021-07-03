import type { DBCollection } from '../collection'
import type { CustomPopulateQuery } from '../types'
import type { QueryBuilder } from '../utils/query'
import type { Query } from './query'

export interface DocumentCustomPopulateOpts {
  srcField: string
  targetField?: string
  targetCol: DBCollection
  query?: Query[] | QueryBuilder
  destinationField?: string
  unwind?: boolean
}

export interface DocumentTreeOpts {
  populations?: CustomPopulateQuery[]
  maxDepth?: number
  currentDepth?: number
}
