import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

// Extend dayjs with timezone support
dayjs.extend(utc)
dayjs.extend(timezone)

/**
 * Convert UTC datetime to user's timezone
 * @param utcDate - UTC date string or Date object
 * @param userTz - User's IANA timezone string (e.g., 'America/Toronto')
 * @returns dayjs object in user's timezone
 */
export const toUserTime = (utcDate: string | Date, userTz: string) => {
  return dayjs.utc(utcDate).tz(userTz)
}

/**
 * Convert user's local datetime to UTC for storage
 * @param localISO - Local date in ISO format
 * @param userTz - User's IANA timezone string
 * @returns dayjs object in UTC
 */
export const toUtc = (localISO: string, userTz: string) => {
  return dayjs.tz(localISO, userTz).utc()
}

/**
 * Get user's timezone automatically
 * @returns IANA timezone string
 */
export const getUserTimezone = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/**
 * Format date for display in user's timezone
 * @param utcDate - UTC date string or Date object
 * @param userTz - User's IANA timezone string
 * @param format - dayjs format string
 * @returns formatted date string
 */
export const formatUserTime = (
  utcDate: string | Date, 
  userTz: string, 
  format: string = 'YYYY-MM-DD HH:mm'
): string => {
  return toUserTime(utcDate, userTz).format(format)
}

/**
 * Get list of common timezones for dropdown
 */
export const getCommonTimezones = () => {
  return [
    'America/New_York',
    'America/Chicago', 
    'America/Denver',
    'America/Los_Angeles',
    'America/Toronto',
    'America/Vancouver',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney',
  ]
} 