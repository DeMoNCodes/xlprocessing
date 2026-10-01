/**
 * Helper utility for parsing dates and scheduling timestamps
 */

/**
 * Parse various date formats from Excel / CSV into a valid JS Date
 * Handles:
 * - Excel numeric serial numbers (e.g. 44562)
 * - ISO strings (e.g. 2026-05-15)
 * - Standard US dates (MM/DD/YYYY, MM-DD-YYYY)
 */
function parseAnyDate(val) {
  if (!val) return null;

  // If already a Date object
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val;
  }

  // If numeric (Excel serial date)
  if (typeof val === 'number') {
    // Excel base date: Dec 30 1899
    const utc_days = Math.floor(val - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    const fractional_day = val - Math.floor(val) + 0.0000001;
    let total_seconds = Math.floor(86400 * fractional_day);
    const seconds = total_seconds % 60;
    total_seconds -= seconds;
    const hours = Math.floor(total_seconds / (60 * 60));
    const minutes = Math.floor(total_seconds / 60) % 60;
    return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds);
  }

  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;

    // Check if it's numeric in string format
    if (/^\d{5}(\.\d+)?$/.test(trimmed)) {
      return parseAnyDate(parseFloat(trimmed));
    }

    // Try standard Date parsing
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }

    // Try MM/DD/YYYY or DD/MM/YYYY
    const parts = trimmed.split(/[/.-]/);
    if (parts.length === 3) {
      // Assuming YYYY-MM-DD
      if (parts[0].length === 4) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        if (!isNaN(d.getTime())) return d;
      }
      // Assuming MM/DD/YYYY
      const d = new Date(parseInt(parts[2], 10), parseInt(parts[0], 10) - 1, parseInt(parts[1], 10));
      if (!isNaN(d.getTime())) return d;
    }
  }

  return null;
}

/**
 * Combine 'day' and 'time' strings into a specific target Date object
 * @param {string} dayStr - e.g. "2026-10-02" or "today" or "tomorrow" or "Monday"
 * @param {string} timeStr - e.g. "14:30", "14:30:00", "2:30 PM"
 * @returns {Date} Target execution date
 */
function parseScheduledDateTime(dayStr, timeStr) {
  if (!dayStr || !timeStr) {
    throw new Error('Both day and time parameters are required');
  }

  const now = new Date();
  let targetYear = now.getFullYear();
  let targetMonth = now.getMonth();
  let targetDay = now.getDate();

  const lowerDay = dayStr.trim().toLowerCase();

  if (lowerDay === 'today') {
    // Keep today's date
  } else if (lowerDay === 'tomorrow') {
    targetDay += 1;
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(lowerDay)) {
    // YYYY-MM-DD
    const [y, m, d] = lowerDay.split('-').map(Number);
    targetYear = y;
    targetMonth = m - 1;
    targetDay = d;
  } else if (/^\d{2}[/.-]\d{2}[/.-]\d{4}$/.test(lowerDay)) {
    // MM/DD/YYYY or DD/MM/YYYY
    const [p1, p2, p3] = lowerDay.split(/[/.-]/).map(Number);
    targetYear = p3;
    targetMonth = p1 - 1;
    targetDay = p2;
  } else {
    // Check day of week names
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayIndex = daysOfWeek.indexOf(lowerDay);
    if (dayIndex !== -1) {
      const currentDayIndex = now.getDay();
      let diff = dayIndex - currentDayIndex;
      if (diff <= 0) diff += 7; // Next occurrence
      targetDay += diff;
    } else {
      // Fallback: try parsing as generic date string
      const parsed = new Date(dayStr);
      if (!isNaN(parsed.getTime())) {
        targetYear = parsed.getFullYear();
        targetMonth = parsed.getMonth();
        targetDay = parsed.getDate();
      } else {
        throw new Error(`Unrecognized day format: "${dayStr}". Use YYYY-MM-DD, today, tomorrow, or day name.`);
      }
    }
  }

  // Parse time
  const timeRegex = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?$/i;
  const match = timeStr.trim().match(timeRegex);
  if (!match) {
    throw new Error(`Unrecognized time format: "${timeStr}". Use HH:mm or HH:mm:ss (24h) or HH:mm AM/PM.`);
  }

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = match[3] ? parseInt(match[3], 10) : 0;
  const meridiem = match[4] ? match[4].toLowerCase() : null;

  if (meridiem === 'pm' && hours < 12) hours += 12;
  if (meridiem === 'am' && hours === 12) hours = 0;

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
    throw new Error(`Invalid time values: ${timeStr}`);
  }

  const targetDate = new Date(targetYear, targetMonth, targetDay, hours, minutes, seconds);
  return targetDate;
}

module.exports = {
  parseAnyDate,
  parseScheduledDateTime
};
