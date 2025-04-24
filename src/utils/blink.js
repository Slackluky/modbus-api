const modbusClient = require('../config/modbus');
module.exports = async function blinkRelay(slaveId, relayNumber, duration = 500) {
    try {
        console.debug(`[BLINK] Starting blink for Slave ${slaveId}, Relay ${relayNumber}`);
        await modbusClient.setRelayState(slaveId, relayNumber, true);
        await new Promise(res => setTimeout(res, duration));
        await modbusClient.setRelayState(slaveId, relayNumber, false);
        console.debug(`[BLINK] Completed blink for Slave ${slaveId}, Relay ${relayNumber}`);
    } catch (err) {
        console.error(`[BLINK] Error blinking relay`, err);
    }
};