/**
 * Utilities for calculating local dates, hours, and normalized date keys
 * for task due date reminders across various IANA time zones.
 */

/**
 * Validates whether a given string is a valid IANA time zone identifier
 * @param {string} tz - IANA time zone name (e.g., 'Asia/Tehran', 'Europe/London')
 * @returns {boolean}
 */
export const isValidTimezone = (tz) => {
  if (!tz || typeof tz !== 'string') return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz.trim() });
    return true;
  } catch {
    return false;
  }
};

/**
 * Returns the local dateKey (YYYY-MM-DD), current local hour (0-23), and minute
 * for a specific moment in the recipient's time zone.
 * @param {Date} date
 * @param {string} timezone
 * @returns {{ dateKey: string, hour: number, minute: number, timezone: string }}
 */
export const getLocalTimeInfo = (date = new Date(), timezone = 'UTC') => {
  const validTz = isValidTimezone(timezone) ? timezone.trim() : 'UTC';

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: validTz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type) => parts.find((p) => p.type === type)?.value;

  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  let hour = parseInt(getPart('hour'), 10);
  if (hour === 24) hour = 0;
  const minute = parseInt(getPart('minute'), 10);

  const dateKey = `${year}-${month}-${day}`;

  return {
    dateKey,
    hour,
    minute,
    timezone: validTz,
  };
};

/**
 * Add or subtract days from a YYYY-MM-DD date key
 * @param {string} dateKey - 'YYYY-MM-DD'
 * @param {number} days - number of days to add/subtract
 * @returns {string} - 'YYYY-MM-DD'
 */
export const addDaysToDateKey = (dateKey, days) => {
  if (!dateKey) return null;
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
  const year = dt.getUTCFullYear();
  const month = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const day = String(dt.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Extract a normalized calendar date key (YYYY-MM-DD) from a task's dueDate
 * Preserves the user's intended calendar date representation without shifting.
 * @param {Date|string} dueDate
 * @returns {string|null}
 */
export const getTaskDueDateKey = (dueDate) => {
  if (!dueDate) return null;

  if (typeof dueDate === 'string') {
    const match = dueDate.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }

  const d = new Date(dueDate);
  if (isNaN(d.getTime())) return null;

  const iso = d.toISOString();
  const match = iso.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
};

/**
 * Generates an immutable, collision-resistant deduplication key
 * for a reminder delivery event.
 * @param {string} taskId
 * @param {string} recipientId
 * @param {string} dueDateKey
 * @param {string} reminderStage
 * @returns {string}
 */
export const buildDedupeKey = (taskId, recipientId, dueDateKey, reminderStage) => {
  return `${String(taskId)}:${String(recipientId)}:${String(dueDateKey)}:${String(reminderStage)}`;
};
