// Comprehensive Curated Google Fonts List for Vaiyaaree Storefront
export const GOOGLE_FONTS_LIST = [
    // ── Modern & Luxury Sans-Serif ──
    { name: 'Plus Jakarta Sans', category: 'Sans-Serif', weights: '300;400;500;600;700;800', description: 'Modern, clean & elegant geometry (Default)' },
    { name: 'Outfit', category: 'Sans-Serif', weights: '300;400;500;600;700;800', description: 'Contemporary brand typography with refined curves' },
    { name: 'Poppins', category: 'Sans-Serif', weights: '300;400;500;600;700;800', description: 'Popular geometric, balanced & friendly typography' },
    { name: 'Montserrat', category: 'Sans-Serif', weights: '300;400;500;600;700;800', description: 'Upscale, architectural & premium boutique feel' },
    { name: 'Inter', category: 'Sans-Serif', weights: '300;400;500;600;700;800', description: 'Ultra-crisp modern interface font for high legibility' },
    { name: 'DM Sans', category: 'Sans-Serif', weights: '400;500;700', description: 'Precise, minimalist & low-contrast modern aesthetic' },
    { name: 'Urbanist', category: 'Sans-Serif', weights: '300;400;500;600;700;800', description: 'Sleek luxury fashion sans-serif designed for retail' },
    { name: 'Jost', category: 'Sans-Serif', weights: '300;400;500;600;700;800', description: 'Futura-inspired elegant geometry & clean lines' },
    { name: 'Raleway', category: 'Sans-Serif', weights: '300;400;500;600;700;800', description: 'Sophisticated thin-to-bold headings with classy flair' },
    { name: 'Lato', category: 'Sans-Serif', weights: '300;400;700;900', description: 'Harmonious, warm & professional corporate aesthetic' },
    { name: 'Roboto', category: 'Sans-Serif', weights: '300;400;500;700;900', description: 'Clean universal readability with geometric forms' },
    { name: 'Open Sans', category: 'Sans-Serif', weights: '300;400;600;700;800', description: 'Neutral, open & highly accessible friendly sans' },
    { name: 'Nunito', category: 'Sans-Serif', weights: '300;400;600;700;800', description: 'Soft, rounded terminals for approachable charm' },
    { name: 'Work Sans', category: 'Sans-Serif', weights: '300;400;500;600;700', description: 'Modern editorial grotesque optimized for screens' },

    // ── Royal, Heritage & Editorial Serifs (Ideal for Indian Silk, Handlooms & Sarees) ──
    { name: 'Cinzel', category: 'Serif', weights: '400;500;600;700;800;900', description: 'Imperial Roman royal proportions for majestic luxury' },
    { name: 'Cormorant Garamond', category: 'Serif', weights: '400;500;600;700', description: 'Classical fine art luxury serif with heritage elegance' },
    { name: 'Cormorant Infant', category: 'Serif', weights: '300;400;500;600;700', description: 'Delicate high-fashion editorial serif with artistic grace' },
    { name: 'Playfair Display', category: 'Serif', weights: '400;500;600;700;800;900', description: 'Vogue-style high-contrast boutique headlines' },
    { name: 'Prata', category: 'Serif', weights: '400', description: 'Sculpted teardrop terminals & haute couture finesse' },
    { name: 'Bodoni Moda', category: 'Serif', weights: '400;500;600;700;800;900', description: 'Haute-couture fashion magazine headline icon' },
    { name: 'Lora', category: 'Serif', weights: '400;500;600;700', description: 'Contemporary calligraphic serif with soft flowing curves' },
    { name: 'Marcellus', category: 'Serif', weights: '400', description: 'Historic clarity & monumental temple architecture poise' },
    { name: 'EB Garamond', category: 'Serif', weights: '400;500;600;700;800', description: 'Renaissance heritage typography & timeless beauty' },
    { name: 'Merriweather', category: 'Serif', weights: '300;400;700;900', description: 'Sturdy, highly legible luxury body & article text' },
    { name: 'Italiana', category: 'Serif', weights: '400', description: 'Chic Italian calligraphy inspired by golden age fashion' },
    { name: 'Castoro', category: 'Serif', weights: '400', description: 'Warm scholarly Roman serif with balanced proportions' },
    { name: 'DM Serif Display', category: 'Serif', weights: '400', description: 'High-impact editorial titles with modern authority' },

    // ── Distinctive & Display ──
    { name: 'Rozha One', category: 'Display', weights: '400', description: 'Indian heritage Dev-Latin display with rich zari contrast' },
    { name: 'Syne', category: 'Display', weights: '400;500;600;700;800', description: 'Avant-garde experimental display font for bold statements' },
    { name: 'Marcellus SC', category: 'Display', weights: '400', description: 'Small-caps luxury monument style for royal badges' }
];

// Pre-curated Designer Font Pairings
export const FONT_PAIRING_PRESETS = [
    {
        id: 'royal_heritage',
        name: 'Royal Heritage',
        heading: 'Cinzel',
        body: 'Plus Jakarta Sans',
        badge: 'Recommended for Sarees',
        tagline: 'Regal Roman titles with crystal-clear modern body text'
    },
    {
        id: 'vogue_couture',
        name: 'Vogue Couture',
        heading: 'Playfair Display',
        body: 'Outfit',
        badge: 'High Fashion',
        tagline: 'Editorial magazine titles with contemporary balanced body'
    },
    {
        id: 'artisanal_silk',
        name: 'Artisanal Silk',
        heading: 'Cormorant Garamond',
        body: 'Poppins',
        badge: 'Handloom Classic',
        tagline: 'Graceful Renaissance serif paired with friendly geometric text'
    },
    {
        id: 'luxury_boutique',
        name: 'Luxury Boutique',
        heading: 'Bodoni Moda',
        body: 'Montserrat',
        badge: 'High Contrast',
        tagline: 'Dramatic Italian haute-couture titles with urban sophistication'
    },
    {
        id: 'modern_minimalist',
        name: 'Modern Minimalist',
        heading: 'Outfit',
        body: 'Plus Jakarta Sans',
        badge: 'Clean UI',
        tagline: 'Unified modern sans-serif pair for maximum speed & clarity'
    },
    {
        id: 'classic_literary',
        name: 'Classic Literary',
        heading: 'Lora',
        body: 'Inter',
        badge: 'Timeless',
        tagline: 'Warm calligraphic serif headings with ultra-sharp interface sans'
    }
];

// Generates Google Fonts <link> URL for selected font families
export function getGoogleFontsStylesheetUrl(bodyFont = 'Plus Jakarta Sans', headingFont = 'Cinzel') {
    const fontsToLoad = new Set([
        bodyFont || 'Plus Jakarta Sans',
        headingFont || 'Cinzel'
    ]);

    const familyParams = Array.from(fontsToLoad)
        .map(fontName => {
            const fontMeta = GOOGLE_FONTS_LIST.find(f => f.name.toLowerCase() === fontName.toLowerCase());
            const weights = fontMeta ? fontMeta.weights : '400;500;600;700';
            const cleanName = fontName.trim().replace(/\s+/g, '+');
            return `family=${cleanName}:wght@${weights}`;
        })
        .join('&');

    return `https://fonts.googleapis.com/css2?${familyParams}&display=swap`;
}
