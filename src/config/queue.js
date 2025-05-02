import queue from 'p-queue'

const modbusQueue = new queue({ concurrency: 1, interval: 100, intervalCap: 1 });

export default modbusQueue