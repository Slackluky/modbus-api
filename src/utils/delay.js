
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const withTimeout = (promise, timeout = 5000) => {
    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => {
            // client.reconnect()
            reject(new Error('The Modbus device took too long to respond, please try again'))
        }, timeout)
    );
    return Promise.race([promise, timeoutPromise]);
};
export {delay, withTimeout}