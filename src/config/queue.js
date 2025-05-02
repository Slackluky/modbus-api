import queue from 'p-queue'

const modbusQueue = new queue({ concurrency: 1, interval: 50, intervalCap: 1 });

export default modbusQueue