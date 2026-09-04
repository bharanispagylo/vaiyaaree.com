/**
 * Client & Server Safe User / Session Data Sanitizer
 * Guarantees that sensitive data (password hashes, admin_notes, OTPs, tokens)
 * is NEVER stored in localStorage or exposed to the client.
 */

export function sanitizeCustomerSession(user) {
    if (!user || typeof user !== 'object') return null;

    const {
        id,
        name,
        email,
        phone,
        country_code,
        address,
        city,
        state,
        pincode,
        role,
        is_verified,
        login_at
    } = user;

    // Filter and normalize phone
    const cleanPhone = phone ? String(phone).replace(/\D/g, '').slice(-10) : '';

    return {
        id: id !== undefined && id !== null ? String(id) : '',
        name: name ? String(name).trim() : '',
        email: email ? String(email).trim().toLowerCase() : '',
        phone: cleanPhone,
        country_code: country_code ? String(country_code).trim() : '+91',
        address: address ? String(address).trim() : '',
        city: city ? String(city).trim() : '',
        state: state ? String(state).trim() : 'Tamil Nadu',
        pincode: pincode ? String(pincode).trim() : '',
        role: role ? String(role).trim() : 'user',
        is_verified: Boolean(is_verified),
        login_at: typeof login_at === 'number' ? login_at : Date.now()
    };
}

export function sanitizeAdminProfile(admin) {
    if (!admin || typeof admin !== 'object') return null;

    const {
        username,
        role,
        email,
        full_name,
        name,
        login_at
    } = admin;

    return {
        username: username ? String(username).trim() : '',
        role: role ? String(role).trim() : 'Admin',
        email: email ? String(email).trim() : '',
        full_name: full_name ? String(full_name).trim() : (name ? String(name).trim() : (username ? String(username).trim() : 'Admin User')),
        login_at: typeof login_at === 'number' ? login_at : Date.now()
    };
}
