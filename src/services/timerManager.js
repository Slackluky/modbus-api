const logger = require('../config/logger');
const modbusClient = require('../config/modbus');
const scheduleManager = require('../models/schedule');
const { parse, isAfter, isEqual, isBefore } = require('date-fns');
const { getCurrentTime, dateFormat } = require('../config/timezone');
class TimerManager {
    constructor() {
        this.relayStates = new Map(); // Map of slaveId_relayNumber -> current state
        this.checkInterval = null;
    }

    async init() {
        await scheduleManager.init();
        this.startScheduleChecker();
        process.on('SIGTERM', () => this.shutdown());
        process.on('SIGINT', () => this.shutdown());
    }

    getKey(slaveId, relayNumber) {
        return `${slaveId}_${relayNumber}`;
    }

    async setTimer(slaveId, relayNumber, startTime, endTime, recurrence = 'once', daysOfWeek = []) {
        // Validate inputs
        if (recurrence === 'weekly' && (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0)) {
            throw new Error('Days of week must be specified for weekly recurrence');
        }

        // Add new schedule
        const schedule = scheduleManager.addSchedule(
            slaveId,
            relayNumber,
            startTime,
            endTime,
            recurrence,
            daysOfWeek
        );
        const now = parse(getCurrentTime(), dateFormat, new Date());
        const start = parse(startTime, dateFormat, new Date());
        const end = parse(startTime, dateFormat, new Date());
    
        const isWithinRange = (isAfter(now, start) || isEqual(now, start)) && isBefore(now, end);
        await modbusClient.setRelayState(slaveId, relayNumber, isWithinRange);
        this.relayStates.set(this.getKey(slaveId, relayNumber), true);
        // Update relay state immediately
        await this._updateRelayState(slaveId, relayNumber);

        logger.info('Timer set', { 
            slaveId, 
            relayNumber, 
            startTime, 
            endTime, 
            recurrence,
            daysOfWeek
        });

        return schedule;
    }
    async clearTimer(scheduleId) {
        const deleted = scheduleManager.deleteSchedule(scheduleId);
        if (deleted) {
            logger.info('Timer cleared', { scheduleId });
        }
        return deleted;
    }

    getTimers(slaveId, relayNumber) {
        return scheduleManager.getSchedulesForRelay(slaveId, relayNumber);
    }

    getAllTimers() {
        return scheduleManager.getAllSchedules();
    }

    startScheduleChecker() {
        // Check states every minute
        this.checkInterval = setInterval(() => this._checkAllRelayStates(), 30 * 1000);
        // Run initial check
        this._checkAllRelayStates();
    }

    async _checkAllRelayStates() {
        
        const activeSchedules = scheduleManager.getAllSchedules();
        const relayKeys = new Set(activeSchedules.map(s => this.getKey(s.slaveId, s.relayNumber)));
        console.log({relayKeys, activeSchedules})   
        for (const key of relayKeys) {
            const [slaveId, relayNumber] = key.split('_').map(Number);
            await this._updateRelayState(slaveId, relayNumber);
        }
    }

    async _updateRelayState(slaveId, relayNumber) {

            const key = this.getKey(slaveId, relayNumber);
            const schedules = scheduleManager.getSchedulesForRelay(slaveId, relayNumber);
            const currentTime = getCurrentTime();
            const state = await modbusClient.readRelayState(slaveId, relayNumber)
            const shouldBeOn = schedules.some(schedule => schedule.isActiveForDate(currentTime));
            console.log({shouldBeOn, target: {slaveId, relayNumber}, state: state.data[0]})
            logger.debug('Checking relay state', { slaveId, relayNumber, currentTime, shouldBeOn });
            
            // Only update if state has changed
            if ((!!state.data[0]) !== shouldBeOn) {
                try {
                    await modbusClient.setRelayState(slaveId, relayNumber, shouldBeOn);
                    this.relayStates.set(key, shouldBeOn);
                    logger.info('Timer changed relay state', { slaveId, relayNumber, state: shouldBeOn });
                } catch (err) {
                    logger.error('Failed to set relay state from timer', { 
                        error: err.message, 
                        slaveId,
                        relayNumber
                    });
                }
            }
    }

    async shutdown() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }


        // Turn off all relays that were managed by timers
        const promises = Array.from(this.relayStates.entries()).map(async ([key, state]) => {
            if (state) { // Only turn off relays that are currently on
                const [slaveId, relayNumber] = key.split('_').map(Number);
                try {
                    await modbusClient.setRelayState(slaveId, relayNumber, false);
                    logger.info('Relay turned off during shutdown', { slaveId, relayNumber });
                } catch (err) {
                    logger.error('Failed to turn off relay during shutdown', { 
                        error: err.message,
                        slaveId,
                        relayNumber
                    });
                }
            }
        });

        await Promise.all(promises);
        logger.info('Timer manager shutting down');
    }
}

// Create and export singleton instance
const timerManager = new TimerManager();
module.exports = timerManager;
