"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventHandler = void 0;
/**
 * @category Database Event
 */
class EventHandler {
    /**
     * Create a new EventHandler to handle events in MemsDB
     * @param eventType MemsDB event type to be handled
     * @param func Function to run on event
     */
    constructor(eventType, func) {
        /**
         * Handler function for this event type.
         * This function will get called in order of addition to the DB
         */
        this.func = () => { };
        this.eventType = eventType;
        this.func = func;
    }
}
exports.EventHandler = EventHandler;
//# sourceMappingURL=DBEventHandler.js.map