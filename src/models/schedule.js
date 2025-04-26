const fs = require('fs').promises;
const path = require('path');
const logger = require('../config/logger');
const { toAppTimezone, getCurrentTime, dateFormat } = require('../config/timezone');
const { parse, isBefore, isAfter, isEqual, subMinutes, startOfMinute } = require('date-fns');
const blinkRelay = require("../utils/blink")
class Schedule {
    constructor(slaveId, relayNumber, startTime, endTime, recurrence = 'once', daysOfWeek = [], active = true, blink = false) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.slaveId = slaveId;
        this.relayNumber = relayNumber;
        this.startTime = startTime;
        this.endTime = endTime;
        this.recurrence = recurrence; // 'once', 'daily', 'weekly'
        this.daysOfWeek = daysOfWeek; // [0-6] for weekly recurrence (0 = Sunday)
        this.active = active;
        this.blink = blink;
        this.createdAt = getCurrentTime();
    }

    isActiveForDate(date) {
        if (!this.active) return false;

        // Convert input date to our timezone

        const targetTime = toAppTimezone(date);
        logger.debug('Converted time:', targetTime);
        
        // Check day of week for weekly recurrence
        if (this.recurrence === 'weekly') {
            const currentDay = new Date(date).toLocaleString('en-US', { 
                timeZone: process.env.TIMEZONE || 'Asia/Bangkok',
                weekday: 'numeric'
            });
            if (!this.daysOfWeek.includes(Number(currentDay))) {
                return false;
            }
        }

        const now = startOfMinute(parse(targetTime, dateFormat, new Date()));
        const start = startOfMinute(parse(this.startTime, dateFormat, new Date()));
        const end = startOfMinute(parse(this.endTime, dateFormat, new Date()));
    
    
        const isWithinRange = (isAfter(now, subMinutes(start, 1)) || isEqual(now, start)) && isBefore(now, end);
    
        return isWithinRange;
    }
}

class ScheduleManager {
    constructor() {
        this.schedules = new Map();
        this.storageFile = path.join(process.cwd(), 'data', 'schedules.json');
    }

    async init() {
        try {
            await fs.mkdir(path.dirname(this.storageFile), { recursive: true });
            // Create empty schedules file if it doesn't exist
            try {
                await fs.access(this.storageFile);
            } catch (err) {
                if (err.code === 'ENOENT') {
                    await fs.writeFile(this.storageFile, '[]', 'utf8');
                    logger.info('Created empty schedules file');
                }
            }
            await this.loadSchedules();
        } catch (err) {
            logger.error('Failed to initialize schedule manager', { error: err.message });
            // Initialize with empty Map instead of failing
            this.schedules = new Map();
        }
    }

    async loadSchedules() {
        try {
            const data = await fs.readFile(this.storageFile, 'utf8');
            let schedules = JSON.parse(data);
            
            // Convert plain objects to Schedule instances
            schedules = schedules.map(s => {
                const schedule = new Schedule(
                    s.slaveId,
                    s.relayNumber,
                    s.startTime,
                    s.endTime,
                    s.recurrence,
                    s.daysOfWeek,
                    s.active
                );
                schedule.id = s.id; // Preserve the original ID
                schedule.createdAt = s.createdAt; // Preserve creation time
                return schedule;
            });

            this.schedules.clear();
            schedules.forEach(schedule => {
                this.schedules.set(schedule.id, schedule);
            });
            logger.info('Schedules loaded from storage', { count: schedules.length });
        } catch (err) {
            logger.error('Failed to load schedules', { error: err.message });
            // Initialize with empty Map on error
            this.schedules.clear();
        }
    }

    async saveSchedules() {
        try {
            const data = JSON.stringify(Array.from(this.schedules.values()), null, 2);
            await fs.writeFile(this.storageFile, data, 'utf8');
            logger.info('Schedules saved to storage');
        } catch (err) {
            logger.error('Failed to save schedules', { error: err.message });
        }
    }

    addSchedule(slaveId, relayNumber, startTime, endTime, recurrence = 'once', daysOfWeek = [], active = true, blink = false) {
        // Find existing schedule for this slave and relay
        const existingSchedule = Array.from(this.schedules.values())
            .find(s => s.slaveId === slaveId && s.relayNumber === relayNumber);

        if (existingSchedule) {
            // Update existing schedule
            existingSchedule.startTime = startTime;
            existingSchedule.endTime = endTime;
            existingSchedule.recurrence = recurrence;
            existingSchedule.daysOfWeek = daysOfWeek;
            existingSchedule.blink = blink;
            existingSchedule.active = active;
            this.saveSchedules();
            logger.info('Updated existing schedule', { 
                slaveId, 
                relayNumber, 
                scheduleId: existingSchedule.id 
            });
            return existingSchedule;
        } else {
            // Create new schedule
            const schedule = new Schedule(slaveId, relayNumber, startTime, endTime, recurrence, daysOfWeek, active, blink);
            this.schedules.set(schedule.id, schedule);
            this.saveSchedules();
            logger.info('Created new schedule', { 
                slaveId, 
                relayNumber, 
                scheduleId: schedule.id 
            });
            return schedule;
        }
    }

    getSchedule(id) {
        return this.schedules.get(id);
    }

    getSchedulesForRelay(slaveId, relayNumber) {
        return Array.from(this.schedules.values())
            .filter(s => s.slaveId === slaveId && s.relayNumber === relayNumber);
    }

    getAllSchedules() {
        return Array.from(this.schedules.values());
    }

    updateSchedule(id, updates) {
        const schedule = this.schedules.get(id);
        if (!schedule) return null;

        Object.assign(schedule, updates);
        this.saveSchedules();
        return schedule;
    }

    deleteSchedule(id) {
        const deleted = this.schedules.delete(id);
        if (deleted) {
            this.saveSchedules();
        }
        return deleted;
    }

    getActiveSchedules(date = new Date()) {
        return Array.from(this.schedules.values())
            .filter(schedule => schedule.active);
    }
}

const scheduleManager = new ScheduleManager();
module.exports = scheduleManager;
