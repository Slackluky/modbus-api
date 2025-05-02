const DEFAULT_TIMEZONE = process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone;
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
const dateFormat = "yyyy-MM-dd HH:mm";
const toAppTimezone = (date) => {
    const dateObj = new Date(date);
    return formatInTimeZone(dateObj, DEFAULT_TIMEZONE, dateFormat);
}
const getCurrentTime = () => {
    const now = new Date();
    return formatInTimeZone(now, DEFAULT_TIMEZONE, dateFormat);
}

const getCurrentTimeISO = () => {
    const now = new Date();
    return formatInTimeZone(now, DEFAULT_TIMEZONE, dateFormat);
}
export {
    dateFormat,
    DEFAULT_TIMEZONE,
    // Helper function to convert date to the application timezone
    toAppTimezone,
    // Helper function to get current time in the application timezone
    getCurrentTime,
    // Helper function to get current time in ISO format with correct timezone
    getCurrentTimeISO
};
