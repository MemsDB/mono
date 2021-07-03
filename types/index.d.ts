import type { DBCollection } from './collection'

/** Base template of a schema/collection */
export interface SchemaTemplateType {
  /** Name of the collection schema */
  name: string
  /**
   * Structure of the collection. A key's value will be treated as
   * the default value for that key
   */
  structure: { [key: string]: any }
}

/**
 * Population specific query
 * @ignore
 */
export interface CustomPopulateQuery {
  /* Where on the source doc to compare to */
  srcField: string
  /* Where on the comparison doc to compare to */
  targetField: string
  /* Where to place the child documents matching this query */
  destinationField: string
  /* The collection to pull child documents from for this query */
  collection: DBCollection
}
