export const COUNTRY_CODES = [
    { code: '+91', name: 'India', flag: '🇮🇳', digits: 10 },
    { code: '+1', name: 'USA / Canada', flag: '🇺🇸', digits: 10 },
    { code: '+44', name: 'United Kingdom', flag: '🇬🇧', digits: 10 },
    { code: '+971', name: 'United Arab Emirates', flag: '🇦🇪', digits: 9 },
    { code: '+65', name: 'Singapore', flag: '🇸🇬', digits: 8 },
    { code: '+60', name: 'Malaysia', flag: '🇲🇾', digits: 9 },
    { code: '+61', name: 'Australia', flag: '🇦🇺', digits: 9 },
    { code: '+94', name: 'Sri Lanka', flag: '🇱🇰', digits: 9 },
    { code: '+966', name: 'Saudi Arabia', flag: '🇸🇦', digits: 9 },
    { code: '+974', name: 'Qatar', flag: '🇶🇦', digits: 8 },
    { code: '+968', name: 'Oman', flag: '🇴🇲', digits: 8 },
    { code: '+965', name: 'Kuwait', flag: '🇰🇼', digits: 8 },
    { code: '+973', name: 'Bahrain', flag: '🇧🇭', digits: 8 },
    { code: '+64', name: 'New Zealand', flag: '🇳🇿', digits: 9 },
    { code: '+49', name: 'Germany', flag: '🇩🇪', digits: 10 },
    { code: '+33', name: 'France', flag: '🇫🇷', digits: 9 },
    { code: '+39', name: 'Italy', flag: '🇮🇹', digits: 10 },
    { code: '+81', name: 'Japan', flag: '🇯🇵', digits: 10 },
    { code: '+82', name: 'South Korea', flag: '🇰🇷', digits: 10 },
    { code: '+86', name: 'China', flag: '🇨🇳', digits: 11 },
    { code: '+880', name: 'Bangladesh', flag: '🇧🇩', digits: 10 },
    { code: '+977', name: 'Nepal', flag: '🇳🇵', digits: 10 },
    { code: '+27', name: 'South Africa', flag: '🇿🇦', digits: 9 }
];

export const DEFAULT_COUNTRY_CODE = '+91';

/**
 * Parses raw input and extracts country code and clean national phone number.
 */
export function parsePhoneInput(rawInput, fallbackCountryCode = '+91') {
    if (!rawInput) return { countryCode: fallbackCountryCode, phone: '' };

    const str = String(rawInput).trim();
    
    // Check if input starts with a known country code (+91, +1, +44, etc.)
    for (const c of COUNTRY_CODES) {
        if (str.startsWith(c.code)) {
            const cleanDigits = str.slice(c.code.length).replace(/\D/g, '');
            return { countryCode: c.code, phone: cleanDigits };
        }
    }

    // Check if starts with digits of country code (e.g. 919876543210 where 91 is India)
    const digitsOnly = str.replace(/\D/g, '');
    if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
        return { countryCode: '+91', phone: digitsOnly.slice(2) };
    }

    // Default clean
    const cleanDigits = digitsOnly.slice(-10);
    return { countryCode: fallbackCountryCode, phone: cleanDigits || digitsOnly };
}

/**
 * Format country code and phone for display
 */
export function formatDisplayPhone(countryCode = '+91', phone = '') {
    const clean = String(phone || '').replace(/\D/g, '');
    if (!clean) return '';
    const code = countryCode ? (countryCode.startsWith('+') ? countryCode : `+${countryCode}`) : '+91';
    return `${code} ${clean}`;
}
