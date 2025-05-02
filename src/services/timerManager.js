import { logger } from '../config/logger.js';
import modbusClient from '../config/modbus.js';
import scheduleManager from '../models/schedule.js';
import { getCurrentTime } from '../config/timezone.js';
import delay from '../utils/delay.js';
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
        // Update relay state immediately

        // Add new schedule
        const schedule = scheduleManager.addSchedule(
            slaveId,
            relayNumber,
            startTime,
            endTime,
            recurrence,
            daysOfWeek
        );
        await this._updateRelayState(schedule);
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
        
        const activeSchedules = scheduleManager.getActiveSchedules();
        for (const schedule of activeSchedules) {
            await delay(50)
            await this._updateRelayState(schedule);
        }
    }

    async _updateRelayState(schedule) {
            const currentTime = getCurrentTime();
            const {slaveId, relayNumber, id} = schedule;
            const state = await modbusClient.readRelayState(slaveId, relayNumber)
            const shouldBeOn = schedule.isActiveForDate(currentTime);
            logger.info('Checking relay state', { slaveId, relayNumber, currentTime, shouldBeOn, schedule: schedule.id, endTime: schedule.endTime});
            
            // Only update if state has changed
            if ((!!state.data[0]) !== shouldBeOn) {
                try {
                    await modbusClient.setRelayState(slaveId, relayNumber, shouldBeOn);
                    scheduleManager.updateSchedule(id, {active: shouldBeOn})
                    logger.info('Timer changed relay state', { slaveId, relayNumber, state: shouldBeOn });
                } catch (err) {
                    logger.error('Failed to set relay state from timer', { 
                        error: err.message, 
                        slaveId,
                        relayNumber
                    });
                }
            } else {
                if (schedule.active !== shouldBeOn) {
                    scheduleManager.updateSchedule(id, {active: shouldBeOn})
                }
            }
    }

    async shutdown() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }


        // Turn off all relays that were managed by timers
        const timers = getAllTimers()
        const promises = timers.map(async ({active, slaveId, relayNumber}) => {
            if (active) { // Only turn off relays that are currently on
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
export default timerManager;
