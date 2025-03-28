const DEFAULT_TIMEZONE = 'Asia/Bangkok'; // UTC+7

module.exports = {
    DEFAULT_TIMEZONE,
    // Helper function to convert date to the application timezone
    toAppTimezone: (date) => {
        return new Date(new Date(date).toLocaleString('en-US', { timeZone: DEFAULT_TIMEZONE }));
    },
    // Helper function to get current time in the application timezone as a Date object
    getCurrentTime: () => {
        return new Date(new Date().toLocaleString('en-US', { timeZone: DEFAULT_TIMEZONE, hour12: false }));
    },
    // Helper function to get current time in the application timezone as a Date object
    getCurrentDate: () => {
        return new Date(new Date().toLocaleString('en-US', { timeZone: DEFAULT_TIMEZONE, hour12: false }));
    }
};
