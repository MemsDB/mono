export type QueryHandlerFunction = (key: string, value: any, comparison: any) => boolean

export declare class QueryHandler {
  /** Event type of this handler */
  operator: string

  /**
   * Handler function for this event type.
   * This function will get called in order of addition to the DB
   */
  func: QueryHandlerFunction

  /**
   * Create a new EventHandler to handle events in MemsDB
   * @param eventType MemsDB event type to be handled
   * @param func Function to run on event
   */
  constructor(operator: string, func: QueryHandlerFunction)
}