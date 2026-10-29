/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Utility functions for clean, human-readable date & time formatting
 * across the TaskFlow app and Google Spreadsheet exports.
 */

const MONTH_NAMES_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

const MONTH_NAMES_FULL_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Safely parse date from string, number, or Date
 */
export function safeParseDate(val: string | number | Date | undefined | null): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;

  // If string contains format YYYY-MM-DD HH:mm:ss
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;

    // Handle YYYY-MM-DD only
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-').map(Number);
      return new Date(y, m - 1, d, 0, 0, 0);
    }

    // Handle YYYY-MM-DD HH:mm or YYYY-MM-DD HH:mm:ss
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
      const [datePart, timePart] = trimmed.split(' ');
      const [y, m, d] = datePart.split('-').map(Number);
      const timeParts = timePart.split(':').map(Number);
      return new Date(y, m - 1, d, timeParts[0] || 0, timeParts[1] || 0, timeParts[2] || 0);
    }
  }

  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Format as standard ISO date: YYYY-MM-DD
 */
export function formatDate(val: string | number | Date | undefined | null): string {
  const d = safeParseDate(val);
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Format as clean 24h time: HH:mm (or HH:mm:ss if includeSeconds)
 */
export function formatTime(
  val: string | number | Date | undefined | null,
  includeSeconds = false
): string {
  const d = safeParseDate(val);
  if (!d) return '';
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  if (includeSeconds) {
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }
  return `${h}:${m}`;
}

/**
 * Format as standard spreadsheet & database timestamp: YYYY-MM-DD HH:mm:ss
 */
export function formatDateTime(val: string | number | Date | undefined | null): string {
  const d = safeParseDate(val);
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}:${s}`;
}

/**
 * Format due date for friendly display (e.g., 'Hari Ini', 'Besok', '28 Okt 2026', or '28 Okt 2026, 17:00')
 */
export function formatDisplayDueDate(dueDateStr: string | undefined | null): string {
  if (!dueDateStr) return '';
  const trimmed = dueDateStr.trim();
  if (!trimmed) return '';

  const d = safeParseDate(trimmed);
  if (!d) return trimmed;

  const now = new Date();
  const todayDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const targetDateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((targetDateOnly - todayDateOnly) / 86400000);

  const hasTime = trimmed.includes(':') || trimmed.includes('T');
  const timeSuffix = hasTime ? `, ${formatTime(d)}` : '';

  if (diffDays === 0) {
    return `Hari Ini${timeSuffix}`;
  }
  if (diffDays === 1) {
    return `Besok${timeSuffix}`;
  }
  if (diffDays === -1) {
    return `Kemarin${timeSuffix}`;
  }

  const day = d.getDate();
  const month = MONTH_NAMES_ID[d.getMonth()];
  const year = d.getFullYear();
  const currentYear = now.getFullYear();

  if (year === currentYear) {
    return `${day} ${month}${timeSuffix}`;
  }
  return `${day} ${month} ${year}${timeSuffix}`;
}

/**
 * Format full human-readable timestamp (e.g., '28 Oktober 2026, 16:30:15 WIB')
 */
export function formatFullDateTime(val: string | number | Date | undefined | null): string {
  const d = safeParseDate(val);
  if (!d) return '-';

  const day = d.getDate();
  const month = MONTH_NAMES_FULL_ID[d.getMonth()];
  const year = d.getFullYear();
  const time = formatTime(d, true);

  return `${day} ${month} ${year}, ${time}`;
}

/**
 * Format relative time (e.g., 'Baru saja', '5m lalu', '3j lalu', 'Kemarin', '25 Okt')
 */
export function formatRelativeTime(val: string | number | Date | undefined | null): string {
  const d = safeParseDate(val);
  if (!d) return '';

  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 45) return 'Baru saja';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m lalu`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}j lalu`;
  if (diffSec < 86400 * 2) return 'Kemarin';

  const day = d.getDate();
  const month = MONTH_NAMES_ID[d.getMonth()];
  return `${day} ${month}`;
}
