'use strict';

import { ChildProcess } from 'child_process';
import { IPCXCallback } from './types/IPCXCallback';
import { IPCXMessage } from './types/IPCXMessage';

class IPCX {
  __name: string;
  __procs: Map<String, ChildProcess>;
  __subs: {
    [key: string]: IPCXCallback[];
  };
  /**
   * Creates a new IPCX instance with the provided name.
   * @param {string} name - (required) The name of the IPCX instance
   * @throws {Error} - If name is not provided
   */
  constructor(name: string) {
    if (!name) {
      throw new Error('name is invalid');
    }
    this.__name = name;
    this.__procs = new Map(); // name: process
    this.__subs = {}; // event: []callback
  }

  /**
   * Routes an IPCXMessage to the appropriate processes.
   * @param {IPCXMessage} msg - The message to route to appropriate processes
   */
  __route(msg: IPCXMessage) {
    if (msg.dest.length > 0) {
      for (let t of msg.dest)
        if (t === this.__name) {
          this.trigger(msg.event, msg.data);
        } else if (this.__procs.has(t)) {
          const p = this.__procs.get(t);
          if (p !== undefined) {
            p.send(msg);
          }
        } else {
          console.log(`target [ ${t} ] not registered`);
        }
    } else {
      // do not send to the process that sent the message
      if (msg.src !== this.__name) {
        this.trigger(msg.event, msg.data);
      }
      this.__procs.forEach((p, k) => {
        // do not send to the process that sent the message
        if (k !== msg.src) {
          p.send(msg);
        }
      });
    }
  }

  /**
   * Registers a child process for the IPCX to route messages to.
   * @param {string} name - The name of the process
   * @param {ChildProcess} proc - The child process
   * @throws {Error} - If name is missing or conflicts with another registered process
   */
  register(name: string, proc: ChildProcess) {
    if (!name) {
      throw new Error('name required');
    }
    if (name === this.__name) {
      throw new Error(
        'cannot register a child process with the same name as this IPCX'
      );
    }
    if (this.__procs.has(name)) {
      throw new Error(`[ ${name} ] is already registered`);
    }
    proc.on('exit', () => {
      console.log(
        `process ${proc.pid} [ ${name} ] exited - unregistering from IPCX`
      );
      this.__procs.delete(name);
    });
    this.__procs.set(name, proc);
    proc.on('message', this.__route.bind(this));
  }

  /**
   * Subscribes this IPCX instance to an event received from child processes where the dest include this IPCX instance's name.
   * @param {String} event - Event name
   * @param {Function} callback - A callback function to execute for the event
   */
  subscribe(event: string, callback: Function) {
    if (!this.__subs[event]) {
      this.__subs[event] = [];
    }
    this.__subs[event].push((data: Object) => {
      // wrap the callback in a promise
      return new Promise((res, rej) => {
        try {
          callback(data);
          res();
        } catch (err) {
          rej(err);
        }
      });
    });
  }

  /**
   * Send an event from this IPCX instance to the registered child processes with matching names.
   * @param {string} dest - (required) The names of the destination child processes to route the event to.
   * @param {string} event - Event name
   * @param {Object} data - Message data
   */
  publish(dest: [string], event: string, data: Object) {
    this.__route({
      src: this.__name,
      dest,
      event,
      data
    });
  }

  /**
   * Broadcasts the event to all registered child processes. The event and data args are packed into an {@link IPCXMessage} object before sending it's sent.
   * @param {string} event - Event name
   * @param {Object} data - Event data to send
   */
  broadcast(event = '', data = {}) {
    this.__route({
      src: this.__name,
      dest: [],
      event,
      data
    });
  }

  /**
   * Executes all callbacks for the event that the IPCX instance is subscribed to.
   * @param {string} event - Event name
   * @param {Object} data - Event data to send
   */
  trigger(event = '', data = {}) {
    if (this.__subs[event]) {
      for (const cb of this.__subs[event]) {
        cb(data).catch((err) => {
          console.log(
            `Error triggering callback for event [ ${event} ]:`,
            err.message
          );
        });
      }
    }
  }
}

export = IPCX;
