const modbusClient = require('../config/modbus');
const { apiLogger: logger } = require('../config/logger');
const timerManager = require('../services/timerManager');

const getSlaves = async (req, res) => {
    try {
        const slaves = modbusClient.getSlaves();
        logger.info('Retrieved slaves list', { slaves });
        res.json({ slaves });
    } catch (err) {
        logger.error('Failed to get slaves list', { error: err.message, stack: err.stack });
        res.status(500).json({ error: 'Failed to get slaves list', details: err.message });
    }
};

const getRelayState = async (req, res) => {
    try {
        const slaveId = parseInt(req.params.slaveId);
        const relayNumber = parseInt(req.params.number);

        if (isNaN(slaveId) || !modbusClient.getSlaveById(slaveId)) {
            logger.warn('Invalid slave ID requested', { slaveId });
            return res.status(400).json({ error: 'Invalid slave ID' });
        }

        if (isNaN(relayNumber) || relayNumber < 1) {
            logger.warn('Invalid relay number requested', { relayNumber });
            return res.status(400).json({ error: 'Invalid relay number' });
        }

        const data = await modbusClient.readRelayState(slaveId, relayNumber);
        const response = {
            slaveId,
            relay: relayNumber,
            state: data.data[0],
            slave: modbusClient.getSlaveById(slaveId)
        };
        logger.info('Read relay state', response);
        res.json(response);
    } catch (err) {
        logger.error('Failed to read relay state', { 
            error: err.message,
            stack: err.stack,
            slaveId: req.params.slaveId,
            relayNumber: req.params.number
        });
        res.status(500).json({ error: 'Failed to read relay state', details: err.message });
    }
};

const setRelayState = async (req, res) => {
    try {
        const slaveId = parseInt(req.params.slaveId);
        const relayNumber = parseInt(req.params.number);
        const state = req.body.state === true;

        if (isNaN(slaveId) || !modbusClient.getSlaveById(slaveId)) {
            logger.warn('Invalid slave ID requested', { slaveId });
            return res.status(400).json({ error: 'Invalid slave ID' });
        }

        if (isNaN(relayNumber) || relayNumber < 1) {
            logger.warn('Invalid relay number requested', { relayNumber });
            return res.status(400).json({ error: 'Invalid relay number' });
        }

        await modbusClient.setRelayState(slaveId, relayNumber, state);
        const response = {
            slaveId,
            relay: relayNumber,
            state,
            slave: modbusClient.getSlaveById(slaveId)
        };
        logger.info('Set relay state', response);
        res.json(response);
    } catch (err) {
        logger.error('Failed to set relay state', { 
            error: err.message,
            stack: err.stack,
            slaveId: req.params.slaveId,
            relayNumber: req.params.number,
            state: req.body.state
        });
        res.status(500).json({ error: 'Failed to set relay state', details: err.message });
    }
};

// Set timer for a relay
const setRelayTimer = async (req, res) => {
    try {
        const slaveId = parseInt(req.params.slaveId);
        const relayNumber = parseInt(req.params.number);
        const { startTime, endTime, recurrence = 'once', daysOfWeek = [] } = req.body;

        if (isNaN(slaveId) || !modbusClient.getSlaveById(slaveId)) {
            logger.warn('Invalid slave ID requested', { slaveId });
            return res.status(400).json({ error: 'Invalid slave ID' });
        }

        if (isNaN(relayNumber) || relayNumber < 1) {
            logger.warn('Invalid relay number requested', { relayNumber });
            return res.status(400).json({ error: 'Invalid relay number' });
        }

        if (!startTime || !endTime) {
            logger.warn('Missing start or end time', { startTime, endTime });
            return res.status(400).json({ error: 'Start time and end time are required' });
        }

        if (!['once', 'daily', 'weekly'].includes(recurrence)) {
            logger.warn('Invalid recurrence type', { recurrence });
            return res.status(400).json({ error: 'Invalid recurrence type. Must be one of: once, daily, weekly' });
        }

        if (recurrence === 'weekly' && (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0)) {
            logger.warn('Missing days of week for weekly recurrence', { daysOfWeek });
            return res.status(400).json({ error: 'Days of week are required for weekly recurrence' });
        }

        const schedule = await withTimeout(timerManager.setTimer(slaveId, relayNumber, startTime, endTime, recurrence, daysOfWeek));
        logger.info('Timer set successfully', {...schedule, status: 'success'});
        res.json({...schedule, status: 'success'});
    } catch (err) {
        logger.error('Failed to set timer', { 
            error: err.message,
            stack: err.stack,
            slaveId: req.params.slaveId,
            relayNumber: req.params.number,
            ...req.body
        });
        res.status(500).json({ error: 'Failed to set timer', details: err.message });
    }
};
const withTimeout = (promise, timeout = 5000) => {
    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('The Modbus device took too long to respond, please try again')), timeout)
    );
    return Promise.race([promise, timeoutPromise]);
};
// Set multiple timers for relays
const setRelayTimers = async (req, res) => {
    logger.debug(`Calling setTimer for index result`);
    try {
        const timers = req.body.timers;
        if (!Array.isArray(timers) || timers.length === 0) {
            logger.warn('Timers array is required and must not be empty');
            return res.status(400).json({ error: 'Timers array is required and must not be empty' });
        }

        const results = [];

        for (let index = 0; index < timers.length; index++) {
            const timer = timers[index];
            logger.debug(`Calling setTimer for index ${index}...`);
        
            try {
                const {
                    slaveId,
                    relayNumber,
                    startTime,
                    endTime,
                    recurrence = 'once',
                    daysOfWeek = []
                } = timer;
        
                // Validation checks
                if (isNaN(slaveId) || !modbusClient.getSlaveById(slaveId)) {
                    const msg = `Invalid slave ID at index ${index}`;
                    logger.warn(msg, { slaveId });
                    throw new Error(msg);
                }
        
                if (isNaN(relayNumber) || relayNumber < 1) {
                    const msg = `Invalid relay number at index ${index}`;
                    logger.warn(msg, { relayNumber });
                    throw new Error(msg);
                }
        
                if (!startTime || !endTime) {
                    const msg = `Missing start or end time at index ${index}`;
                    logger.warn(msg, { startTime, endTime });
                    throw new Error(msg);
                }
        
                if (!['once', 'daily', 'weekly'].includes(recurrence)) {
                    const msg = `Invalid recurrence type at index ${index}`;
                    logger.warn(msg, { recurrence });
                    throw new Error(msg);
                }
        
                if (recurrence === 'weekly' && (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0)) {
                    const msg = `Missing days of week for weekly recurrence at index ${index}`;
                    logger.warn(msg, { daysOfWeek });
                    throw new Error(msg);
                }
        
                // Call to set timer
                logger.debug(`Calling setTimer for index ${index}...`);
                const schedule = await withTimeout(
                    timerManager.setTimer(
                        slaveId,
                        relayNumber,
                        startTime,
                        endTime,
                        recurrence,
                        daysOfWeek
                    ),
                    1000 // Set timeout duration (e.g., 10000ms = 10 seconds)
                );
        
                // Success
                logger.info('Timer set successfully', { ...schedule, status: 'success', index });
                results.push({ ...schedule, status: 'fulfilled', index });
            } catch (err) {
                // Handle error
                logger.error(`Failed to set timer at index ${index}`, {
                    error: err.message,
                    index
                });
                results.push({ error: err.message, index, status: 'rejected' });
            }
        }
        
        const successful = results.filter(r => r.status === 'fulfilled').map(r => r);
        const failed = results.filter(r => r.status === 'rejected').map((r, i) => ({
            error: r.error,
            index: i
        }));

        res.json({ successful, failed });
    } catch (err) {
        logger.error('Failed to set timers', {
            error: err.message,
            stack: err.stack,
            body: req.body
        });
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
};


// Clear timer for a relay
const clearRelayTimer = async (req, res) => {
    try {
        const { scheduleId } = req.params;
        
        if (!scheduleId) {
            logger.warn('Missing schedule ID');
            return res.status(400).json({ error: 'Schedule ID is required' });
        }

        const deleted = await timerManager.clearTimer(scheduleId);
        if (!deleted) {
            return res.status(404).json({ error: 'No schedule found with the given ID' });
        }

        logger.info('Timer cleared successfully', { scheduleId });
        res.json({ message: 'Timer cleared successfully' });
    } catch (err) {
        logger.error('Failed to clear timer', { 
            error: err.message,
            stack: err.stack,
            scheduleId: req.params.scheduleId
        });
        res.status(500).json({ error: 'Failed to clear timer', details: err.message });
    }
};

// Get timers for a relay
const getRelayTimer = async (req, res) => {
    try {
        const slaveId = parseInt(req.params.slaveId);
        const relayNumber = parseInt(req.params.number);

        if (isNaN(slaveId) || !modbusClient.getSlaveById(slaveId)) {
            logger.warn('Invalid slave ID requested', { slaveId });
            return res.status(400).json({ error: 'Invalid slave ID' });
        }

        if (isNaN(relayNumber) || relayNumber < 1) {
            logger.warn('Invalid relay number requested', { relayNumber });
            return res.status(400).json({ error: 'Invalid relay number' });
        }

        const schedules = timerManager.getTimers(slaveId, relayNumber);
        logger.info('Timers retrieved successfully', { count: schedules.length });
        res.json({ schedules });
    } catch (err) {
        logger.error('Failed to get timers', { 
            error: err.message,
            stack: err.stack,
            slaveId: req.params.slaveId,
            relayNumber: req.params.number
        });
        res.status(500).json({ error: 'Failed to get timers', details: err.message });
    }
};

// Get all timers
const getAllTimers = async (req, res) => {
    try {
        const timers = timerManager.getAllTimers();
        logger.info('Retrieved all timers', { count: timers.length });
        res.json({ timers });
    } catch (err) {
        logger.error('Failed to get all timers', { 
            error: err.message,
            stack: err.stack
        });
        res.status(500).json({ error: 'Failed to get all timers', details: err.message });
    }
};

module.exports = {
    getSlaves,
    getRelayState,
    setRelayTimers,
    setRelayState,
    setRelayTimer,
    clearRelayTimer,
    getRelayTimer,
    getAllTimers
};
