/**
 * Format date to ISO string
 */
export function formatDateToISO(date: Date | string): string {
  if (typeof date === 'string') return date;
  return date.toISOString();
}

/**
 * Parse date string to Date object
 */
export function parseDate(date: string | Date): Date {
  if (date instanceof Date) return date;
  return new Date(date);
}

/**
 * Get start of day
 */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get end of day
 */
export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string, format: 'short' | 'long' = 'short'): string {
  const d = parseDate(date);
  const options: Intl.DateTimeFormatOptions = format === 'short'
    ? { year: 'numeric', month: '2-digit', day: '2-digit' }
    : { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return d.toLocaleDateString('en-US', options);
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100 * 100) / 100;
}

/**
 * Format number with commas
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Get grade from percentage
 */
export function getGrade(percentage: number): string {
  if (percentage >= 90) return 'A+';
  if (percentage >= 85) return 'A';
  if (percentage >= 80) return 'A-';
  if (percentage >= 75) return 'B+';
  if (percentage >= 70) return 'B';
  if (percentage >= 65) return 'B-';
  if (percentage >= 60) return 'C+';
  if (percentage >= 55) return 'C';
  if (percentage >= 50) return 'C-';
  if (percentage >= 40) return 'D';
  return 'F';
}

/**
 * Parse JSON safely
 */
export function safeParseJSON<T = any>(str: string | null, defaultValue: T): T {
  if (!str) return defaultValue;
  try {
    return JSON.parse(str) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Check for time conflict in schedules
 */
export function hasTimeConflict(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);

  // Conflict if intervals overlap
  return s1 < e2 && s2 < e1;
}

/**
 * Generate random ID (alternative to cuid)
 */
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Slugify text
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Truncate text
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}

/**
 * Get month name
 */
export function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || '';
}