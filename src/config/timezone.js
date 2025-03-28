const DEFAULT_TIMEZONE = process.env.TIMEZONE || 'Asia/Bangkok'; // Default to UTC+7 if not specified

module.exports = {
    DEFAULT_TIMEZONE,
    // Helper function to convert date to the application timezone
    toAppTimezone: (date) => {
        return new Date(date).toLocaleString('en-US', { 
            timeZone: DEFAULT_TIMEZONE,
            hour12: false,
            hour: '2-digit',
            minute: '2-digit'
        });
    },
    // Helper function to get current time in the application timezone
    getCurrentTime: () => {
        return new Date().toLocaleString('en-US', { 
            timeZone: DEFAULT_TIMEZONE,
            hour12: false,
            hour: '2-digit',
            minute: '2-digit'
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
