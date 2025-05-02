import dotenv from 'dotenv';
import queue from './queue.js'
import delay from '../utils/delay.js'
import { logger } from './logger.js';
import ModbusRTU from 'modbus-serial';
dotenv.config();

class ModbusClient {
    constructor() {
        this.client = new ModbusRTU();
        this.isConnected = false;
        this.reconnectDelay = parseInt(process.env.MODBUS_RECONNECT_DELAY) || 5000;
        this.currentSlaveId = null;
        this.slaves = [{id:1}, {id:2}, {id:3}, {id:4}, {id:5}, {id:6}, {id:7}, {id:8}];
    }

    async connect() {
        try {
            await this.client.connectRTUBuffered(process.env.MODBUS_SERIAL_PORT, {
                baudRate: parseInt(process.env.MODBUS_BAUD_RATE),
                dataBits: parseInt(process.env.MODBUS_DATA_BITS),
                stopBits: parseInt(process.env.MODBUS_STOP_BITS),
                parity: process.env.MODBUS_PARITY
            });
            await this.client.setID(parseInt(process.env.MODBUS_DEVICE_ID));
            this.isConnected = true;
            console.log('Connected to Modbus device');

            // Set up error handler
            await this.client.on('error', this.handleError.bind(this));
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
            await queue.add(() => this.client.setID(slaveId));
            this.currentSlaveId = slaveId;
            await delay(50)
            logger.debug('Selected Modbus slave', { slaveId });
        }
    }

    async readRelayState(slaveId, relayNumber) {
        if (!this.isConnected) {
            throw new Error('Modbus client not connected');
        }
        await this.selectSlave(slaveId);
        await delay(50)
        return await this.client.readCoils(relayNumber - 1, 1);
    }

    async setRelayState(slaveId, relayNumber, state) {
        if (!this.isConnected) {
            throw new Error('Modbus client not connected');
        }
    
        try {
            console.log(`[setRelayState] rawr 🐯 - Starting for Slave ${slaveId}, Relay ${relayNumber}`);
            await this.selectSlave(slaveId);
            console.log(`[setRelayState] roar 🦁 - Slave selected: ${slaveId}`);
    
            const result = await queue.add(() => this.client.writeCoil(relayNumber - 1, state));
            console.log(`[setRelayState] ✅ writeCoil completed for Relay ${relayNumber}`, result);
            await delay(50)
            return result;
        } catch (err) {
            console.error(`[setRelayState] ❌ Error:`, err.message);
            throw err;
        }
    }    

    async setMultipleRelayStates(slaveId, states) {
        if (!this.isConnected) {
            throw new Error('Modbus client not connected');
        }
        await this.selectSlave(slaveId);
        return await queue.add(() => this.client.writeCoils(0, states));
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

export default modbusClient;
