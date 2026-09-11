'use client';

import { useEffect } from 'react';
import { getGoogleFontsStylesheetUrl } from '@/lib/googleFontsList';

export default function StorefrontDynamicFontLoader({ bodyFont = 'Plus Jakarta Sans', headingFont = 'Cinzel' }) {
    useEffect(() => {
        const applyFonts = (bFont, hFont) => {
            const activeBody = bFont || 'Plus Jakarta Sans';
            const activeHeading = hFont || 'Cinzel';

            // 1. Ensure Google Font Stylesheet Link is injected in document <head>
            const linkId = 'vaiyaaree-google-font-link';
            let existingLink = document.getElementById(linkId);
            const targetHref = getGoogleFontsStylesheetUrl(activeBody, activeHeading);

            if (!existingLink) {
                existingLink = document.createElement('link');
                existingLink.id = linkId;
                existingLink.rel = 'stylesheet';
                existingLink.href = targetHref;
                document.head.appendChild(existingLink);
            } else if (existingLink.href !== targetHref) {
                existingLink.href = targetHref;
            }

            // 2. Set root CSS variables dynamically
            const root = document.documentElement;
            root.style.setProperty('--font-body', `"${activeBody}", "Plus Jakarta Sans", sans-serif`);
            root.style.setProperty('--font-primary', `"${activeBody}", "Plus Jakarta Sans", sans-serif`);
            root.style.setProperty('--font-heading', `"${activeHeading}", "${activeBody}", serif`);
            root.style.setProperty('--font-serif-royal', `"${activeHeading}", "Cinzel", serif`);
        };

        applyFonts(bodyFont, headingFont);

        // Listen for live updates dispatched from Admin Shop Settings
        const handleSettingsUpdated = () => {
            try {
                const storedBody = localStorage.getItem('vaiyaaree_theme_font_body');
                const storedHeading = localStorage.getItem('vaiyaaree_theme_font_heading');
                if (storedBody || storedHeading) {
                    applyFonts(storedBody || bodyFont, storedHeading || headingFont);
                }
            } catch (e) {}
        };

        window.addEventListener('vaiyaaree_settings_updated', handleSettingsUpdated);
        window.addEventListener('storage', handleSettingsUpdated);

        return () => {
            window.removeEventListener('vaiyaaree_settings_updated', handleSettingsUpdated);
            window.removeEventListener('storage', handleSettingsUpdated);
        };
    }, [bodyFont, headingFont]);

    return null;
}
