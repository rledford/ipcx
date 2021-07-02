const ipcx = require('../dist');
const cp = require('child_process');
const ipc = new ipcx.IPCX('master');
const interval = 0;

ipc.subscribe('trigger', () => {
  console.log('IPC got trigger');
});
ipc.subscribe('test', () => {
  console.log('IPC got test');
});
ipc.subscribe('test2', () => {
  console.log('IPC got test2');
});

ipc.trigger('trigger', {}); // test trigger

c1 = cp.fork('./test/child1.js', [interval]);
c2 = cp.fork('./test/child2.js', [interval]);
ipc.register('child1', c1);
ipc.register('child2', c2);
