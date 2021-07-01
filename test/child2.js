var rcvCount = 0;
const interval = Number.parseInt(process.argv[2]) || 0;
setInterval(() => {
  console.log('child2 msg count:', rcvCount);
  rcvCount = 0;
}, 1000);

process.on('message', () => {
  rcvCount++;
  // console.log('child2 received event', msg.event, 'from', msg.src);
});

setInterval(() => {
  process.send({
    src: 'child2',
    dest: ['master'],
    event: 'test2',
    data: {}
  });
}, 5000);

setInterval(() => {
  for (let i = 0; i < 25; i++) {
    process.send({
      src: 'child2',
      dest: ['child1'],
      event: 'test',
      data: {
        timestamp: new Date()
      }
    });
  }
  // process.exit(0);
}, interval);
