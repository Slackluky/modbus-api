const fs = require('fs').promises;
const path = require('path');
const logger = require('../config/logger');
const { toAppTimezone, getCurrentTime } = require('../config/timezone');

class Schedule {
    constructor(slaveId, relayNumber, startTime, endTime, recurrence = 'once', daysOfWeek = [], active = true) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.slaveId = slaveId;
        this.relayNumber = relayNumber;
        this.startTime = startTime;
        this.endTime = endTime;
        this.recurrence = recurrence; // 'once', 'daily', 'weekly'
        this.daysOfWeek = daysOfWeek; // [0-6] for weekly recurrence (0 = Sunday)
        this.active = active;
        this.createdAt = getCurrentTime();
    }

    isActiveForDate(date) {
        if (!this.active) return false;

        const targetDate = new Date(toAppTimezone(date));
        
        // First check day of week for weekly recurrence
        if (this.recurrence === 'weekly' && !this.daysOfWeek.includes(targetDate.getDay())) {
            return false;
        }

        // Handle time checks based on recurrence type
        if (this.recurrence === 'once') {
            const start = new Date(this.startTime.includes('T') ? this.startTime : this.startTime.replace(' ', 'T'));
            const end = new Date(this.endTime.includes('T') ? this.endTime : this.endTime.replace(' ', 'T'));
            return targetDate >= start && targetDate <= end;
        } else {
            // For both daily and weekly, check time portion
            const [startHour, startMinute] = this.startTime.split(':').map(Number);
            const [endHour, endMinute] = this.endTime.split(':').map(Number);
            const targetHour = targetDate.getHours();
            const targetMinute = targetDate.getMinutes();

            // Convert all times to minutes for easier comparison
            const startTimeInMinutes = startHour * 60 + startMinute;
            const endTimeInMinutes = endHour * 60 + endMinute;
            const targetTimeInMinutes = targetHour * 60 + targetMinute;

            if (endTimeInMinutes >= startTimeInMinutes) {
                // Same day schedule (e.g., 09:00-17:00)
                return targetTimeInMinutes >= startTimeInMinutes && targetTimeInMinutes <= endTimeInMinutes;
            } else {
                // Overnight schedule (e.g., 22:00-06:00)
                return targetTimeInMinutes >= startTimeInMinutes || targetTimeInMinutes <= endTimeInMinutes;
            }
        }
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
            await this.loadSchedules();
        } catch (err) {
            logger.error('Failed to initialize schedule manager', { error: err.message });
        }
    }

    async loadSchedules() {
        try {
            const data = await fs.readFile(this.storageFile, 'utf8');
            const schedules = JSON.parse(data);
            this.schedules.clear();
            schedules.forEach(schedule => {
                this.schedules.set(schedule.id, schedule);
            });
            logger.info('Schedules loaded from storage', { count: schedules.length });
        } catch (err) {
            if (err.code !== 'ENOENT') {
                logger.error('Failed to load schedules', { error: err.message });
            }
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

    addSchedule(slaveId, relayNumber, startTime, endTime, recurrence = 'once', daysOfWeek = []) {
        const schedule = new Schedule(slaveId, relayNumber, startTime, endTime, recurrence, daysOfWeek);
        this.schedules.set(schedule.id, schedule);
        this.saveSchedules();
        return schedule;
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
            .filter(schedule => schedule.isActiveForDate(date));
    }
}

const scheduleManager = new ScheduleManager();
module.exports = scheduleManager;
