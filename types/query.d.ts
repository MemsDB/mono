import type { QueryBuilder } from '@memsdb/utils'

/**
 * Available query operators
 */
export type Operators =
  | '<'
  | '>'
  | '<='
  | '>='
  | '==='
  | '||'
  | '&&'
  | 'includes'
  | 'isContainedIn'
  | 'hasAllOf'
  | 'all>than'
  | 'all<than'
  | 'all>=to'
  | 'all<=to'
  | 'all===to'
  | 'some>than'
  | 'some<than'
  | 'some>=to'
  | 'some<=to'
  | 'some===to'

/**
 * Query interface
 * @category Query
 */
export interface Query {
  /** Key to run the query on */
  key: string
  /** Inverse result requirement */
  inverse: boolean
  /** Operation to perform */
  operation: Operators
  /** Value to compare against */
  comparison: any | Query[] | QueryBuilder
  reactiveQuery?: boolean
}
