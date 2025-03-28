const DEFAULT_TIMEZONE = process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone;
const { format } = require('date-fns');
module.exports = {
    DEFAULT_TIMEZONE,
    // Helper function to convert date to the application timezone
    toAppTimezone: (date) => {
        const date = new Date(date);
        return format(date, 'yyyy-MM-dd HH:mm', { 
            timeZone: DEFAULT_TIMEZONE
        });
    },
    // Helper function to get current time in the application timezone
    getCurrentTime: () => {
        const now = new Date();
        return format(now, 'yyyy-MM-dd HH:mm', { 
            timeZone: DEFAULT_TIMEZONE
        });
    },
    // Helper function to parse a time string to minutes
    timeToMinutes: (timeString) => {
        const [hour, minute] = timeString.split(':').map(Number);
        return hour * 60 + minute;
    },
    // Helper function to convert minutes back to time string
    minutesToTime: (minutes) => {
        const hour = Math.floor(minutes / 60);
        const minute = minutes % 60;
        return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    }
};
