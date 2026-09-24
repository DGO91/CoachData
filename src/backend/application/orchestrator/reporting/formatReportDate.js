/**
 * formatReportDate.js
 * Multi-Tenant Date & Timezone Formatter — CoachData Operational OS v2
 */

function formatReportDate(date = new Date(), timezone = 'Europe/Madrid', locale = 'es-ES') {
  const targetTz = timezone || 'Europe/Madrid';
  
  try {
    const formatter = new Intl.DateTimeFormat(locale, {
      timeZone: targetTz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    return formatter.format(new Date(date));
  } catch (err) {
    console.warn(`[formatReportDate] Invalid timezone '${timezone}', falling back to UTC:`, err.message);
    const fallbackFormatter = new Intl.DateTimeFormat(locale, {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    return fallbackFormatter.format(new Date(date));
  }
}

module.exports = { formatReportDate };
