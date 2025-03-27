require('dotenv').config();
const ModbusRTU = require('modbus-serial');
const logger = require('./logger');

class ModbusClient {
    constructor() {
        this.client = new ModbusRTU();
        this.isConnected = false;
        this.reconnectDelay = parseInt(process.env.MODBUS_RECONNECT_DELAY) || 5000;
        this.currentSlaveId = null;
    }

    async connect() {
        try {
            await this.client.connectRTUBuffered(process.env.MODBUS_SERIAL_PORT, {
                baudRate: parseInt(process.env.MODBUS_BAUD_RATE),
                dataBits: parseInt(process.env.MODBUS_DATA_BITS),
                stopBits: parseInt(process.env.MODBUS_STOP_BITS),
                parity: process.env.MODBUS_PARITY
            });
            await this.selectSlave(parseInt(process.env.MODBUS_DEVICE_ID));
            this.isConnected = true;
            console.log('Connected to Modbus device');

            // Set up error handler
            this.client.on('error', this.handleError.bind(this));
        } catch (err) {
            console.error('Error connecting to Modbus:', err);
            this.isConnected = false;
            // Attempt to reconnect after delay
            setTimeout(() => this.connect(), this.reconnectDelay);
        }
    }

    handleError(err) {
        logger.error('Modbus connection error:', { error: err.message, stack: err.stack });
        this.isConnected = false;
        this.currentSlaveId = null;
        this.connect();
    }

    async selectSlave(slaveId) {
        if (!this.isConnected) {
            throw new Error('Modbus client not connected');
        }

        // Only change slave ID if it's different from current
        if (this.currentSlaveId !== slaveId) {
            await this.client.setID(slaveId);
            this.currentSlaveId = slaveId;
            logger.debug('Selected Modbus slave', { slaveId });
        }
    }

    async readRelayState(slaveId, relayNumber) {
        if (!this.isConnected) {
            throw new Error('Modbus client not connected');
        }
        await this.selectSlave(slaveId);
        return await this.client.readCoils(relayNumber - 1, 1);
    }

    async setRelayState(slaveId, relayNumber, state) {
        if (!this.isConnected) {
            throw new Error('Modbus client not connected');
        }
        await this.selectSlave(slaveId);
        return await this.client.writeCoil(relayNumber - 1, state);
    }

    async setMultipleRelayStates(slaveId, states) {
        if (!this.isConnected) {
            throw new Error('Modbus client not connected');
        }
        await this.selectSlave(slaveId);
        return await this.client.writeCoils(0, states);
    }

    getSlaves() {
        return this.slaves;
    }

    getSlaveById(slaveId) {
        return this.slaves.find(s => s.id === slaveId);
    }

    async close() {
        if (this.isConnected && this.client) {
            try {
                await this.client.close();
                logger.info('Modbus connection closed properly');
            } catch (err) {
                logger.error('Error closing Modbus connection:', { error: err.message, stack: err.stack });
            } finally {
                this.isConnected = false;
            }
        }
    }
}

// Create and export a single instance
const modbusClient = new ModbusClient();

// Handle process termination signals
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received. Closing Modbus connection...');
    await modbusClient.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('SIGINT received. Closing Modbus connection...');
    await modbusClient.close();
    process.exit(0);
});

module.exports = modbusClient;
