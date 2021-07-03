'use strict';

import { ChildProcess } from 'child_process';
import { IPCXCallback } from './types/IPCXCallback';
import { IPCXMessage } from './types/IPCXMessage';

const groups: Map<string, Set<number>> = new Map(); // {group: [ pid ]}
const procs: Map<number, ChildProcess> = new Map();
const subs: Map<string, IPCXCallback[]> = new Map(); // {event: [ callback ]}

function route(msg: IPCXMessage) {
  if (msg.dest.length > 0) {
    for (const group of msg.dest) {
      if (groups.has(group)) {
        for (const pid of groups.get(group)) {
          if (pid !== process.pid && procs.has(pid)) {
            procs.get(pid).send(msg);
          }
        }
      }
    }
  } else {
    // no dest - broadcast to all other procs
    if (msg.pid !== process.pid) {
      trigger(msg.event, msg.data);
    }
    for (const [_, proc] of procs.entries()) {
      if (msg.pid !== proc.pid) {
        proc.send(msg);
      }
    }
  }
}

function unregister(pid: number) {
  if (procs.has(pid)) {
    procs.delete(pid);
  }
  for (const [_, pids] of groups.entries()) {
    pids.delete(pid);
  }
}

export function register(proc: ChildProcess, ...group: string[]) {
  if (!procs.get(proc.pid)) {
    procs.set(proc.pid, proc);
    proc.on('exit', () => {
      console.log(`IPCX :: Process ${proc.pid} exited - unregistering`);
      unregister(proc.pid);
    });
  }
  for (const g of group) {
    if (!groups.has(g)) {
      groups.set(g, new Set());
    }
    groups.get(g).add(proc.pid);
  }
}

export function on(event: string, cb: Function) {
  if (!subs.has(event)) {
    subs.set(event, []);
  }
  subs.get(event).push((data) => {
    return new Promise((resolve) => {
      try {
        cb(data);
      } catch (err) {
        console.log(`IPCX :: Error handling event ${event} - ${err.message}`);
      }
      resolve();
    });
  });
}

export function send(event: string, data: any) {
  process.send({
    pid: process.pid,
    dest: [],
    event,
    data
  });
}

export function publish(event: string, data: any, dest: string[]) {
  route({
    pid: process.pid,
    dest,
    event,
    data
  });
}

export function broadcast(event: string, data: any) {
  route({
    pid: process.pid,
    dest: [],
    event,
    data
  });
}

export function trigger(event: string, data: any) {
  if (subs.has(event)) {
    for (const c of subs.get(event)) {
      c(data);
    }
  }
}
