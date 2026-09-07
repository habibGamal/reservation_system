/**
 * Eagles Resort Period Utilities
 *
 * Resort periods run on a weekly cycle:
 * - Always starts on Friday (check-in)
 * - Always ends on Thursday (check-out)
 * - 6 nights total (Fri, Sat, Sun, Mon, Tue, Wed nights; Thu checkout)
 * - Consecutive periods start every 7 days (next Friday)
 */

export interface ResortPeriod {
  id: string;
  startStr: string; // YYYY-MM-DD (Friday)
  endStr: string;   // YYYY-MM-DD (Thursday)
  startDate: Date;
  endDate: Date;
  label: string;
  shortLabel: string;
  relativeTag?: 'current' | 'next' | 'prev';
  relativeLabel?: string;
}

const ARABIC_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

/**
 * Format Date to local YYYY-MM-DD string without timezone offset distortions.
 */
export function formatDateToYMD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD string to local midnight Date.
 */
export function parseYMD(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1, 0, 0, 0, 0);
}

/**
 * Given any reference date, find the Friday that started the active period.
 * Cycle: Friday (0) -> Saturday (1) -> Sunday (2) -> Monday (3) -> Tuesday (4) -> Wednesday (5) -> Thursday (6).
 */
export function getFridayForDate(refDate: Date = new Date()): Date {
  const d = new Date(refDate);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0: Sun, 1: Mon, 2: Tue, 3: Wed, 4: Thu, 5: Fri, 6: Sat
  // Distance back to the most recent Friday:
  // Fri(5): 0, Sat(6): 1, Sun(0): 2, Mon(1): 3, Tue(2): 4, Wed(3): 5, Thu(4): 6
  const diffDays = (day - 5 + 7) % 7;
  d.setDate(d.getDate() - diffDays);
  return d;
}

/**
 * Build a ResortPeriod object from its starting Friday Date.
 */
export function buildPeriodFromFriday(
  fridayDate: Date,
  relativeTag?: 'current' | 'next' | 'prev'
): ResortPeriod {
  const start = new Date(fridayDate);
  start.setHours(0, 0, 0, 0);

  // End date is Thursday (Friday + 6 days)
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const startStr = formatDateToYMD(start);
  const endStr = formatDateToYMD(end);

  const startDay = start.getDate();
  const startMonth = ARABIC_MONTHS[start.getMonth()];
  const endDay = end.getDate();
  const endMonth = ARABIC_MONTHS[end.getMonth()];
  const endYear = end.getFullYear();

  const label =
    start.getMonth() === end.getMonth()
      ? `${startDay} - ${endDay} ${startMonth} ${endYear}`
      : `${startDay} ${startMonth} - ${endDay} ${endMonth} ${endYear}`;

  const shortLabel = `${start.getMonth() + 1}/${startDay} ⟵ ${end.getMonth() + 1}/${endDay}`;

  let relativeLabel: string | undefined;
  if (relativeTag === 'current') {
    relativeLabel = 'الفترة الحالية';
  } else if (relativeTag === 'next') {
    relativeLabel = 'الفترة القادمة';
  } else if (relativeTag === 'prev') {
    relativeLabel = 'الفترة السابقة';
  }

  return {
    id: `${startStr}_${endStr}`,
    startStr,
    endStr,
    startDate: start,
    endDate: end,
    label,
    shortLabel,
    relativeTag,
    relativeLabel,
  };
}

/**
 * Get the current active resort period (Friday to Thursday).
 */
export function getCurrentPeriod(refDate: Date = new Date()): ResortPeriod {
  const friday = getFridayForDate(refDate);
  return buildPeriodFromFriday(friday, 'current');
}

/**
 * Get the next resort period (+7 days from current).
 */
export function getNextPeriod(current: ResortPeriod | Date): ResortPeriod {
  const baseFriday = current instanceof Date ? getFridayForDate(current) : current.startDate;
  const nextFriday = new Date(baseFriday);
  nextFriday.setDate(nextFriday.getDate() + 7);
  return buildPeriodFromFriday(nextFriday);
}

/**
 * Get the previous resort period (-7 days from current).
 */
export function getPreviousPeriod(current: ResortPeriod | Date): ResortPeriod {
  const baseFriday = current instanceof Date ? getFridayForDate(current) : current.startDate;
  const prevFriday = new Date(baseFriday);
  prevFriday.setDate(prevFriday.getDate() - 7);
  return buildPeriodFromFriday(prevFriday);
}

/**
 * Generate a list of periods spanning past and future weeks.
 */
export function generatePeriodsList(
  pastCount = 8,
  futureCount = 16,
  refDate: Date = new Date()
): ResortPeriod[] {
  const currentFriday = getFridayForDate(refDate);
  const periods: ResortPeriod[] = [];

  for (let offset = -pastCount; offset <= futureCount; offset++) {
    const f = new Date(currentFriday);
    f.setDate(f.getDate() + offset * 7);

    let tag: 'current' | 'next' | 'prev' | undefined;
    if (offset === 0) tag = 'current';
    else if (offset === 1) tag = 'next';
    else if (offset === -1) tag = 'prev';

    periods.push(buildPeriodFromFriday(f, tag));
  }

  return periods;
}

/**
 * Check if the given dates match a Friday-to-Thursday period.
 */
export function isFridayToThursdayPeriod(startStr?: string | null, endStr?: string | null): boolean {
  if (!startStr || !endStr) return false;
  const start = parseYMD(startStr);
  const end = parseYMD(endStr);
  if (start.getDay() !== 5) return false; // Must be Friday
  if (end.getDay() !== 4) return false;   // Must be Thursday
  const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays === 6; // Exactly 6 days apart
}

