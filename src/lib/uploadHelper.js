/**
 * Upload Helper Utilities
 * Provides unified file validation and safe response parsing to prevent
 * "Unexpected token 'R', Request En... is not valid JSON" errors on large payloads.
 */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_UPLOAD_MB = 10;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/svg+xml'];
export const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'svg'];

/**
 * Validates file size and MIME/extension type on the client side before sending.
 * @param {File} file
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateImageFile(file) {
    if (!file) {
        return { valid: false, error: 'No file selected.' };
    }

    const ext = file.name ? file.name.split('.').pop().toLowerCase() : '';
    const isTypeValid = ALLOWED_IMAGE_TYPES.includes(file.type) || ALLOWED_IMAGE_EXTENSIONS.includes(ext);

    if (!isTypeValid) {
        return {
            valid: false,
            error: `File "${file.name}" has an unsupported format. Only JPG, JPEG, PNG, and SVG formats are allowed.`
        };
    }

    if (typeof file.size === 'number' && file.size > MAX_UPLOAD_BYTES) {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        return {
            valid: false,
            error: `File "${file.name}" (${sizeMb}MB) exceeds the maximum upload limit of ${MAX_UPLOAD_MB}MB. Please choose a smaller image.`
        };
    }

    return { valid: true, error: null };
}

/**
 * Safely parses response from /api/admin/upload.
 * Prevents SyntaxError when server or proxy responds with non-JSON text (e.g., HTTP 413 "Request Entity Too Large").
 * @param {Response} res Fetch response object
 * @returns {Promise<any>}
 */
export async function parseUploadResponse(res) {
    const text = await res.text();
    let data;

    try {
        data = JSON.parse(text);
    } catch (_) {
        const lowerText = (text || '').toLowerCase();
        if (
            res.status === 413 ||
            lowerText.includes('request entity too large') ||
            lowerText.includes('payload too large') ||
            (text && text.trim().startsWith('Request En'))
        ) {
            throw new Error(`File exceeds the server maximum upload limit of ${MAX_UPLOAD_MB}MB. Please choose a smaller image.`);
        }

        if (res.status === 401) {
            throw new Error('Unauthorized. Please log in again to upload files.');
        }

        throw new Error(
            text && text.length < 200 && !text.includes('<html')
                ? text.trim()
                : `Upload failed (Status ${res.status}). Please try again with a smaller file.`
        );
    }

    if (!res.ok) {
        throw new Error(data?.error || `Upload failed with status ${res.status}`);
    }

    return data;
}
