const DEFAULT_TIMEZONE = process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone;
const { format } = require('date-fns');
const { formatInTimeZone } = require('date-fns-tz');

module.exports = {
    DEFAULT_TIMEZONE,
    // Helper function to convert date to the application timezone
    toAppTimezone: (date) => {
        const dateObj = new Date(date);
        return formatInTimeZone(dateObj, DEFAULT_TIMEZONE, 'yyyy-MM-dd HH:mm');
    },
    // Helper function to get current time in the application timezone
    getCurrentTime: () => {
        const now = new Date();
        return formatInTimeZone(now, DEFAULT_TIMEZONE, 'yyyy-MM-dd HH:mm');
    },
    // Helper function to get current time in ISO format with correct timezone
    getCurrentTimeISO: () => {
        const now = new Date();
        return formatInTimeZone(now, DEFAULT_TIMEZONE, 'yyyy-MM-dd HH:mm');
    }
};
