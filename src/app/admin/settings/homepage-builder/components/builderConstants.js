import {
    Layout,
    Sparkles,
    ShoppingCart,
    Grid,
    MessageSquare,
    Image as ImageIcon,
    FileText,
    Truck,
    Package,
    Layers
} from 'lucide-react';

export const SECTION_TEMPLATES = [
    {
        type: 'hero_banner',
        name: 'Hero Banner Slider',
        icon: Layout,
        badge: 'HERO SPOTLIGHT',
        desc: 'Top 50-50 banner slider with customized background slides, typography, and shop CTA buttons.',
        defaultTitle: 'Exclusive Weaves & Silks',
        defaultSubtitle: 'Celebrate Love with Timeless Handwoven Elegance',
        defaultSettings: {
            slides: [
                {
                    title: "Wedding & Festive Collection",
                    subtitle: "Celebrate Love with Timeless Handwoven Elegance",
                    image: "/uploads/media/without-watermark/CAT-C3FNP_1780653461488.jpg",
                    button_text: "SHOP NOW",
                    button_link: "/shop?category=Silk"
                },
                {
                    title: "Authentic Kanjivaram Pure Silks",
                    subtitle: "Woven by Master Artisans with Pure Zari Borders",
                    image: "/uploads/media/without-watermark/CAT-34H8O_1780639251590.jpg",
                    button_text: "SHOP NOW",
                    button_link: "/shop"
                }
            ],
            auto_play_interval: 5000
        }
    },
    {
        type: 'best_sellers',
        name: 'Best Sellers Collection',
        icon: Package,
        badge: 'TRENDING SELECTIONS',
        desc: 'Highlights trending best-selling sarees with animated hover cards and stock status.',
        defaultTitle: 'Best Sellers',
        defaultSubtitle: 'Explore our most loved handcrafted sarees chosen by patrons worldwide',
        defaultSettings: {
            limit: 8,
            auto_scroll: true,
            scroll_interval: 5000
        }
    },
    {
        type: 'shop_by_category',
        name: 'Shop by Category',
        icon: Layers,
        badge: 'CURATED WEAVES',
        desc: 'Visual category grid cards with background imagery and saree counts.',
        defaultTitle: 'Shop by Category',
        defaultSubtitle: 'Explore handcrafted weaves, rich silks, and everyday elegance in our exclusive saree ranges.',
        defaultSettings: {
            limit: 6,
            columns: 3
        }
    },
    {
        type: 'brand_story_logo',
        name: '50-50 Brand Story & Logo Section',
        icon: Sparkles,
        badge: 'BRAND HERITAGE',
        desc: '50-50 split section with rotating Rangoli mandala logo medallion on left and royal Maroon narrative on right.',
        defaultTitle: 'The Sacred Thread of Indian Grace',
        defaultSubtitle: 'Born from the timeless loom traditions of South India, Vaiyaaree weaves pure silk sarees that celebrate cultural heritage, feminine majesty, and generational artisan mastery.',
        defaultSettings: {
            logo_image: '/images/vaiyaaree-logo.png',
            button_text: 'EXPLORE OUR SILK CATALOG',
            button_link: '/shop'
        }
    },
    {
        type: 'explore_collection',
        name: 'Explore Our Weaves',
        icon: Grid,
        badge: 'HANDPICKED SELECTIONS',
        desc: 'Curated explore section displaying handpicked South Indian sarees.',
        defaultTitle: 'Explore Our Weaves',
        defaultSubtitle: 'Handpicked sarees showcasing the finest South Indian artistry',
        defaultSettings: {
            limit: 8,
            group_filter: 'EXPLORE',
            auto_scroll: true,
            scroll_interval: 6000
        }
    },
    {
        type: 'craftsmanship_story',
        name: 'Heritage & Craftsmanship Story',
        icon: FileText,
        badge: 'HERITAGE & CRAFTSMANSHIP',
        desc: 'Brand story section highlighting artisan traditions and handloom authenticity.',
        defaultTitle: 'Authentic Weaves, Timeless Grace',
        defaultSubtitle: 'Vaiyaaree brings you authentic handloom weaves straight from master artisans in South India. Discover rich silk sarees, soft cotton prints, and designer festive drapes tailored for every occasion.',
        defaultSettings: {
            image_url: '/uploads/media/without-watermark/CAT-HSZ16_1780638581090.jpg',
            button_text: 'EXPLORE CATALOG',
            button_link: '/shop'
        }
    },
    {
        type: 'gallery_popup',
        name: 'Collection Gallery with Lightbox Popup',
        icon: ImageIcon,
        badge: 'CUSTOMER SHOWCASE',
        desc: 'Interactive photo gallery grid with image zoom and full-screen lightbox modal.',
        defaultTitle: 'Our Collection Gallery',
        defaultSubtitle: 'Click any photo to zoom in and preview the fine intricate weave patterns in high definition.',
        defaultSettings: {
            enable_popup: true,
            auto_play: true,
            auto_play_delay: 3500,
            images: [
                '/uploads/media/without-watermark/CAT-34H8O_1780639251590.jpg',
                '/uploads/media/without-watermark/CAT-C3FNP_1780653461488.jpg',
                '/uploads/media/without-watermark/CAT-RPX8M_1780639172860.jpg',
                '/uploads/media/without-watermark/CAT-XZ8NL_1780639099964.jpg',
                '/uploads/media/without-watermark/CAT-AMB6I_1780639015058.jpg'
            ]
        }
    },
    {
        type: 'featured_product_slider',
        name: 'Featured Product Slider',
        icon: Sparkles,
        badge: 'CURATED PICKS',
        desc: 'Dynamic carousel showing featured products with auto-scroll and direct checkout links.',
        defaultTitle: 'Featured Collection',
        defaultSubtitle: 'Special handpicked silk & designer weaves for the festive season',
        defaultSettings: {
            limit: 10,
            auto_play_delay: 4000
        }
    },
    {
        type: 'all_product_slider',
        name: 'All Product Slider / Latest Arrivals',
        icon: ShoppingCart,
        badge: 'NEW ARRIVALS',
        desc: 'Carousel showcasing all active sarees in your catalog sorted by newest additions.',
        defaultTitle: 'Latest Additions',
        defaultSubtitle: 'Fresh arrivals crafted with unmatched precision and pure elegance',
        defaultSettings: {
            limit: 12,
            auto_play_delay: 4500
        }
    },
    {
        type: 'image_and_text',
        name: 'Image and Text (Split Banner)',
        icon: Layout,
        badge: 'WEAVER SPOTLIGHT',
        desc: 'Split layout with high-resolution image on the left and rich story content on the right.',
        defaultTitle: 'Pure Zari & Handcrafted Perfection',
        defaultSubtitle: 'Each saree in our collection takes up to 45 days of painstaking loom work by generational weavers, creating heirlooms that stay timeless across generations.',
        defaultSettings: {
            image_url: '/uploads/media/without-watermark/CAT-XZ8NL_1780639099964.jpg',
            button_text: 'READ WEAVER STORY',
            button_link: '/shop',
            image_aspect_ratio: '4/3'
        }
    },
    {
        type: 'text_and_image',
        name: 'Text and Image (Split Banner)',
        icon: Layout,
        badge: 'EXCLUSIVE SERVICES',
        desc: 'Split layout with rich story content on the left and high-resolution image on the right.',
        defaultTitle: 'Bespoke Custom Blouse & Fall Stitching',
        defaultSubtitle: 'Get your saree delivered pre-stitched with matching fall, pico, and custom-tailored designer blouses crafted to your exact fit.',
        defaultSettings: {
            image_url: '/uploads/media/without-watermark/CAT-AMB6I_1780639015058.jpg',
            button_text: 'EXPLORE SERVICES',
            button_link: '/shop',
            image_aspect_ratio: '4/3'
        }
    },
    {
        type: 'whatsapp_shopping',
        name: 'Shop via WhatsApp',
        icon: MessageSquare,
        badge: 'PERSONALIZED SHOPPING',
        desc: 'Direct WhatsApp shopping callout with QR code, feature bullet points, and live chat trigger.',
        defaultTitle: 'Shop via WhatsApp',
        defaultSubtitle: 'Connect directly with our saree experts, view live fabric photos, and place your order seamlessly via chat.',
        defaultSettings: {
            phone: '8667793292',
            features: ['Direct Fabric & Video Preview', 'Quick Order Confirmation & Tracking'],
            show_qr: true
        }
    },
    {
        type: 'feature_perks',
        name: 'Feature Perks & Trust Badges',
        icon: Truck,
        badge: 'OUR PROMISE',
        desc: 'Shipping, handcrafted authenticity, return policy, and support trust highlights.',
        defaultTitle: 'Why Choose Vaiyaaree',
        defaultSubtitle: 'Our commitment to authentic quality, trust, and exceptional service',
        defaultSettings: {
            perks: [
                { icon: 'Truck', title: "Free Shipping Nationwide", desc: "Completely free delivery across India" },
                { icon: 'Sparkles', title: "100% Authentic Handcraft", desc: "Direct from master weavers in Coimbatore" },
                { icon: 'MessageSquare', title: "WhatsApp Direct Order", desc: "Chat, view live fabrics & order via WhatsApp" },
                { icon: 'ShieldCheck', title: "Guaranteed Quality & Care", desc: "Hassle-free 10-day return & exchange window" }
            ]
        }
    }
];

export function getSectionIcon(type) {
    const tmpl = SECTION_TEMPLATES.find(t => t.type === type);
    const IconComp = tmpl?.icon || Layout;
    return <IconComp size={20} />;
}

export function getSectionTypeName(type) {
    const tmpl = SECTION_TEMPLATES.find(t => t.type === type);
    return tmpl?.name || type?.replace(/_/g, ' ')?.toUpperCase() || 'Custom Section';
}
