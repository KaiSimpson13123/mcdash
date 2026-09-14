/**
 * Safe timestamp and date formatting utility that handles ISO-8601 strings,
 * epoch seconds, epoch milliseconds, Date objects, and null/undefined without throwing.
 */
export const formatTime = (ts: any): string => {
  if (!ts && ts !== 0) return '';
  if (typeof ts === 'string') {
    if (ts.includes('T')) {
      const parts = ts.split('T');
      if (parts[1]) return parts[1].substring(0, 8);
    }
    if (ts.length >= 8) return ts.substring(0, 8);
    return ts;
  }
  if (typeof ts === 'number') {
    // If < 1e11 it's seconds, otherwise milliseconds
    const millis = ts < 1e11 ? ts * 1000 : ts;
    const d = new Date(millis);
    return isNaN(d.getTime()) ? String(ts) : d.toTimeString().substring(0, 8);
  }
  try {
    const d = new Date(ts);
    if (!isNaN(d.getTime())) {
      return d.toTimeString().substring(0, 8);
    }
  } catch (e) {}
  return String(ts);
};
