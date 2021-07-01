## Table of Contents

- [Table of Contents](#table-of-contents)
- [About](#about)
- [Install](#install)
- [IPCXMessage Structure](#ipcxmessage-structure)
- [IPCX](#ipcx)
  - [constructor](#constructor)
  - [register](#register)
  - [subscribe](#subscribe)
  - [publish](#publish)
  - [broadcast](#broadcast)
  - [trigger](#trigger)
- [Usage](#usage)
- [Important Notes](#important-notes)

## About

IPCX provides basic routing for interprocess communications. Child processes can communicate with the master process as well as other child processes using the IPCXMessage structure. The IPCX class provides convenient methods for pub/sub so that the master process doesn't have to use `process.on` and `process.send` to communicate with child processes. Only child processes use `process.send` and `process.on` to send and receive `IPCXMessage` messages as they are routed through a master IPCX instance.

## Install

```bash
npm i -S ipcx
```

## IPCXMessage Structure

Child processes that are registered with an IPCX instance should send interprocess messages using `process.send` and should have the following message structure.

| Property | Type     | Description                                                                                                                                          |
| -------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| source   | string   | The name of the process that sent the message                                                                                                        |
| targets  | []string | The names of the processes that the event should be routed to. Not providing any targets will result in the event being sent to all other processes. |
| event    | string   | The event name/identifier                                                                                                                            |
| payload  | Object   | A user-defined object that contains relevant event data                                                                                              |

```js
// Example IPCXMessage sending from a child process

// Send to specific processes
process.send({
  source: 'child1',
  targets: ['child2'], // send this event to 'child2'
  event: 'example',
  payload: {
    say: "hello"
    to: "world"
  }
});

// Send to all other processes
process.send({
  source: 'child1',
  targets: [], // not specifying any targets will send to all other processes
  event: 'example',
  payload: {
    say: "hello",
    to: "world"
  }
})
```

## IPCX

### constructor

```js
/**
 * Creates a new IPCX instance with the provided name.
 * @param {string} name - (required) The name of the IPCX instance
 * @throws {Error} - If name is not provided
 */

// Example usage
const ipcx = new IPCX('master');
```

### register

```js
/**
 * Registers a child process for the IPCX to route messages to.
 * @param {string} name - The name of the process
 * @param {ChildProcess} proc - The child process
 * @throws {Error} - If name is missing or conflicts with another registered process
 */

// Example usage
ipcx.register('name', process);
```

### subscribe

```js
/**
 * Subscribes this IPCX instance to an event received from child processes where the targets include this IPCX instance's name.
 * @param {String} event - Event name
 * @param {Function} callback - A callback function to execute for the event
 */

// Example usage
ipcx.subscribe('event', () => {
  // handle event
});
```

### publish

```js
/**
 * Send an event from this IPCX instance to the registered child processes with matching names.
 * @param {string} targets - (required) The names of the target child processes to route the event to.
 * @param {string} event - Event name
 * @param {Object} payload - Message payload
 */

// Example usage
ipcx.publish(['workerA', 'workerB'], 'event', {});
```

### broadcast

```js
/**
 * Broadcasts the event to all registered child processes.
 * @param {string} event - Event name
 * @param {Object} payload - Event payload to send
 */

// Example usage
ipcx.broadcast('event', {});
```

### trigger

```js
/**
 * Executes all callbacks for the event that the IPCX instance is subscribed to.
 * @param {string} event - Event name
 * @param {Object} payload - Event payload to send
 */

// Example usage
ipcx.trigger('event', {});
```

## Usage

```js
// workerA.js

// listen for messages from other processes
process.on("message", msg => {
  const {source, targets, event, payload} = msg
  console.log(`received event ${event} from ${source} with payload ${payload}`)
})
setTimeout(() => {
  process.send({
    source: 'workerA',
    targets: ['workerB'] // if target(s) not provided the event is sent all other processes
    event: 'test',
    payload: {}
  })
}, 1000)
```

```js
// workerB.js

// listen for messages from other processes
process.on("message", msg => {
  const {source, targets, event, payload} = msg
  console.log(`received event ${event} from ${source} with payload ${payload}`)
})
setTimeout(() => {
  process.send({
    source: 'workerB',
    targets: ['workerA'] // if no targets are provided the event is sent all other processes
    event: 'test',
    payload: {}
  })
}, 1000)
```

```js
// index.js

const MASTER = 'master'; //  name for master process
const WORKER_A = 'workerA'; // name for workerA.js worker
const WORKER_B = 'workerB'; // name for workerB.js worker

const cp = require('child_process');
const { IPCX } = require('ipcx');

const ipcx = new IPCX(MASTER);
// start child process workers
let workerA = cp.fork('./workerA.js');
let workerB = cp.fork('./workerB.js');

ipcx.register(WORKER_A, workerA); // register the worker with a unique name for proper routing
ipcx.register(WORKER_B, workerB); // register the worker with a unique name for proper routing
```

## Important Notes

- A process can be given any name. Name the master process and its children something that identifies their responsibilities. Define process names in a file as constants that the master and child processes will `require` so that the names can be managed in one place.
- Child processes that have been registered with an IPCX instance are automatcially unregistered when the child process exits.
- Do not create an IPCX instance in a child process unless it will be creating its own child processes. The children of a child process will not be able to communicate directly with master process, but with proper event handling forwarding events to the master process can be achieved.
- When sending an IPCXMessage from a child process, setting `targets` to an empty array will result in the event being broadcast to all other processes.
- When using the IPCX `subscribe` method, ensure the callback does not return a value (see next note).
- Callbacks passed to the `subscribe` method are wrapped in a Promise by IPCX. If the callback returns a value, it will be ignored. Do not expect the callbacks to be executed sequentially as they are run asynchronously.
