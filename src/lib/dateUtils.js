/**
 * Universal Date & Time Utility for Vaiyaaree
 * Guarantees 100% exact matching between Frontend and Admin order dates
 * with accurate Indian Standard Time (IST / Asia/Kolkata) parsing & formatting.
 */

/**
 * Parses any date input (MySQL string, ISO string, timestamp, Date object)
 * into a valid JavaScript Date object without artificial timezone shifts.
 *
 * @param {string|number|Date} dateInput
 * @returns {Date|null}
 */
export function parseDateToUTC(dateInput) {
    if (!dateInput) return null;
    if (dateInput instanceof Date) {
        return isNaN(dateInput.getTime()) ? null : dateInput;
    }
    if (typeof dateInput === 'number') {
        const d = new Date(dateInput);
        return isNaN(d.getTime()) ? null : d;
    }

    const str = String(dateInput).trim();
    if (!str) return null;

    // Case 1: Standard ISO with timezone (e.g. "2026-09-03T13:00:00.000Z" or "...+05:30")
    if (str.includes('Z') || /[+-]\d{2}:\d{2}$/.test(str)) {
        const d = new Date(str);
        return isNaN(d.getTime()) ? null : d;
    }

    // Case 2: MySQL DATETIME / TIMESTAMP without timezone (e.g. "2026-09-03 18:30:00" or "2026-09-03T18:30:00")
    // MySQL NOW() stores time in local system / IST time. We treat this as Asia/Kolkata local time.
    const match = str.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (match) {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1;
        const day = parseInt(match[3], 10);
        const hours = parseInt(match[4], 10);
        const minutes = parseInt(match[5], 10);
        const seconds = match[6] ? parseInt(match[6], 10) : 0;

        // IST is UTC + 5:30. Subtract 5h 30m to get the exact UTC timestamp.
        const utcEpoch = Date.UTC(year, month, day, hours, minutes, seconds) - (5.5 * 60 * 60 * 1000);
        const d = new Date(utcEpoch);
        return isNaN(d.getTime()) ? null : d;
    }

    // Case 3: Date only "YYYY-MM-DD"
    const dateOnlyMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
        const year = parseInt(dateOnlyMatch[1], 10);
        const month = parseInt(dateOnlyMatch[2], 10) - 1;
        const day = parseInt(dateOnlyMatch[3], 10);
        const utcEpoch = Date.UTC(year, month, day, 0, 0, 0) - (5.5 * 60 * 60 * 1000);
        return new Date(utcEpoch);
    }

    // Fallback standard parse
    const fallbackDate = new Date(str);
    return isNaN(fallbackDate.getTime()) ? null : fallbackDate;
}

/**
 * Format order date & time into a unified, readable Indian Standard Time string.
 * Example outputs:
 * - Full: "03 Sep 2026, 06:30 PM"
 * - Date Only: "03 Sep 2026"
 * - Long: "3 September 2026, 06:30 PM"
 *
 * @param {string|number|Date} dateInput
 * @param {object} options
 * @returns {string}
 */
export function formatOrderDate(dateInput, options = {}) {
    const date = parseDateToUTC(dateInput);
    if (!date) return '—';

    const {
        includeTime = true,
        monthFormat = 'short', // 'short' (Sep) or 'long' (September) or 'numeric' (09)
        dayFormat = '2-digit', // '2-digit' (03) or 'numeric' (3)
        includeSeconds = false
    } = options;

    const formatterOptions = {
        timeZone: 'Asia/Kolkata',
        day: dayFormat,
        month: monthFormat,
        year: 'numeric',
        ...(includeTime ? {
            hour: '2-digit',
            minute: '2-digit',
            ...(includeSeconds ? { second: '2-digit' } : {}),
            hour12: true
        } : {})
    };

    return date.toLocaleString('en-IN', formatterOptions);
}

/**
 * Legacy compatible toIST helper matching Admin expectations
 */
export function toIST(dateInput, opts = {}) {
    const date = parseDateToUTC(dateInput);
    if (!date) return '';

    return date.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        ...opts
    });
}

/**
 * Formats a date input (ISO UTC string, MySQL datetime string, Date object)
 * into 'YYYY-MM-DDTHH:mm' in Asia/Kolkata (IST) timezone for HTML5 <input type="datetime-local">.
 *
 * @param {string|number|Date} dateInput
 * @returns {string} e.g. "2026-09-05T15:51"
 */
export function formatToLocalDateTimeInput(dateInput) {
    if (!dateInput) return '';
    const date = parseDateToUTC(dateInput);
    if (!date) return '';

    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).formatToParts(date);

    const map = {};
    for (const p of parts) {
        map[p.type] = p.value;
    }

    const hour = map.hour === '24' ? '00' : map.hour;
    return `${map.year}-${map.month}-${map.day}T${hour}:${map.minute}`;
}

/**
 * Format general app date (e.g. for returns, payments, refunds)
 */
export function formatAppDate(dateInput, includeTime = false) {
    return formatOrderDate(dateInput, {
        includeTime,
        monthFormat: 'short',
        dayFormat: '2-digit'
    });
}

