import {
  toJalaali,
  toGregorian,
  jalaaliMonthLength,
} from 'jalaali-js';
import { toPersianNum } from './taskHelpers.js';

export const PERSIAN_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

export const ENGLISH_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const PERSIAN_WEEKDAYS = [
  { key: 'sat', full: 'شنبه', short: 'ش' },
  { key: 'sun', full: 'یکشنبه', short: 'ی' },
  { key: 'mon', full: 'دوشنبه', short: 'د' },
  { key: 'tue', full: 'سه‌شنبه', short: 'س' },
  { key: 'wed', full: 'چهارشنبه', short: 'چ' },
  { key: 'thu', full: 'پنجشنبه', short: 'پ' },
  { key: 'fri', full: 'جمعه', short: 'ج' },
];

export const ENGLISH_WEEKDAYS = [
  { key: 'sun', full: 'Sunday', short: 'Sun' },
  { key: 'mon', full: 'Monday', short: 'Mon' },
  { key: 'tue', full: 'Tuesday', short: 'Tue' },
  { key: 'wed', full: 'Wednesday', short: 'Wed' },
  { key: 'thu', full: 'Thursday', short: 'Thu' },
  { key: 'fri', full: 'Friday', short: 'Fri' },
  { key: 'sat', full: 'Saturday', short: 'Sat' },
];

/**
 * Format Gregorian Y, M, D into YYYY-MM-DD
 */
export const formatDateKey = (year, month, day) => {
  const y = String(year).padStart(4, '0');
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Get today's Gregorian dateKey (YYYY-MM-DD)
 */
export const getTodayDateKey = () => {
  const now = new Date();
  return formatDateKey(now.getFullYear(), now.getMonth() + 1, now.getDate());
};

/**
 * Normalize a task's dueDate to a dateKey string (YYYY-MM-DD) or null
 */
export const extractTaskDateKey = (dueDate) => {
  if (!dueDate) return null;
  if (typeof dueDate === 'string') {
    const match = dueDate.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  const d = new Date(dueDate);
  if (isNaN(d.getTime())) return null;
  return formatDateKey(d.getFullYear(), d.getMonth() + 1, d.getDate());
};

/**
 * Get initial calendar state based on current date and language
 */
export const getInitialCalendarState = (lang = 'fa') => {
  const now = new Date();
  const gy = now.getFullYear();
  const gm = now.getMonth() + 1;
  const gd = now.getDate();

  if (lang === 'fa') {
    const j = toJalaali(gy, gm, gd);
    return {
      year: j.jy,
      month: j.jm, // 1 - 12
      activeDate: now,
    };
  }

  return {
    year: gy,
    month: gm, // 1 - 12
    activeDate: now,
  };
};

/**
 * Navigate to previous period
 */
export const getPreviousPeriod = ({ year, month, activeDate, viewType, lang }) => {
  if (viewType === 'week') {
    const nextDate = new Date(activeDate.getTime() - 7 * 86400000);
    if (lang === 'fa') {
      const j = toJalaali(nextDate.getFullYear(), nextDate.getMonth() + 1, nextDate.getDate());
      return { year: j.jy, month: j.jm, activeDate: nextDate };
    }
    return {
      year: nextDate.getFullYear(),
      month: nextDate.getMonth() + 1,
      activeDate: nextDate,
    };
  }

  // Month view
  if (lang === 'fa') {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const g = toGregorian(prevYear, prevMonth, 1);
    const nextDate = new Date(g.gy, g.gm - 1, g.gd);
    return { year: prevYear, month: prevMonth, activeDate: nextDate };
  }

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const nextDate = new Date(prevYear, prevMonth - 1, 1);
  return { year: prevYear, month: prevMonth, activeDate: nextDate };
};

/**
 * Navigate to next period
 */
export const getNextPeriod = ({ year, month, activeDate, viewType, lang }) => {
  if (viewType === 'week') {
    const nextDate = new Date(activeDate.getTime() + 7 * 86400000);
    if (lang === 'fa') {
      const j = toJalaali(nextDate.getFullYear(), nextDate.getMonth() + 1, nextDate.getDate());
      return { year: j.jy, month: j.jm, activeDate: nextDate };
    }
    return {
      year: nextDate.getFullYear(),
      month: nextDate.getMonth() + 1,
      activeDate: nextDate,
    };
  }

  // Month view
  if (lang === 'fa') {
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const g = toGregorian(nextYear, nextMonth, 1);
    const nextDate = new Date(g.gy, g.gm - 1, g.gd);
    return { year: nextYear, month: nextMonth, activeDate: nextDate };
  }

  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nextDate = new Date(nextYear, nextMonth - 1, 1);
  return { year: nextYear, month: nextMonth, activeDate: nextDate };
};

/**
 * Generate 35 or 42 grid cells for Month View
 */
export const getMonthCalendarGrid = ({ year, month, lang }) => {
  const todayKey = getTodayDateKey();
  const cells = [];

  if (lang === 'fa') {
    const monthLength = jalaaliMonthLength(year, month);
    const gFirst = toGregorian(year, month, 1);
    const firstDate = new Date(gFirst.gy, gFirst.gm - 1, gFirst.gd);
    // Saturday is index 0 in Persian
    const startWeekday = (firstDate.getDay() + 1) % 7;

    // Previous month trailing days
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevMonthLength = jalaaliMonthLength(prevYear, prevMonth);

    for (let i = startWeekday - 1; i >= 0; i--) {
      const dayNum = prevMonthLength - i;
      const g = toGregorian(prevYear, prevMonth, dayNum);
      const dateKey = formatDateKey(g.gy, g.gm, g.gd);
      cells.push({
        year: prevYear,
        month: prevMonth,
        day: dayNum,
        dateKey,
        isCurrentMonth: false,
        isToday: dateKey === todayKey,
        weekdayIndex: cells.length % 7,
      });
    }

    // Current month days
    for (let d = 1; d <= monthLength; d++) {
      const g = toGregorian(year, month, d);
      const dateKey = formatDateKey(g.gy, g.gm, g.gd);
      cells.push({
        year,
        month,
        day: d,
        dateKey,
        isCurrentMonth: true,
        isToday: dateKey === todayKey,
        weekdayIndex: cells.length % 7,
      });
    }

    // Next month leading days (fill up to multiple of 7, at least 35)
    const targetCount = cells.length > 35 ? 42 : 35;
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;
    let nextDay = 1;

    while (cells.length < targetCount) {
      const g = toGregorian(nextYear, nextMonth, nextDay);
      const dateKey = formatDateKey(g.gy, g.gm, g.gd);
      cells.push({
        year: nextYear,
        month: nextMonth,
        day: nextDay,
        dateKey,
        isCurrentMonth: false,
        isToday: dateKey === todayKey,
        weekdayIndex: cells.length % 7,
      });
      nextDay++;
    }

    return cells;
  }

  // English (Gregorian)
  const firstDate = new Date(year, month - 1, 1);
  const startWeekday = firstDate.getDay(); // 0 = Sunday
  const monthLength = new Date(year, month, 0).getDate();
  const prevMonthLength = new Date(year, month - 1, 0).getDate();

  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;

  for (let i = startWeekday - 1; i >= 0; i--) {
    const dayNum = prevMonthLength - i;
    const dateKey = formatDateKey(prevYear, prevMonth, dayNum);
    cells.push({
      year: prevYear,
      month: prevMonth,
      day: dayNum,
      dateKey,
      isCurrentMonth: false,
      isToday: dateKey === todayKey,
      weekdayIndex: cells.length % 7,
    });
  }

  for (let d = 1; d <= monthLength; d++) {
    const dateKey = formatDateKey(year, month, d);
    cells.push({
      year,
      month,
      day: d,
      dateKey,
      isCurrentMonth: true,
      isToday: dateKey === todayKey,
      weekdayIndex: cells.length % 7,
    });
  }

  const targetCount = cells.length > 35 ? 42 : 35;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  let nextDay = 1;

  while (cells.length < targetCount) {
    const dateKey = formatDateKey(nextYear, nextMonth, nextDay);
    cells.push({
      year: nextYear,
      month: nextMonth,
      day: nextDay,
      dateKey,
      isCurrentMonth: false,
      isToday: dateKey === todayKey,
      weekdayIndex: cells.length % 7,
    });
    nextDay++;
  }

  return cells;
};

/**
 * Generate 7 days for Week View
 */
export const getWeekCalendarGrid = ({ activeDate, lang }) => {
  const todayKey = getTodayDateKey();
  const d = activeDate ? new Date(activeDate) : new Date();

  // Find start of week
  let startOffset = 0;
  if (lang === 'fa') {
    // Saturday is index 0
    startOffset = (d.getDay() + 1) % 7;
  } else {
    // Sunday is index 0
    startOffset = d.getDay();
  }

  const startDate = new Date(d.getFullYear(), d.getMonth(), d.getDate() - startOffset);
  const days = [];

  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
    const gy = dayDate.getFullYear();
    const gm = dayDate.getMonth() + 1;
    const gd = dayDate.getDate();
    const dateKey = formatDateKey(gy, gm, gd);

    if (lang === 'fa') {
      const j = toJalaali(gy, gm, gd);
      days.push({
        year: j.jy,
        month: j.jm,
        day: j.jd,
        dateKey,
        isToday: dateKey === todayKey,
        weekdayIndex: i,
        rawDate: dayDate,
      });
    } else {
      days.push({
        year: gy,
        month: gm,
        day: gd,
        dateKey,
        isToday: dateKey === todayKey,
        weekdayIndex: i,
        rawDate: dayDate,
      });
    }
  }

  return days;
};

/**
 * Generate toolbar title string
 */
export const getCalendarTitle = ({ year, month, activeDate, viewType, lang }) => {
  if (viewType === 'month') {
    if (lang === 'fa') {
      const mName = PERSIAN_MONTHS[month - 1] || '';
      return `${mName} ${toPersianNum(year, lang)}`;
    }
    const mName = ENGLISH_MONTHS[month - 1] || '';
    return `${mName} ${year}`;
  }

  // Week view
  const weekDays = getWeekCalendarGrid({ activeDate, lang });
  const first = weekDays[0];
  const last = weekDays[6];

  if (lang === 'fa') {
    if (first.month === last.month) {
      const mName = PERSIAN_MONTHS[first.month - 1] || '';
      return `${toPersianNum(first.day, lang)} الی ${toPersianNum(last.day, lang)} ${mName} ${toPersianNum(first.year, lang)}`;
    }
    const mFirst = PERSIAN_MONTHS[first.month - 1] || '';
    const mLast = PERSIAN_MONTHS[last.month - 1] || '';
    return `${toPersianNum(first.day, lang)} ${mFirst} - ${toPersianNum(last.day, lang)} ${mLast} ${toPersianNum(first.year, lang)}`;
  }

  // English
  if (first.month === last.month) {
    const mName = ENGLISH_MONTHS[first.month - 1] || '';
    return `${mName} ${first.day} – ${last.day}, ${first.year}`;
  }
  const mFirst = (ENGLISH_MONTHS[first.month - 1] || '').slice(0, 3);
  const mLast = (ENGLISH_MONTHS[last.month - 1] || '').slice(0, 3);
  return `${mFirst} ${first.day} – ${mLast} ${last.day}, ${first.year}`;
};
