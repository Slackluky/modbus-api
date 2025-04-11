const modbusClient = require('../config/modbus');
const logger = require('../config/logger');
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

const setMultipleRelayStates = async (req, res) => {
    try {
        const slaveId = parseInt(req.params.slaveId);
        const states = req.body.states;

        if (isNaN(slaveId) || !modbusClient.getSlaveById(slaveId)) {
            logger.warn('Invalid slave ID requested', { slaveId });
            return res.status(400).json({ error: 'Invalid slave ID' });
        }

        if (!Array.isArray(states)) {
            logger.warn('Invalid states format', { states });
            return res.status(400).json({ error: 'States must be an array' });
        }

        await modbusClient.setMultipleRelayStates(slaveId, states);
        const response = {
            slaveId,
            states,
            slave: modbusClient.getSlaveById(slaveId)
        };
        logger.info('Set multiple relay states', response);
        res.json(response);
    } catch (err) {
        logger.error('Failed to set relay states', { 
            error: err.message,
            stack: err.stack,
            slaveId: req.params.slaveId,
            states: req.body.states
        });
        res.status(500).json({ error: 'Failed to set relay states', details: err.message });
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

        const schedule = await timerManager.setTimer(slaveId, relayNumber, startTime, endTime, recurrence, daysOfWeek);
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
    setRelayState,
    setMultipleRelayStates,
    setRelayTimer,
    clearRelayTimer,
    getRelayTimer,
    getAllTimers
};
