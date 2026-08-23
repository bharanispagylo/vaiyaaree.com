import crypto from 'crypto';

/**
 * Simple SHA-256 hashing for passwords.
 * In a production environment with npm access, bcrypt would be preferred.
 */
export function hashPassword(password) {
    if (!password) return '';
    // We use a salt from environment variables if available
    const salt = process.env.PASSWORD_SALT || 'vaiyaaree_default_salt';
    return crypto.createHash('sha256').update(password + salt).digest('hex');
}

/**
 * Verifies a password against a hash.
 */
export function verifyPassword(password, hash) {
    if (!password || !hash) return false;
    const currentHash = hashPassword(password);
    if (currentHash === hash) return true;

    // Backward compatibility with legacy salt
    const legacySalt = 'aiswarya_default_salt';
    const legacyHash = crypto.createHash('sha256').update(password + legacySalt).digest('hex');
    return legacyHash === hash;
}
