import crypto from 'crypto';

/**
 * PBKDF2 Password Hashing with SHA-512, 100,000 iterations, and random 16-byte salt.
 * Output format: pbkdf2:sha512:<iterations>:<saltHex>:<hashHex>
 */
export function hashPassword(password, saltHex = null, iterations = 100000, keylen = 64, digest = 'sha512') {
    if (!password) return '';

    // Generate random 16-byte salt if not provided
    const salt = saltHex ? Buffer.from(saltHex, 'hex') : crypto.randomBytes(16);
    const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, keylen, digest);

    return `pbkdf2:${digest}:${iterations}:${salt.toString('hex')}:${derivedKey.toString('hex')}`;
}

/**
 * Verifies a password against a stored hash string.
 * Supports:
 * 1. Modern PBKDF2 format (pbkdf2:digest:iterations:saltHex:hashHex)
 * 2. Legacy SHA-256 (64 hex characters with salt / legacy salt)
 * 3. Legacy Plaintext comparison
 */
export function verifyPassword(password, storedHash) {
    if (!password || !storedHash) return false;

    const trimmed = String(storedHash).trim();

    // 1. PBKDF2 Verification
    if (trimmed.startsWith('pbkdf2:')) {
        const parts = trimmed.split(':');
        if (parts.length === 5) {
            const [, digest, iterationsStr, saltHex, expectedHashHex] = parts;
            const iterations = parseInt(iterationsStr, 10) || 100000;
            const salt = Buffer.from(saltHex, 'hex');
            const expectedHash = Buffer.from(expectedHashHex, 'hex');

            const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, expectedHash.length, digest);

            try {
                return crypto.timingSafeEqual(derivedKey, expectedHash);
            } catch (e) {
                return false;
            }
        }
    }

    // 2. Legacy SHA-256 Verification (64 characters hex)
    if (trimmed.length === 64 && /^[0-9a-fA-F]{64}$/.test(trimmed)) {
        const currentSalt = process.env.PASSWORD_SALT || 'vaiyaaree_default_salt';
        const currentSha256 = crypto.createHash('sha256').update(password + currentSalt).digest('hex');
        if (currentSha256.toLowerCase() === trimmed.toLowerCase()) return true;

        const legacySalt = 'aiswarya_default_salt';
        const legacySha256 = crypto.createHash('sha256').update(password + legacySalt).digest('hex');
        if (legacySha256.toLowerCase() === trimmed.toLowerCase()) return true;

        const plainSha256 = crypto.createHash('sha256').update(password).digest('hex');
        if (plainSha256.toLowerCase() === trimmed.toLowerCase()) return true;
    }

    // 3. Plaintext Direct Verification
    return password === storedHash;
}
