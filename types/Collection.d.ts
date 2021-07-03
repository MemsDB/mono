import type { QueryBuilder } from '../utils/query'
import type { Query } from './query'

export interface CollectionFindOpts {
  queries?: Query[] | QueryBuilder
  reactive?: boolean
}

export interface CollectionInsertOpts {
  doc: { [key: string]: any }
  id?: string
  reactiveUpdate?: boolean
}

export interface CollectionInsertManyOpts extends CollectionInsertOpts {
  doc: { [key: string]: any }[]
}
