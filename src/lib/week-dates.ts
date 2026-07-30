/**
 * UTC week arithmetic for the weekly incident cycle.
 *
 * Kept free of database imports so it stays cheap to unit test — the weekly
 * case release depends entirely on this maths being right, and a silent
 * off-by-one here means cases release with deadlines already in the past.
 */

/** Monday 00:00 UTC of the week containing `now` (defaults to today). */
export function mondayOfWeekUTC(now: Date = new Date()): Date {
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  // getUTCDay(): Sunday=0 .. Saturday=6. Sunday closes the week that began on
  // the preceding Monday, so it shifts back six days rather than forward one.
  const shift = d.getUTCDay() === 0 ? -6 : 1 - d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + shift);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Sunday 23:59 UTC closing the week that starts on `monday`. */
export function deadlineForWeek(monday: Date): Date {
  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 0, 0);
  return sunday;
}

/**
 * ISO-8601 week number (1-53). The week belongs to whichever year contains its
 * Thursday, which is why late-December and early-January dates can report a
 * week number from the adjoining year.
 */
export function isoWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** The season (ISO week-numbering year) that owns the week starting `monday`. */
export function isoWeekYear(monday: Date): number {
  const d = new Date(monday);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  return d.getUTCFullYear();
}
