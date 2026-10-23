/**
 * Utility helpers for task formatting, duration calculations, and style configs.
 */

/**
 * Format total seconds into a compact human-readable duration string (e.g., '2h 15m', '45m', '3h')
 * @param {number} totalSec
 * @returns {string|null}
 */
export const formatShortDuration = (totalSec) => {
  if (!totalSec || totalSec <= 0) return null;
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
};

/**
 * Check if a task is overdue
 * @param {string|Date} dueDate
 * @param {string} status
 * @returns {boolean}
 */
export const isTaskOverdue = (dueDate, status) => {
  if (!dueDate || status === 'completed') return false;
  return new Date(dueDate).setHours(23, 59, 59, 999) < Date.now();
};

/**
 * Convert numbers to Persian digits if language is 'fa'
 * @param {number|string} val
 * @param {string} lang
 * @returns {string}
 */
export const toPersianNum = (val, lang = 'fa') => {
  if (lang !== 'fa') return String(val);
  return String(val).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
};

/**
 * Format total seconds into a localized readable duration string
 * @param {number} totalSec
 * @param {string} lang
 * @param {Function} t - translation function
 * @returns {string}
 */
export const formatDurationText = (totalSec, lang = 'fa', t = (k) => k) => {
  if (!totalSec || totalSec <= 0) {
    return `${toPersianNum(0, lang)} ${t('minutesShort')}`;
  }
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  const parts = [];
  if (hrs > 0) parts.push(`${toPersianNum(hrs, lang)} ${t('hoursShort')}`);
  if (mins > 0) parts.push(`${toPersianNum(mins, lang)} ${t('minutesShort')}`);
  if (hrs === 0 && mins === 0) parts.push(`${toPersianNum(secs, lang)} ${t('secondsShort')}`);
  return parts.join(lang === 'fa' ? ' و ' : ' ');
};

/**
 * Format total seconds into HH:MM:SS stopwatch string
 * @param {number} totalSec
 * @returns {string}
 */
export const formatStopwatch = (totalSec) => {
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

/**
 * Format date string into localized short date
 * @param {string|Date} dateStr
 * @param {string} lang
 * @param {boolean} includeYear
 * @returns {string}
 */
export const formatTaskDate = (dateStr, lang = 'fa', includeYear = false) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const options = {
    month: 'short',
    day: 'numeric',
  };
  if (includeYear) {
    options.year = 'numeric';
  }
  return d.toLocaleDateString(lang === 'fa' ? 'fa-IR' : 'en-US', options);
};

/**
 * Format time string (HH:MM)
 * @param {string|Date} dateStr
 * @param {string} lang
 * @returns {string}
 */
export const formatTaskTime = (dateStr, lang = 'fa') => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return lang === 'fa'
    ? `${toPersianNum(h, lang)}:${toPersianNum(m, lang)}`
    : `${h}:${m}`;
};

/**
 * Format relative time (e.g. 'Just now', '5m ago', '2h ago')
 * @param {string|Date} dateStr
 * @param {string} lang
 * @returns {string}
 */
export const formatRelativeTime = (dateStr, lang = 'fa') => {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return lang === 'fa' ? 'لحظاتی پیش' : 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} ${lang === 'fa' ? 'دقیقه پیش' : 'm ago'}`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ${lang === 'fa' ? 'ساعت پیش' : 'h ago'}`;
  return formatTaskDate(dateStr, lang);
};

/**
 * Border color classes matching task priority
 */
export const PRIORITY_BORDER_COLORS = {
  urgent: 'border-s-red-500',
  high: 'border-s-orange-500',
  medium: 'border-s-blue-500',
  low: 'border-s-slate-400',
};
