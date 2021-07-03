import type { EventName, MemsDBEvent } from '@memsdb/types/events'

/**
 * @category Database Event
 */
export class EventHandler {
  /** Event type of this handler */
  eventType: EventName

  /**
   * Handler function for this event type.
   * This function will get called in order of addition to the DB
   */
  func: (event: MemsDBEvent) => void = () => {}

  /**
   * Create a new EventHandler to handle events in MemsDB
   * @param eventType MemsDB event type to be handled
   * @param func Function to run on event
   */
  constructor(eventType: EventName, func: (event: MemsDBEvent) => void) {
    this.eventType = eventType

    this.func = func
  }
}
