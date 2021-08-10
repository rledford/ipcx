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

IPCX provides basic routing for interprocess communications. Child processes can communicate with the master process as well as other child processes using `IPCXMessage` messages. The IPCX class provides methods for pub/sub so that the master process doesn't have to use `process.on` and `process.send` to communicate with child processes. Only child processes use `process.send` and `process.on` to send and receive `IPCXMessage` messages as they are routed through a master IPCX instance.

## Install

```bash
npm i -S ipcx
```

## IPCXMessage Structure

Child processes that are registered with an IPCX instance should send interprocess messages using `process.send` and should follow the `IPCXMessage` message structure.

| Property | Type       | Description                                                                                                                                                        |
| -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| src      | string     | The name of the source process that sent or is sending the event                                                                                                   |
| dest     | \[string\] | A list of destination process names that the event should be routed to. Not providing any destinations will result in the event being sent to all other processes. |
| event    | string     | The event name/identifier                                                                                                                                          |
| data     | Object     | A user-defined object that contains relevant event data                                                                                                            |

```js
// Example sending an IPCXMessage from a child process

// Send to specific processes
process.send({
  src: 'child1',
  dest: ['child2'], // send this event to 'child2'
  event: 'example',
  data: {
    say: "hello"
    to: "world"
  }
});

// Send to all other processes
process.send({
  src: 'child1',
  dest: [], // not specifying any destinations will send to all other processes
  event: 'example',
  data: {
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
const { IPCX } = require('ipcx'); // import IPCX class
const ipcx = new IPCX('master'); // create new instance of IPCX
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
const child_process = require('child_process');
const { IPCX } = require('ipcx'); // import IPCX class
const ipcx = new IPCX('master'); // create new instance of IPCX
const cp = child_process.for('<path-to-js-file>');
ipcx.register('example', cp);
```

### subscribe

```js
/**
 * Subscribes this IPCX instance to an event received from child processes where the dest include this IPCX instance's name.
 * @param {String} event - Event name
 * @param {Function} callback - A callback function to execute for the event
 */

// Example usage
const { IPCX } = require('ipcx'); // import IPCX class
const ipcx = new IPCX('master'); // create new instance of IPCX
ipcx.subscribe('event', () => {
  // handle event
});
```

### publish

```js
/**
 * Send an event from this IPCX instance to the registered child processes with matching names.
 * @param {string} dest - (required) The names of the target child processes to route the event to.
 * @param {string} event - Event name
 * @param {Object} data - Message data
 */

// Example usage
const { IPCX } = require('ipcx'); // import IPCX class
const ipcx = new IPCX('master'); // create new instance of IPCX
ipcx.publish(['workerA', 'workerB'], 'event', {});
```

### broadcast

```js
/**
 * Broadcasts the event to all registered child processes. The event and data args are packed into an IPCXMessage object before sending it's sent.
 * @param {string} event - Event name
 * @param {Object} data - Event data to send
 */

// Example usage
const { IPCX } = require('ipcx'); // import IPCX class
const ipcx = new IPCX('master'); // create new instance of IPCX
ipcx.broadcast('event', {});
```

### trigger

```js
/**
 * Executes all callbacks for the event that the IPCX instance is subscribed to.
 * @param {string} event - Event name
 * @param {Object} data - Event data to send
 */

// Example usage
const { IPCX } = require('ipcx'); // import IPCX class
const ipcx = new IPCX('master'); // create new instance of IPCX
ipcx.subscribe('event', () => {
  // handle event
});
ipcx.trigger('event', {}); // does not publish or broadcast to any other processes
```

## Usage

```js
// workerA.js

// listen for messages from other processes
process.on("message", msg => {
  const {src, dest, event, data} = msg
  console.log(`received event ${event} from ${src} with data ${data}`)
})
setTimeout(() => {
  process.send({
    src: 'workerA',
    dest: ['workerB'] // if target(s) not provided the event is sent all other processes
    event: 'test',
    data: {}
  })
}, 1000)
```

```js
// workerB.js

// listen for messages from other processes
process.on("message", msg => {
  const {src, dest, event, data} = msg
  console.log(`received event ${event} from ${src} with data ${data}`)
})
setTimeout(() => {
  process.send({
    src: 'workerB',
    dest: ['workerA'] // if no dest are provided the event is sent all other processes
    event: 'test',
    data: {}
  })
}, 1000)
```

```js
// index.js

const MASTER = 'master'; //  name for master process
const WORKER_A = 'workerA'; // name for workerA.js worker
const WORKER_B = 'workerB'; // name for workerB.js worker

const child_process = require('child_process');
const { IPCX } = require('ipcx'); // import IPCX class

const ipcx = new IPCX(MASTER); // create new instance of IPCX
// start child process workers
let workerA = child_process.fork('./workerA.js');
let workerB = child_process.fork('./workerB.js');

ipcx.register(WORKER_A, workerA); // register the worker with a unique name for proper routing
ipcx.register(WORKER_B, workerB); // register the worker with a unique name for proper routing

// send event to WORKER_A
ipcx.publish({
  src: MASTER,
  dest: [WORKER_A],
  event: 'event',
  data: {}
});

// send event to WORKER_A and WORKER_B
ipcx.publish({
  src: MASTER,
  dest: [WORKER_A, WORKER_B],
  event: 'event',
  data: {}
});

// sends event to WORKER_A and WORKER_B
ipcx.broadcast('event', {});
```

## Important Notes

- A process can be given any name. Name the master process and its children something that identifies their responsibilities. Define process names in a file as constants that the master and child processes will `require` so that the names can be managed in one place.
- Child processes that have been registered with an IPCX instance are automatcially unregistered when the child process exits.
- Do not create an IPCX instance in a child process unless it will be creating its own child processes. The children of a child process will not be able to communicate directly with master process, but with proper event handling forwarding events to the master process can be achieved.
- When sending an IPCXMessage from a child process, setting `dest` to an empty array will result in the event being broadcast to all other processes.
