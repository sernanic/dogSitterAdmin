interface EventCallbacks {
  [id: string]: Function;
}

interface Events {
  [eventName: string]: EventCallbacks;
}

/**
 * Simple event emitter for cross-component communication
 */
const EventRegister = {
  events: {} as Events,
  
  /**
   * Register an event listener
   * @param eventName The name of the event to listen for
   * @param callback Function to call when event is emitted
   * @returns ID that can be used to remove the listener
   */
  addEventListener: (eventName: string, callback: Function): string => {
    const id = Math.random().toString(36).substring(2, 15);
    if (!EventRegister.events[eventName]) {
      EventRegister.events[eventName] = {};
    }
    EventRegister.events[eventName][id] = callback;
    return id;
  },
  
  /**
   * Remove an event listener by its ID
   * @param id The ID returned from addEventListener
   */
  removeEventListener: (id: string): void => {
    for (const eventName in EventRegister.events) {
      if (EventRegister.events[eventName][id]) {
        delete EventRegister.events[eventName][id];
      }
    }
  },
  
  /**
   * Emit an event with optional data
   * @param eventName The name of the event to emit
   * @param data Optional data to pass to listeners
   */
  emit: (eventName: string, data?: any): void => {
    if (EventRegister.events[eventName]) {
      Object.keys(EventRegister.events[eventName]).forEach(id => {
        EventRegister.events[eventName][id](data);
      });
    }
  }
};

export default EventRegister; 