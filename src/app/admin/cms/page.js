'use client';

import { useState, useEffect, useRef } from 'react';
import {
    Plus, Edit, Trash2, Search, Loader2, FileText, Check, X,
    Eye, ExternalLink, Globe, Layout,
    Settings, Image as ImageIcon, Code, BarChart, Lock,
    ChevronUp, ChevronDown, Copy, Monitor, Smartphone, Tablet, Upload,
    Layers, HelpCircle, MessageSquare, Columns, AlignLeft, Sparkles, RefreshCw
} from 'lucide-react';
import { mysqlClient } from '@/lib/mysqlClient';
import ModalPortal from '@/components/ModalPortal';
import { useRouter } from 'next/navigation';
import MediaPicker from '@/components/MediaPicker';

const TABS = [
    { id: 'content', label: 'Live Page Builder', icon: Layout },
    { id: 'seo', label: 'Google Search Info', icon: BarChart },
    { id: 'appearance', label: 'Design & Layout', icon: ImageIcon },
    { id: 'advanced', label: 'Technical Settings', icon: Code },
];

// Block definitions with default template data
const BLOCK_TYPES = [
    {
        type: 'hero',
        label: 'Hero Story Banner',
        icon: Sparkles,
        description: 'Centered large title, badge, and intro narrative',
        createDefault: () => ({
            id: 'b_' + Math.random().toString(36).substr(2, 9),
            type: 'hero',
            badge: 'Welcome to Vaiyaaree',
            title: 'The Art of Indian Weaves',
            subtitle: 'A fantastic blend of style, fashion, colors, and quality designed for modern saree connoisseurs.',
            bgStyle: 'cream' // 'cream' | 'white' | 'maroon'
        })
    },
    {
        type: 'text_image',
        label: 'Text Left, Image Right',
        icon: AlignLeft,
        description: 'Heritage narrative on left, beautiful saree photo on right',
        createDefault: () => ({
            id: 'b_' + Math.random().toString(36).substr(2, 9),
            type: 'text_image',
            tag: 'Our Heritage',
            title: 'Crafted with Love & Tradition',
            text1: 'Our journey began with a simple idea: to create a platform where saree lovers could find the most exquisite, authentic collection of handwoven and printed sarees from across India.',
            text2: 'Started as an Instagram-based business with South cotton printed sarees, we have been committed to promoting traditional Indian textiles and sustainable craftsmanship.',
            imageUrl: '/images/about-us-saree.jpg',
            imageAlt: 'Vaiyaaree Heritage Saree'
        })
    },
    {
        type: 'image_text',
        label: 'Image Left, Text Right',
        icon: Columns,
        description: 'Featured saree showcase image on left, story on right',
        createDefault: () => ({
            id: 'b_' + Math.random().toString(36).substr(2, 9),
            type: 'image_text',
            tag: 'Authentic Artistry',
            title: 'Every Weave Tells a Story',
            text1: 'Each print is designed with meticulous attention to detail, using breathable natural fabrics and traditional hand-block printing techniques passed down through generations.',
            text2: 'With over 100K+ trusted customers on Instagram and across India, our passion is bringing you authentic fashion that elevates your everyday and festive elegance.',
            imageUrl: '/images/about-us-saree.jpg',
            imageAlt: 'Artisan Craftsmanship'
        })
    },
    {
        type: 'full_text',
        label: 'Full Width Text Block',
        icon: FileText,
        description: 'Wide column story section with elegant border framing',
        createDefault: () => ({
            id: 'b_' + Math.random().toString(36).substr(2, 9),
            type: 'full_text',
            title: 'Our Philosophy & Promise',
            text1: 'We believe true elegance is effortless. By partnering directly with skilled master weavers and craft clusters, we ensure that every drape delivers timeless beauty, supreme comfort, and honest pricing.',
            text2: 'From pure south cottons to contemporary festive prints with readymade blouses, each collection is curated with love, care, and an unwavering commitment to quality.'
        })
    },
    {
        type: 'features',
        label: '3-Column Feature Cards',
        icon: Columns,
        description: '3 highlighted value pillars or promises in card grids',
        createDefault: () => ({
            id: 'b_' + Math.random().toString(36).substr(2, 9),
            type: 'features',
            items: [
                { title: '100% Authentic Handcraft', desc: 'Sourced directly from heritage weaving clusters across India.' },
                { title: 'Premium Comfort Fabric', desc: 'Breathable, soft, lightweight, and pre-tested so prints never fade.' },
                { title: '100K+ Trusted Community', desc: 'Loved and trusted by thousands of happy saree enthusiasts nationwide.' }
            ]
        })
    },
    {
        type: 'quote',
        label: 'Quote / Highlight Box',
        icon: MessageSquare,
        description: 'Styled callout box with maroon left accent border',
        createDefault: () => ({
            id: 'b_' + Math.random().toString(36).substr(2, 9),
            type: 'quote',
            quote: 'Each print has a story to tell, and each saree is created with a lot of love.',
            author: '— Yours, Vaiyaaree Sarees'
        })
    },
    {
        type: 'faq',
        label: 'FAQ / Accordion List',
        icon: HelpCircle,
        description: 'Expandable Q&A accordion list for user questions',
        createDefault: () => ({
            id: 'b_' + Math.random().toString(36).substr(2, 9),
            type: 'faq',
            title: 'Frequently Asked Questions',
            items: [
                { question: 'How long does shipping and delivery take?', answer: 'We dispatch orders within 2–3 business days. Delivery typically takes 5–7 working days across India.' },
                { question: 'Do you provide ready-to-wear blouses with stitching?', answer: 'Yes, selected sarees come with ready-made stitched blouses available in sizes 32 to 42 with convenient margin alterations.' }
            ]
        })
    },
    {
        type: 'custom_html',
        label: 'Custom HTML / Embed',
        icon: Code,
        description: 'Raw HTML markup, maps, video embeds, or custom scripts',
        createDefault: () => ({
            id: 'b_' + Math.random().toString(36).substr(2, 9),
            type: 'custom_html',
            code: '<div style="padding: 20px; background: #fafafa; border: 1px dashed #ccc; text-align: center; border-radius: 8px;">\n  <p style="margin: 0; color: #666;">Custom HTML block content</p>\n</div>'
        })
    }
];

// Compile structured block objects to clean, production-ready HTML
function blocksToHtml(blocks) {
    if (!blocks || blocks.length === 0) return '';
    return blocks.map(b => {
        switch (b.type) {
            case 'hero': {
                const bgColors = {
                    cream: 'background: #fdfbf7; border: 1px solid #f0e6d2; color: #111;',
                    white: 'background: #ffffff; border: 1px solid #eee; color: #111;',
                    maroon: 'background: #5d0821; border: 1px solid #480619; color: #ffffff;'
                };
                const bg = bgColors[b.bgStyle] || bgColors.cream;
                const isMaroon = b.bgStyle === 'maroon';
                return `<section class="cms-block-hero" style="padding: 60px 24px; text-align: center; ${bg} border-radius: 16px; margin: 30px 0;">
  ${b.badge ? `<span style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; color: ${isMaroon ? '#fde68a' : '#5d0821'}; display: block; margin-bottom: 10px;">${b.badge}</span>` : ''}
  <h1 style="font-size: 2.75rem; color: ${isMaroon ? '#ffffff' : '#111111'}; margin: 0 0 16px 0; font-weight: 600; line-height: 1.25;">${b.title || ''}</h1>
  ${b.subtitle ? `<p style="font-size: 1.15rem; color: ${isMaroon ? '#f3f4f6' : '#666666'}; max-width: 680px; margin: 0 auto; line-height: 1.7;">${b.subtitle}</p>` : ''}
</section>`;
            }

            case 'text_image': {
                return `<div class="cms-block-text-image" style="display: flex; gap: 40px; align-items: center; margin: 40px 0; flex-wrap: wrap;">
  <div style="flex: 1 1 340px; min-width: 280px;">
    ${b.tag ? `<span style="display: inline-block; font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #5d0821; margin-bottom: 8px;">${b.tag}</span>` : ''}
    <h2 style="font-size: 1.85rem; font-weight: 600; color: #111; margin: 0 0 16px 0; line-height: 1.3;">${b.title || ''}</h2>
    ${b.text1 ? `<p style="font-size: 1.05rem; line-height: 1.8; color: #444; margin-bottom: 16px;">${b.text1}</p>` : ''}
    ${b.text2 ? `<p style="font-size: 1.05rem; line-height: 1.8; color: #444; margin: 0;">${b.text2}</p>` : ''}
  </div>
  <div style="flex: 1 1 340px; min-width: 280px;">
    <img src="${b.imageUrl || '/images/about-us-saree.jpg'}" alt="${b.imageAlt || 'Vaiyaaree Saree'}" style="width: 100%; height: auto; border-radius: 12px; box-shadow: 0 12px 32px rgba(0,0,0,0.08); object-fit: cover; display: block;" />
  </div>
</div>`;
            }

            case 'image_text': {
                return `<div class="cms-block-image-text" style="display: flex; gap: 40px; align-items: center; margin: 40px 0; flex-wrap: wrap;">
  <div style="flex: 1 1 340px; min-width: 280px;">
    <img src="${b.imageUrl || '/images/about-us-saree.jpg'}" alt="${b.imageAlt || 'Vaiyaaree Saree'}" style="width: 100%; height: auto; border-radius: 12px; box-shadow: 0 12px 32px rgba(0,0,0,0.08); object-fit: cover; display: block;" />
  </div>
  <div style="flex: 1 1 340px; min-width: 280px;">
    ${b.tag ? `<span style="display: inline-block; font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #5d0821; margin-bottom: 8px;">${b.tag}</span>` : ''}
    <h2 style="font-size: 1.85rem; font-weight: 600; color: #111; margin: 0 0 16px 0; line-height: 1.3;">${b.title || ''}</h2>
    ${b.text1 ? `<p style="font-size: 1.05rem; line-height: 1.8; color: #444; margin-bottom: 16px;">${b.text1}</p>` : ''}
    ${b.text2 ? `<p style="font-size: 1.05rem; line-height: 1.8; color: #444; margin: 0;">${b.text2}</p>` : ''}
  </div>
</div>`;
            }

            case 'full_text': {
                return `<div class="cms-block-full-text" style="margin: 40px 0; padding: 32px 0; border-top: 1px solid #eee; border-bottom: 1px solid #eee;">
  <div style="max-width: 820px; margin: 0 auto; text-align: left;">
    <h2 style="font-size: 2rem; font-weight: 600; color: #111; margin-bottom: 20px; line-height: 1.3;">${b.title || ''}</h2>
    ${b.text1 ? `<p style="font-size: 1.15rem; line-height: 1.85; color: #333; margin-bottom: 18px; font-weight: 400;">${b.text1}</p>` : ''}
    ${b.text2 ? `<p style="font-size: 1.05rem; line-height: 1.8; color: #555; margin: 0;">${b.text2}</p>` : ''}
  </div>
</div>`;
            }

            case 'features': {
                const itemsHtml = (b.items || []).map(item => `  <div style="padding: 24px; background: #fcfcfc; border: 1px solid #eee; border-radius: 12px; text-align: center;">
    <h3 style="font-size: 1.2rem; color: #111; margin: 0 0 8px 0;">${item.title || ''}</h3>
    <p style="font-size: 0.95rem; color: #666; line-height: 1.6; margin: 0;">${item.desc || ''}</p>
  </div>`).join('\n');
                return `<div class="cms-block-features" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin: 40px 0;">
${itemsHtml}
</div>`;
            }

            case 'quote': {
                return `<blockquote class="cms-block-quote" style="margin: 40px 0; padding: 28px 36px; background: #faf7f2; border-left: 4px solid #5d0821; border-radius: 0 12px 12px 0;">
  <p style="font-size: 1.25rem; font-style: italic; color: #222; line-height: 1.7; margin: 0 0 12px 0;">
    "${b.quote || ''}"
  </p>
  <footer style="font-size: 0.95rem; font-weight: 600; color: #5d0821;">${b.author || ''}</footer>
</blockquote>`;
            }

            case 'faq': {
                const faqItemsHtml = (b.items || []).map(item => `  <details style="padding: 16px 20px; border: 1px solid #eaeaea; border-radius: 10px; margin-bottom: 12px; background: #fff;">
    <summary style="font-weight: 600; cursor: pointer; color: #111; font-size: 1rem;">${item.question || ''}</summary>
    <p style="margin-top: 10px; color: #555; line-height: 1.6; font-size: 0.95rem;">${item.answer || ''}</p>
  </details>`).join('\n');
                return `<div class="cms-block-faq" style="margin: 40px 0;">
  ${b.title ? `<h2 style="text-align: center; margin-bottom: 24px; color: #111; font-size: 1.75rem;">${b.title}</h2>` : ''}
${faqItemsHtml}
</div>`;
            }

            case 'custom_html': {
                return b.code || '';
            }

            default:
                return '';
        }
    }).join('\n\n');
}

// Convert HTML content into structured editable blocks
function htmlToBlocks(html) {
    if (!html || !html.trim()) {
        return [
            BLOCK_TYPES[0].createDefault(),
            BLOCK_TYPES[1].createDefault(),
            BLOCK_TYPES[2].createDefault(),
            BLOCK_TYPES[3].createDefault()
        ];
    }

    if (typeof window === 'undefined') return [];

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const nodes = Array.from(doc.body.children);
        const blocks = [];

        nodes.forEach(el => {
            const cls = el.className || '';

            if (cls.includes('cms-block-hero') || el.tagName === 'SECTION') {
                const badge = el.querySelector('span')?.textContent || '';
                const title = el.querySelector('h1')?.textContent || el.querySelector('h2')?.textContent || '';
                const subtitle = el.querySelector('p')?.textContent || '';
                blocks.push({
                    id: 'b_' + Math.random().toString(36).substr(2, 9),
                    type: 'hero',
                    badge: badge.trim(),
                    title: title.trim(),
                    subtitle: subtitle.trim(),
                    bgStyle: el.style.background?.includes('5d0821') ? 'maroon' : 'cream'
                });
            } else if (cls.includes('cms-block-text-image')) {
                const tag = el.querySelector('span')?.textContent || '';
                const title = el.querySelector('h2')?.textContent || '';
                const paragraphs = Array.from(el.querySelectorAll('p')).map(p => p.textContent.trim());
                const img = el.querySelector('img');
                blocks.push({
                    id: 'b_' + Math.random().toString(36).substr(2, 9),
                    type: 'text_image',
                    tag: tag.trim(),
                    title: title.trim(),
                    text1: paragraphs[0] || '',
                    text2: paragraphs[1] || '',
                    imageUrl: img?.getAttribute('src') || '/images/about-us-saree.jpg',
                    imageAlt: img?.getAttribute('alt') || 'Vaiyaaree Saree'
                });
            } else if (cls.includes('cms-block-image-text')) {
                const tag = el.querySelector('span')?.textContent || '';
                const title = el.querySelector('h2')?.textContent || '';
                const paragraphs = Array.from(el.querySelectorAll('p')).map(p => p.textContent.trim());
                const img = el.querySelector('img');
                blocks.push({
                    id: 'b_' + Math.random().toString(36).substr(2, 9),
                    type: 'image_text',
                    tag: tag.trim(),
                    title: title.trim(),
                    text1: paragraphs[0] || '',
                    text2: paragraphs[1] || '',
                    imageUrl: img?.getAttribute('src') || '/images/about-us-saree.jpg',
                    imageAlt: img?.getAttribute('alt') || 'Vaiyaaree Saree'
                });
            } else if (cls.includes('cms-block-full-text')) {
                const title = el.querySelector('h2')?.textContent || '';
                const paragraphs = Array.from(el.querySelectorAll('p')).map(p => p.textContent.trim());
                blocks.push({
                    id: 'b_' + Math.random().toString(36).substr(2, 9),
                    type: 'full_text',
                    title: title.trim(),
                    text1: paragraphs[0] || '',
                    text2: paragraphs[1] || ''
                });
            } else if (cls.includes('cms-block-features')) {
                const itemDivs = Array.from(el.children);
                const items = itemDivs.map(card => ({
                    title: card.querySelector('h3')?.textContent?.trim() || '',
                    desc: card.querySelector('p')?.textContent?.trim() || ''
                }));
                blocks.push({
                    id: 'b_' + Math.random().toString(36).substr(2, 9),
                    type: 'features',
                    items: items.length > 0 ? items : [
                        { title: 'Feature 1', desc: 'Description 1' },
                        { title: 'Feature 2', desc: 'Description 2' }
                    ]
                });
            } else if (cls.includes('cms-block-quote') || el.tagName === 'BLOCKQUOTE') {
                const quote = el.querySelector('p')?.textContent?.replace(/^["“]|["”]$/g, '').trim() || el.textContent.trim();
                const author = el.querySelector('footer')?.textContent?.trim() || '';
                blocks.push({
                    id: 'b_' + Math.random().toString(36).substr(2, 9),
                    type: 'quote',
                    quote,
                    author
                });
            } else if (cls.includes('cms-block-faq')) {
                const title = el.querySelector('h2')?.textContent?.trim() || 'Frequently Asked Questions';
                const details = Array.from(el.querySelectorAll('details'));
                const items = details.map(d => ({
                    question: d.querySelector('summary')?.textContent?.trim() || '',
                    answer: d.querySelector('p')?.textContent?.trim() || ''
                }));
                blocks.push({
                    id: 'b_' + Math.random().toString(36).substr(2, 9),
                    type: 'faq',
                    title,
                    items: items.length > 0 ? items : [{ question: 'Question?', answer: 'Answer.' }]
                });
            } else {
                // Fallback for custom HTML chunks or basic paragraphs
                blocks.push({
                    id: 'b_' + Math.random().toString(36).substr(2, 9),
                    type: 'custom_html',
                    code: el.outerHTML
                });
            }
        });

        return blocks.length > 0 ? blocks : [
            {
                id: 'b_' + Math.random().toString(36).substr(2, 9),
                type: 'custom_html',
                code: html
            }
        ];
    } catch (err) {
        console.error('Error parsing HTML to blocks:', err);
        return [
            {
                id: 'b_' + Math.random().toString(36).substr(2, 9),
                type: 'custom_html',
                code: html
            }
        ];
    }
}

export default function CMSPage() {
    const router = useRouter();
    const [pages, setPages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentPage, setCurrentPage] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [notification, setNotification] = useState(null);
    const [activeTab, setActiveTab] = useState('content');
    const [saving, setSaving] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);

    // Page Form State
    const [pageTitle, setPageTitle] = useState('');
    const [pageSlug, setPageSlug] = useState('');
    const [pageStatus, setPageStatus] = useState('published');
    const [pageTemplate, setPageTemplate] = useState('default');
    const [menuOrder, setMenuOrder] = useState(0);
    const [parentId, setParentId] = useState('none');
    const [seoTitle, setSeoTitle] = useState('');
    const [metaDescription, setMetaDescription] = useState('');
    const [customCss, setCustomCss] = useState('');
    const [customJs, setCustomJs] = useState('');

    // Visual Builder States
    const [editorMode, setEditorMode] = useState('visual'); // 'visual' | 'code'
    const [blocks, setBlocks] = useState([]);
    const [selectedBlockId, setSelectedBlockId] = useState(null);
    const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop' | 'tablet' | 'mobile'
    const [rawHtmlCode, setRawHtmlCode] = useState('');

    // Media Picker States
    const [showMediaPicker, setShowMediaPicker] = useState(false);
    const [activeMediaTarget, setActiveMediaTarget] = useState(null); // { type: 'og_image' | 'featured_image' | 'block_image', blockId?: string }
    const [ogImageUrl, setOgImageUrl] = useState('');
    const [featuredImageUrl, setFeaturedImageUrl] = useState('');

    const fetchPages = async () => {
        setLoading(true);
        try {
            const { data, error } = await mysqlClient
                .from('cms_pages')
                .select('*')
                .order('menu_order', { ascending: true })
                .order('created_at', { ascending: false });
            if (error) throw error;
            setPages(data || []);
        } catch (error) {
            console.error('Error fetching CMS pages:', error);
            showNotification('Failed to fetch pages', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPages();

        const handleReset = () => {
            setIsEditing(false);
            setCurrentPage(null);
        };
        window.addEventListener('resetAdminView', handleReset);
        return () => window.removeEventListener('resetAdminView', handleReset);
    }, []);

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3500);
    };

    const handleStartNewPage = () => {
        setCurrentPage(null);
        setPageTitle('');
        setPageSlug('');
        setPageStatus('published');
        setPageTemplate('default');
        setMenuOrder(0);
        setParentId('none');
        setSeoTitle('');
        setMetaDescription('');
        setOgImageUrl('');
        setFeaturedImageUrl('');
        setCustomCss('');
        setCustomJs('');
        const initialBlocks = [
            BLOCK_TYPES[0].createDefault(),
            BLOCK_TYPES[1].createDefault(),
            BLOCK_TYPES[2].createDefault(),
            BLOCK_TYPES[3].createDefault()
        ];
        setBlocks(initialBlocks);
        setSelectedBlockId(initialBlocks[0].id);
        setRawHtmlCode(blocksToHtml(initialBlocks));
        setEditorMode('visual');
        setActiveTab('content');
        setIsEditing(true);
    };

    const handleEditPage = (page) => {
        setCurrentPage(page);
        setPageTitle(page.title || '');
        setPageSlug(page.slug || '');
        setPageStatus(page.status || 'published');
        setPageTemplate(page.template || 'default');
        setMenuOrder(page.menu_order || 0);
        setParentId(page.parent_id || 'none');
        setSeoTitle(page.seo_title || '');
        setMetaDescription(page.meta_description || '');
        setOgImageUrl(page.og_image || '');
        setFeaturedImageUrl(page.featured_image || '');
        setCustomCss(page.custom_css || '');
        setCustomJs(page.custom_js || '');

        const parsedBlocks = htmlToBlocks(page.content || '');
        setBlocks(parsedBlocks);
        setSelectedBlockId(parsedBlocks.length > 0 ? parsedBlocks[0].id : null);
        setRawHtmlCode(page.content || '');
        setEditorMode('visual');
        setActiveTab('content');
        setIsEditing(true);
    };

    const generateSlug = (title) => {
        return title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
    };

    // Block Management Handlers
    const addBlock = (type) => {
        const blockDef = BLOCK_TYPES.find(b => b.type === type) || BLOCK_TYPES[0];
        const newBlock = blockDef.createDefault();
        const updatedBlocks = [...blocks, newBlock];
        setBlocks(updatedBlocks);
        setSelectedBlockId(newBlock.id);
        setRawHtmlCode(blocksToHtml(updatedBlocks));
    };

    const updateBlock = (id, updates) => {
        const updatedBlocks = blocks.map(b => b.id === id ? { ...b, ...updates } : b);
        setBlocks(updatedBlocks);
        setRawHtmlCode(blocksToHtml(updatedBlocks));
    };

    const removeBlock = (id) => {
        const updatedBlocks = blocks.filter(b => b.id !== id);
        setBlocks(updatedBlocks);
        if (selectedBlockId === id) {
            setSelectedBlockId(updatedBlocks.length > 0 ? updatedBlocks[0].id : null);
        }
        setRawHtmlCode(blocksToHtml(updatedBlocks));
    };

    const moveBlock = (index, direction) => {
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= blocks.length) return;
        const newBlocks = [...blocks];
        const [moved] = newBlocks.splice(index, 1);
        newBlocks.splice(targetIndex, 0, moved);
        setBlocks(newBlocks);
        setRawHtmlCode(blocksToHtml(newBlocks));
    };

    const duplicateBlock = (block) => {
        const index = blocks.findIndex(b => b.id === block.id);
        const duplicated = JSON.parse(JSON.stringify(block));
        duplicated.id = 'b_' + Math.random().toString(36).substr(2, 9);
        const newBlocks = [...blocks];
        newBlocks.splice(index + 1, 0, duplicated);
        setBlocks(newBlocks);
        setSelectedBlockId(duplicated.id);
        setRawHtmlCode(blocksToHtml(newBlocks));
    };

    // Switch between Visual and Code mode
    const handleSwitchToCode = () => {
        setRawHtmlCode(blocksToHtml(blocks));
        setEditorMode('code');
    };

    const handleSwitchToVisual = () => {
        const parsed = htmlToBlocks(rawHtmlCode);
        setBlocks(parsed);
        setSelectedBlockId(parsed.length > 0 ? parsed[0].id : null);
        setEditorMode('visual');
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);

        const compiledHtml = editorMode === 'visual' ? blocksToHtml(blocks) : rawHtmlCode;

        const pageData = {
            title: pageTitle,
            slug: pageSlug || generateSlug(pageTitle),
            content: compiledHtml,
            is_published: pageStatus === 'published',
            status: pageStatus,
            template: pageTemplate,
            menu_order: parseInt(menuOrder || 0),
            meta_description: metaDescription,
            seo_title: seoTitle,
            og_image: ogImageUrl,
            featured_image: featuredImageUrl,
            custom_css: customCss,
            custom_js: customJs,
            parent_id: parentId === 'none' ? null : parentId
        };

        try {
            if (currentPage?.id) {
                const { error } = await mysqlClient.from('cms_pages').update(pageData).eq('id', currentPage.id);
                if (error) throw error;
                showNotification('Page successfully updated with Live Builder!');
            } else {
                const { error } = await mysqlClient.from('cms_pages').insert([pageData]);
                if (error) throw error;
                showNotification('New page created and published successfully!');
            }
            setIsEditing(false);
            setCurrentPage(null);
            fetchPages();
        } catch (error) {
            console.error('Save Error:', error);
            showNotification(error.message || 'Failed to save page', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        setConfirmAction({
            title: 'Delete Page?',
            message: 'Are you sure you want to delete this page? This will permanently remove all its content, layout blocks, and SEO settings.',
            btnText: 'Delete Page',
            onConfirm: async () => {
                setConfirmAction(null);
                try {
                    const { error } = await mysqlClient.from('cms_pages').delete().eq('id', id);
                    if (error) throw error;
                    showNotification('Page removed successfully');
                    fetchPages();
                } catch (error) {
                    console.error('Delete Error:', error);
                    showNotification('Deletion failed', 'error');
                }
            }
        });
    };

    const filteredPages = pages.filter(page =>
        page.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        page.slug?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const activeBlock = blocks.find(b => b.id === selectedBlockId);

    const renderBlockEditorFields = (block) => {
        if (!block) return null;
        switch (block.type) {
            case 'hero':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div>
                            <label style={labelStyle}>Small Badge / Super Title</label>
                            <input
                                value={block.badge || ''}
                                onChange={e => updateBlock(block.id, { badge: e.target.value })}
                                style={inputStyle}
                                placeholder="e.g. Welcome to Vaiyaaree"
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Hero Main Heading</label>
                            <input
                                value={block.title || ''}
                                onChange={e => updateBlock(block.id, { title: e.target.value })}
                                style={{ ...inputStyle, fontWeight: 700 }}
                                placeholder="e.g. The Art of Indian Weaves"
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Intro Subtitle / Narrative</label>
                            <textarea
                                rows={3}
                                value={block.subtitle || ''}
                                onChange={e => updateBlock(block.id, { subtitle: e.target.value })}
                                style={inputStyle}
                                placeholder="Enter lead paragraph..."
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Background Style</label>
                            <select
                                value={block.bgStyle || 'cream'}
                                onChange={e => updateBlock(block.id, { bgStyle: e.target.value })}
                                style={inputStyle}
                            >
                                <option value="cream">Warm Heritage Cream</option>
                                <option value="white">Clean Pure White</option>
                                <option value="maroon">Royal Vaiyaaree Maroon</option>
                            </select>
                        </div>
                    </div>
                );

            case 'text_image':
            case 'image_text':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div>
                            <label style={labelStyle}>Sub-Heading / Category Tag</label>
                            <input
                                value={block.tag || ''}
                                onChange={e => updateBlock(block.id, { tag: e.target.value })}
                                style={inputStyle}
                                placeholder="e.g. Our Heritage"
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Section Heading</label>
                            <input
                                value={block.title || ''}
                                onChange={e => updateBlock(block.id, { title: e.target.value })}
                                style={{ ...inputStyle, fontWeight: 700 }}
                                placeholder="e.g. Crafted with Love & Tradition"
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Paragraph 1</label>
                            <textarea
                                rows={3}
                                value={block.text1 || ''}
                                onChange={e => updateBlock(block.id, { text1: e.target.value })}
                                style={inputStyle}
                                placeholder="Enter main narrative..."
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Paragraph 2</label>
                            <textarea
                                rows={3}
                                value={block.text2 || ''}
                                onChange={e => updateBlock(block.id, { text2: e.target.value })}
                                style={inputStyle}
                                placeholder="Enter secondary details..."
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Block Image</label>
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <input
                                    value={block.imageUrl || ''}
                                    onChange={e => updateBlock(block.id, { imageUrl: e.target.value })}
                                    style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
                                    placeholder="/images/saree.jpg or https://..."
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveMediaTarget({ type: 'block_image', blockId: block.id });
                                        setShowMediaPicker(true);
                                    }}
                                    className="btn btn-secondary"
                                    style={{ padding: '0.6rem 0.9rem', borderRadius: '10px' }}
                                    title="Choose from Media Library"
                                >
                                    <Upload size={16} />
                                </button>
                            </div>
                            {block.imageUrl && (
                                <div style={{ position: 'relative', marginTop: '0.5rem', borderRadius: '10px', overflow: 'hidden', border: '1px solid hsl(var(--border-subtle))' }}>
                                    <img src={block.imageUrl} alt="Preview" style={{ width: '100%', height: '140px', objectFit: 'cover', display: 'block' }} />
                                </div>
                            )}
                        </div>
                        <div>
                            <label style={labelStyle}>Image Alt Text</label>
                            <input
                                value={block.imageAlt || ''}
                                onChange={e => updateBlock(block.id, { imageAlt: e.target.value })}
                                style={inputStyle}
                                placeholder="Image description for SEO"
                            />
                        </div>
                    </div>
                );

            case 'full_text':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div>
                            <label style={labelStyle}>Section Heading</label>
                            <input
                                value={block.title || ''}
                                onChange={e => updateBlock(block.id, { title: e.target.value })}
                                style={{ ...inputStyle, fontWeight: 700 }}
                                placeholder="e.g. Our Philosophy & Promise"
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Lead Paragraph</label>
                            <textarea
                                rows={3}
                                value={block.text1 || ''}
                                onChange={e => updateBlock(block.id, { text1: e.target.value })}
                                style={inputStyle}
                                placeholder="Main broad statement..."
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Supporting Paragraph</label>
                            <textarea
                                rows={3}
                                value={block.text2 || ''}
                                onChange={e => updateBlock(block.id, { text2: e.target.value })}
                                style={inputStyle}
                                placeholder="Secondary details..."
                            />
                        </div>
                    </div>
                );

            case 'features':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <label style={labelStyle}>Feature Cards</label>
                        {(block.items || []).map((item, idx) => (
                            <div key={idx} style={{ padding: '0.75rem', background: 'hsl(var(--bg-card))', borderRadius: '10px', border: '1px solid hsl(var(--border-subtle))' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Card {idx + 1}</span>
                                    {block.items.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newItems = block.items.filter((_, i) => i !== idx);
                                                updateBlock(block.id, { items: newItems });
                                            }}
                                            style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '0.7rem' }}
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                                <input
                                    value={item.title || ''}
                                    onChange={e => {
                                        const newItems = [...block.items];
                                        newItems[idx].title = e.target.value;
                                        updateBlock(block.id, { items: newItems });
                                    }}
                                    style={{ ...inputStyle, marginBottom: '0.4rem', padding: '0.5rem', fontWeight: 600 }}
                                    placeholder="Card Title"
                                />
                                <textarea
                                    rows={2}
                                    value={item.desc || ''}
                                    onChange={e => {
                                        const newItems = [...block.items];
                                        newItems[idx].desc = e.target.value;
                                        updateBlock(block.id, { items: newItems });
                                    }}
                                    style={{ ...inputStyle, marginBottom: 0, padding: '0.5rem', fontSize: '0.85rem' }}
                                    placeholder="Card Description"
                                />
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => {
                                const newItems = [...(block.items || []), { title: 'New Feature', desc: 'Feature description' }];
                                updateBlock(block.id, { items: newItems });
                            }}
                            className="btn btn-secondary"
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', fontSize: '0.82rem' }}
                        >
                            + Add Feature Card
                        </button>
                    </div>
                );

            case 'quote':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div>
                            <label style={labelStyle}>Quote Statement</label>
                            <textarea
                                rows={3}
                                value={block.quote || ''}
                                onChange={e => updateBlock(block.id, { quote: e.target.value })}
                                style={{ ...inputStyle, fontStyle: 'italic' }}
                                placeholder="Inspiring quote statement..."
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Author Attribution</label>
                            <input
                                value={block.author || ''}
                                onChange={e => updateBlock(block.id, { author: e.target.value })}
                                style={inputStyle}
                                placeholder="e.g. — Yours, Vaiyaaree Sarees"
                            />
                        </div>
                    </div>
                );

            case 'faq':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div>
                            <label style={labelStyle}>FAQ Section Heading</label>
                            <input
                                value={block.title || ''}
                                onChange={e => updateBlock(block.id, { title: e.target.value })}
                                style={{ ...inputStyle, fontWeight: 700 }}
                                placeholder="e.g. Frequently Asked Questions"
                            />
                        </div>
                        <label style={labelStyle}>Q&A Items</label>
                        {(block.items || []).map((item, idx) => (
                            <div key={idx} style={{ padding: '0.75rem', background: 'hsl(var(--bg-card))', borderRadius: '10px', border: '1px solid hsl(var(--border-subtle))' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Question {idx + 1}</span>
                                    {block.items.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newItems = block.items.filter((_, i) => i !== idx);
                                                updateBlock(block.id, { items: newItems });
                                            }}
                                            style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '0.7rem' }}
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                                <input
                                    value={item.question || ''}
                                    onChange={e => {
                                        const newItems = [...block.items];
                                        newItems[idx].question = e.target.value;
                                        updateBlock(block.id, { items: newItems });
                                    }}
                                    style={{ ...inputStyle, marginBottom: '0.4rem', padding: '0.5rem', fontWeight: 600 }}
                                    placeholder="Question"
                                />
                                <textarea
                                    rows={2}
                                    value={item.answer || ''}
                                    onChange={e => {
                                        const newItems = [...block.items];
                                        newItems[idx].answer = e.target.value;
                                        updateBlock(block.id, { items: newItems });
                                    }}
                                    style={{ ...inputStyle, marginBottom: 0, padding: '0.5rem', fontSize: '0.85rem' }}
                                    placeholder="Answer description"
                                />
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => {
                                const newItems = [...(block.items || []), { question: 'New Question?', answer: 'Answer here.' }];
                                updateBlock(block.id, { items: newItems });
                            }}
                            className="btn btn-secondary"
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', fontSize: '0.82rem' }}
                        >
                            + Add FAQ Question
                        </button>
                    </div>
                );

            case 'custom_html':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <label style={labelStyle}>Raw HTML / Embed Code</label>
                        <textarea
                            rows={8}
                            value={block.code || ''}
                            onChange={e => updateBlock(block.id, { code: e.target.value })}
                            style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '0.85rem' }}
                            placeholder="<div>...</div>"
                        />
                    </div>
                );

            default:
                return null;
        }
    };

    const inputStyle = {
        width: '100%', padding: '0.75rem 1rem', borderRadius: '10px',
        background: 'hsl(var(--bg-app))', border: '1px solid hsl(var(--border-subtle))',
        color: 'hsl(var(--text-main))', fontSize: '0.92rem', outline: 'none',
        boxSizing: 'border-box', transition: 'all 0.2s', marginBottom: '1rem'
    };

    const labelStyle = {
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        marginBottom: '0.45rem', fontSize: '0.8rem', fontWeight: 700,
        color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em'
    };

    const previewContainerWidth = {
        desktop: '100%',
        tablet: '768px',
        mobile: '380px'
    }[previewDevice];

    return (
        <>
            <div className="animate-enter" style={{ padding: '1rem', maxWidth: '1600px', margin: '0 auto' }}>
                {/* Action Notification */}
                {notification && (
                    <div style={{
                        position: 'fixed', top: '2rem', right: '2rem', zIndex: 9999,
                        background: notification.type === 'success' ? '#10b981' : '#ef4444',
                        color: 'white', padding: '1.25rem 2rem', borderRadius: '16px',
                        boxShadow: '0 15px 40px rgba(0,0,0,0.3)', animation: 'slideIn 0.3s ease',
                        display: 'flex', alignItems: 'center', gap: '1rem', fontWeight: 600
                    }}>
                        {notification.type === 'success' ? <Check size={20} /> : <X size={20} />}
                        {notification.message}
                    </div>
                )}

                {!isEditing && (
                    <div style={{ padding: '0 1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <h1 style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '2.25rem', fontWeight: 800 }}>
                                    <Layout size={32} color="hsl(var(--primary))" />
                                    CMS Pages & Live Builder
                                </h1>
                                <p style={{ color: 'hsl(var(--text-muted))', fontSize: '1rem' }}>Visual Block Editor • Dynamic Storefront Content • {pages.length} Pages</p>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    onClick={handleStartNewPage}
                                    className="btn btn-primary"
                                    style={{ padding: '0.8rem 1.8rem', borderRadius: '12px', boxShadow: '0 8px 20px hsl(var(--primary) / 0.3)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}
                                >
                                    <Plus size={20} /> Create New Page
                                </button>
                            </div>
                        </div>

                        <div className="card shadow-premium" style={{ padding: '0', overflow: 'hidden', background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-subtle))', borderRadius: '16px' }}>
                            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid hsl(var(--border-subtle))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
                                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
                                    <input
                                        type="text"
                                        placeholder="Search pages by title or slug..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        style={{ ...inputStyle, paddingLeft: '2.5rem', marginBottom: 0 }}
                                    />
                                </div>
                            </div>

                            {loading ? (
                                <div style={{ padding: '8rem 0', textAlign: 'center' }}>
                                    <Loader2 size={40} className="animate-spin" style={{ color: 'hsl(var(--primary))', margin: '0 auto 1.5rem' }} />
                                    <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>Loading CMS pages...</p>
                                </div>
                            ) : filteredPages.length === 0 ? (
                                <div style={{ padding: '6rem 3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <FileText size={48} style={{ color: 'hsl(var(--text-muted))', marginBottom: '1rem' }} />
                                    <h3 style={{ fontSize: '1.5rem' }}>No pages found</h3>
                                    <p style={{ color: 'hsl(var(--text-muted))' }}>{searchTerm ? 'Try adjusting your search filters' : 'Start building your store content by adding your first page!'}</p>
                                </div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', margin: 0 }}>
                                        <thead style={{ background: 'hsl(var(--bg-app))' }}>
                                            <tr>
                                                <th style={{ textAlign: 'left', padding: '1rem 1.5rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--text-muted))', fontWeight: 700 }}>Page Title & Path</th>
                                                <th style={{ textAlign: 'left', padding: '1rem 1.5rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--text-muted))', fontWeight: 700 }}>Status</th>
                                                <th style={{ textAlign: 'left', padding: '1rem 1.5rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--text-muted))', fontWeight: 700 }}>Template</th>
                                                <th style={{ textAlign: 'right', padding: '1rem 1.5rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--text-muted))', fontWeight: 700 }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredPages.map((page) => (
                                                <tr key={page.id} style={{ borderBottom: '1px solid hsl(var(--border-subtle))' }}>
                                                    <td style={{ padding: '1rem 1.5rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                            <div style={{
                                                                width: '42px', height: '42px', borderRadius: '12px',
                                                                background: page.is_published ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--bg-app))',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                                            }}>
                                                                <FileText size={20} color={page.is_published ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))'} />
                                                            </div>
                                                            <div style={{ overflow: 'hidden' }}>
                                                                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'hsl(var(--text-main))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{page.title}</div>
                                                                <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', marginTop: '0.2rem' }}>
                                                                    <code>{page.slug === 'about-us' || page.slug === 'contact' ? `/${page.slug}` : `/page/${page.slug}`}</code>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1rem 1.5rem' }}>
                                                        <span style={{
                                                            padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                                                            textTransform: 'uppercase',
                                                            background: page.status === 'published' ? '#dcfce7' : page.status === 'scheduled' ? '#dbeafe' : '#f3f4f6',
                                                            color: page.status === 'published' ? '#166534' : page.status === 'scheduled' ? '#1e40af' : '#374151'
                                                        }}>
                                                            {page.status}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '1rem 1.5rem' }}>
                                                        <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', fontWeight: 600 }}>
                                                            {page.template || 'default'}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1rem 1.5rem' }}>
                                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                            <button
                                                                onClick={() => handleEditPage(page)}
                                                                className="btn btn-primary"
                                                                style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                                                title="Visual Live Builder"
                                                            >
                                                                <Layout size={15} /> Visual Edit
                                                            </button>
                                                            <a
                                                                href={page.slug === 'home' ? '/' : page.slug === 'about-us' ? '/about-us' : page.slug === 'contact' ? '/contact' : `/page/${page.slug}`}
                                                                target="_blank"
                                                                className="btn btn-secondary"
                                                                style={{ padding: '0.45rem', border: '1px solid hsl(var(--border-subtle))', borderRadius: '8px' }}
                                                                title="View Live Store Page"
                                                            >
                                                                <ExternalLink size={16} />
                                                            </a>
                                                            <button
                                                                onClick={() => handleDelete(page.id)}
                                                                className="btn btn-secondary"
                                                                style={{ padding: '0.45rem', color: '#dc2626', border: '1px solid #fee2e2', borderRadius: '8px' }}
                                                                title="Delete Page"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* FULL SCREEN LIVE BUILDER WORKSPACE */}
                {isEditing && (
                    <div className="animate-enter" style={{ paddingBottom: '3rem' }}>
                        <div style={{
                            background: 'hsl(var(--bg-card))', width: '100%',
                            borderRadius: '24px', display: 'flex', flexDirection: 'column', margin: '0 auto',
                            boxShadow: '0 30px 80px -15px rgba(0,0,0,0.15)', border: '1px solid hsl(var(--border-subtle))',
                            position: 'relative', overflow: 'hidden', minHeight: '90vh'
                        }}>
                            {/* Editor Header Bar */}
                            <div style={{ padding: '1.25rem 2rem', borderBottom: '1px solid hsl(var(--border-subtle))', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'hsl(var(--bg-app))', flexWrap: 'wrap', gap: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'hsl(var(--primary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                        <Layout size={22} />
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <input
                                                value={pageTitle}
                                                onChange={(e) => {
                                                    setPageTitle(e.target.value);
                                                    if (!currentPage) setPageSlug(generateSlug(e.target.value));
                                                }}
                                                placeholder="Enter Page Title..."
                                                style={{
                                                    fontSize: '1.35rem', fontWeight: 800, background: 'transparent',
                                                    border: 'none', borderBottom: '2px solid transparent', color: 'hsl(var(--text-main))',
                                                    outline: 'none', padding: '0.2rem 0'
                                                }}
                                                onFocus={(e) => e.target.style.borderBottomColor = 'hsl(var(--primary))'}
                                                onBlur={(e) => e.target.style.borderBottomColor = 'transparent'}
                                            />
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <span>Slug:</span>
                                            <code>/{pageSlug || 'your-page-slug'}</code>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    {/* Device Switcher */}
                                    {activeTab === 'content' && editorMode === 'visual' && (
                                        <div style={{ display: 'flex', background: 'hsl(var(--bg-card))', padding: '3px', borderRadius: '10px', border: '1px solid hsl(var(--border-subtle))' }}>
                                            <button
                                                type="button"
                                                onClick={() => setPreviewDevice('desktop')}
                                                style={{
                                                    padding: '0.45rem 0.75rem', border: 'none', borderRadius: '7px', cursor: 'pointer',
                                                    background: previewDevice === 'desktop' ? 'hsl(var(--primary))' : 'transparent',
                                                    color: previewDevice === 'desktop' ? '#fff' : 'hsl(var(--text-muted))',
                                                    display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 600
                                                }}
                                                title="Desktop Canvas"
                                            >
                                                <Monitor size={15} /> Desktop
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setPreviewDevice('tablet')}
                                                style={{
                                                    padding: '0.45rem 0.75rem', border: 'none', borderRadius: '7px', cursor: 'pointer',
                                                    background: previewDevice === 'tablet' ? 'hsl(var(--primary))' : 'transparent',
                                                    color: previewDevice === 'tablet' ? '#fff' : 'hsl(var(--text-muted))',
                                                    display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 600
                                                }}
                                                title="Tablet Canvas (768px)"
                                            >
                                                <Tablet size={15} /> Tablet
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setPreviewDevice('mobile')}
                                                style={{
                                                    padding: '0.45rem 0.75rem', border: 'none', borderRadius: '7px', cursor: 'pointer',
                                                    background: previewDevice === 'mobile' ? 'hsl(var(--primary))' : 'transparent',
                                                    color: previewDevice === 'mobile' ? '#fff' : 'hsl(var(--text-muted))',
                                                    display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 600
                                                }}
                                                title="Mobile Canvas (380px)"
                                            >
                                                <Smartphone size={15} /> Mobile
                                            </button>
                                        </div>
                                    )}

                                    {/* Visual vs Code Mode toggle */}
                                    {activeTab === 'content' && (
                                        <button
                                            type="button"
                                            onClick={editorMode === 'visual' ? handleSwitchToCode : handleSwitchToVisual}
                                            className="btn btn-secondary"
                                            style={{ padding: '0.6rem 1rem', borderRadius: '10px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid hsl(var(--border-subtle))' }}
                                        >
                                            <Code size={16} /> {editorMode === 'visual' ? 'HTML Code' : 'Visual Builder'}
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => setShowPreview(true)}
                                        className="btn btn-secondary"
                                        style={{ padding: '0.6rem 1rem', borderRadius: '10px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid hsl(var(--border-subtle))' }}
                                    >
                                        <Eye size={16} /> Fullscreen
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleSave}
                                        disabled={saving || !pageTitle}
                                        className="btn btn-primary"
                                        style={{ padding: '0.6rem 1.4rem', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 6px 16px hsl(var(--primary) / 0.3)' }}
                                    >
                                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                        {currentPage ? 'Save Changes' : 'Publish Page'}
                                    </button>

                                    <button
                                        onClick={() => { setIsEditing(false); }}
                                        style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'hsl(var(--bg-app))', border: '1px solid hsl(var(--border-subtle))', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        title="Close Editor"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Tabs Navigation */}
                            <div style={{ display: 'flex', background: '#ffffff', borderBottom: '1px solid hsl(var(--border-subtle))', padding: '0 1.5rem' }}>
                                {TABS.map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        style={{
                                            padding: '1rem 1.75rem', border: 'none', background: 'transparent', cursor: 'pointer',
                                            fontSize: '0.88rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.6rem',
                                            color: activeTab === tab.id ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))',
                                            borderBottom: `3px solid ${activeTab === tab.id ? 'hsl(var(--primary))' : 'transparent'}`,
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <tab.icon size={17} /> {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* TAB 1: LIVE PAGE BUILDER (SPLIT VIEW) */}
                            {activeTab === 'content' && editorMode === 'visual' && (
                                <div style={{ display: 'grid', gridTemplateColumns: '500px 1fr', minHeight: '75vh', background: 'hsl(var(--bg-app))' }}>
                                    
                                    {/* LEFT SIDEBAR: WIDGET LIST WITH INLINE EDIT FIELDS */}
                                    <div style={{
                                        borderRight: '1px solid hsl(var(--border-subtle))', background: 'hsl(var(--bg-card))',
                                        display: 'flex', flexDirection: 'column', height: '100%', maxHeight: 'calc(90vh - 120px)', overflowY: 'auto'
                                    }}>
                                        {/* Block Selector Quick Add Dropdown */}
                                        <div style={{ padding: '1.25rem', borderBottom: '1px solid hsl(var(--border-subtle))', background: 'hsl(var(--bg-app))' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <Layers size={15} /> Page Widgets Stack ({blocks.length})
                                                </div>
                                            </div>

                                            {/* Add Block Grid */}
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                                                {BLOCK_TYPES.map(bt => {
                                                    const Icon = bt.icon;
                                                    return (
                                                        <button
                                                            key={bt.type}
                                                            type="button"
                                                            onClick={() => addBlock(bt.type)}
                                                            style={{
                                                                padding: '0.6rem 0.75rem', background: 'hsl(var(--bg-card))',
                                                                border: '1px solid hsl(var(--border-subtle))', borderRadius: '10px',
                                                                cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                                fontSize: '0.78rem', fontWeight: 700, color: 'hsl(var(--text-main))',
                                                                transition: 'all 0.15s'
                                                            }}
                                                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'hsl(var(--primary))'; e.currentTarget.style.background = 'hsl(var(--primary) / 0.05)'; }}
                                                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'hsl(var(--border-subtle))'; e.currentTarget.style.background = 'hsl(var(--bg-card))'; }}
                                                        >
                                                            <Icon size={14} color="hsl(var(--primary))" />
                                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>+ {bt.label}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Widget Cards Stack with In-Place Fields Below Each Widget */}
                                        <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            {blocks.length === 0 ? (
                                                <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                                                    <Layout size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                                                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>No widgets added yet</div>
                                                    <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Click any button above to add a widget to this page.</div>
                                                </div>
                                            ) : (
                                                blocks.map((block, idx) => {
                                                    const isExpanded = block.id === selectedBlockId;
                                                    const typeDef = BLOCK_TYPES.find(t => t.type === block.type) || BLOCK_TYPES[0];
                                                    const Icon = typeDef.icon;
                                                    return (
                                                        <div
                                                            key={block.id}
                                                            style={{
                                                                borderRadius: '14px',
                                                                background: 'hsl(var(--bg-card))',
                                                                border: `1.5px solid ${isExpanded ? 'hsl(var(--primary))' : 'hsl(var(--border-subtle))'}`,
                                                                overflow: 'hidden',
                                                                boxShadow: isExpanded ? '0 8px 24px -6px rgba(0,0,0,0.08)' : '0 2px 6px rgba(0,0,0,0.02)',
                                                                transition: 'all 0.2s ease'
                                                            }}
                                                        >
                                                            {/* Widget Card Header */}
                                                            <div
                                                                onClick={() => setSelectedBlockId(isExpanded ? null : block.id)}
                                                                style={{
                                                                    padding: '0.85rem 1rem',
                                                                    background: isExpanded ? 'hsl(var(--primary) / 0.06)' : 'hsl(var(--bg-app))',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'space-between',
                                                                    borderBottom: isExpanded ? '1px solid hsl(var(--border-subtle))' : 'none',
                                                                    userSelect: 'none'
                                                                }}
                                                            >
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                                                                    <div style={{
                                                                        width: '32px', height: '32px', borderRadius: '8px',
                                                                        background: isExpanded ? 'hsl(var(--primary))' : 'hsl(var(--bg-card))',
                                                                        color: isExpanded ? '#fff' : 'hsl(var(--primary))',
                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                                                    }}>
                                                                        <Icon size={16} />
                                                                    </div>
                                                                    <div style={{ overflow: 'hidden' }}>
                                                                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'hsl(var(--text-main))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                            {block.title || block.tag || block.badge || typeDef.label}
                                                                        </div>
                                                                        <div style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                                            <span style={{ fontWeight: 700, color: 'hsl(var(--primary))' }}>#{idx + 1}</span>
                                                                            <span>•</span>
                                                                            <span>{typeDef.label}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Toolbar Controls */}
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }} onClick={e => e.stopPropagation()}>
                                                                    <button
                                                                        type="button"
                                                                        disabled={idx === 0}
                                                                        onClick={() => moveBlock(idx, -1)}
                                                                        style={{ padding: '0.3rem', background: 'transparent', border: 'none', cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? 0.25 : 0.75, borderRadius: '6px' }}
                                                                        title="Move Up"
                                                                    >
                                                                        <ChevronUp size={15} />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        disabled={idx === blocks.length - 1}
                                                                        onClick={() => moveBlock(idx, 1)}
                                                                        style={{ padding: '0.3rem', background: 'transparent', border: 'none', cursor: idx === blocks.length - 1 ? 'not-allowed' : 'pointer', opacity: idx === blocks.length - 1 ? 0.25 : 0.75, borderRadius: '6px' }}
                                                                        title="Move Down"
                                                                    >
                                                                        <ChevronDown size={15} />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => duplicateBlock(block)}
                                                                        style={{ padding: '0.3rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))', borderRadius: '6px' }}
                                                                        title="Duplicate Widget"
                                                                    >
                                                                        <Copy size={14} />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeBlock(block.id)}
                                                                        style={{ padding: '0.3rem', background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', borderRadius: '6px' }}
                                                                        title="Remove Widget"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setSelectedBlockId(isExpanded ? null : block.id)}
                                                                        style={{ padding: '0.3rem', background: 'transparent', border: 'none', cursor: 'pointer', color: isExpanded ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))', borderRadius: '6px', marginLeft: '0.2rem' }}
                                                                        title={isExpanded ? "Collapse fields" : "Expand fields"}
                                                                    >
                                                                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Widget Content Edit Area Directly Below Each Widget */}
                                                            {isExpanded && (
                                                                <div style={{ padding: '1.25rem', background: 'hsl(var(--bg-app))' }}>
                                                                    {renderBlockEditorFields(block)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>

                                    {/* RIGHT CANVAS: LIVE INTERACTIVE WYSIWYG PREVIEW */}
                                    <div style={{
                                        padding: '2rem', overflowY: 'auto', maxHeight: 'calc(90vh - 120px)',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#e2e8f0'
                                    }}>
                                        <div style={{
                                            width: previewContainerWidth,
                                            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                            background: '#ffffff',
                                            borderRadius: previewDevice === 'desktop' ? '12px' : '24px',
                                            boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
                                            padding: previewDevice === 'mobile' ? '1.5rem 1rem' : '3.5rem 3rem',
                                            boxSizing: 'border-box',
                                            border: previewDevice === 'mobile' ? '10px solid #1e293b' : previewDevice === 'tablet' ? '12px solid #334155' : '1px solid #cbd5e1',
                                            minHeight: '600px'
                                        }}>
                                            {/* Storefront Brand Container Simulation */}
                                            <div className="about-us-cms-container" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                                {blocks.length === 0 ? (
                                                    <div style={{ padding: '5rem 2rem', textAlign: 'center', color: '#94a3b8' }}>
                                                        <Layout size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                                                        <h3>No Blocks Added Yet</h3>
                                                        <p>Click on "+ Add Hero", "+ Text Left", or any block in the left panel to start building your page!</p>
                                                    </div>
                                                ) : (
                                                    blocks.map(b => {
                                                        const isSelected = b.id === selectedBlockId;
                                                        return (
                                                            <div
                                                                key={b.id}
                                                                onClick={() => setSelectedBlockId(b.id)}
                                                                style={{
                                                                    position: 'relative',
                                                                    cursor: 'pointer',
                                                                    outline: isSelected ? '2px dashed #5d0821' : '1px dashed transparent',
                                                                    outlineOffset: '6px',
                                                                    borderRadius: '8px',
                                                                    transition: 'outline 0.15s ease'
                                                                }}
                                                                title="Click to edit block"
                                                            >
                                                                {isSelected && (
                                                                    <div style={{
                                                                        position: 'absolute', top: '-12px', left: '12px', zIndex: 10,
                                                                        background: '#5d0821', color: '#fff', fontSize: '0.7rem', fontWeight: 700,
                                                                        padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.05em'
                                                                    }}>
                                                                        Active: {BLOCK_TYPES.find(t => t.type === b.type)?.label}
                                                                    </div>
                                                                )}
                                                                <div dangerouslySetInnerHTML={{ __html: blocksToHtml([b]) }} />
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 1 ALTERNATIVE: RAW HTML CODE EDITOR */}
                            {activeTab === 'content' && editorMode === 'code' && (
                                <div style={{ padding: '2rem 3rem', background: '#0f172a', color: '#f8fafc' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                                            <Code size={18} color="#38bdf8" /> HTML Source Code Editor
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleSwitchToVisual}
                                            className="btn btn-primary"
                                            style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
                                        >
                                            Compile to Visual Blocks
                                        </button>
                                    </div>
                                    <textarea
                                        value={rawHtmlCode}
                                        onChange={(e) => setRawHtmlCode(e.target.value)}
                                        rows={22}
                                        style={{
                                            width: '100%', padding: '1.5rem', borderRadius: '12px',
                                            background: '#1e293b', border: '1px solid #334155', color: '#38bdf8',
                                            fontFamily: 'Consolas, monospace', fontSize: '0.92rem', lineHeight: 1.6,
                                            outline: 'none', boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                            )}

                            {/* TAB 2: GOOGLE SEARCH & SEO */}
                            {activeTab === 'seo' && (
                                <div style={{ padding: '3rem', maxWidth: '900px', margin: '0 auto', width: '100%' }}>
                                    <div style={{ background: 'hsl(var(--bg-app))', padding: '2rem', borderRadius: '20px', border: '1px solid hsl(var(--border-subtle))' }}>
                                        <h3 style={{ marginTop: 0, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.25rem' }}>
                                            <BarChart size={20} color="hsl(var(--primary))" /> Search Engine Optimization & Google Preview
                                        </h3>

                                        <label style={labelStyle}>Search Title (Keep under 60 chars)</label>
                                        <input
                                            value={seoTitle}
                                            onChange={(e) => setSeoTitle(e.target.value)}
                                            placeholder="Leave empty to use page title"
                                            style={inputStyle}
                                        />

                                        <label style={labelStyle}>Short Meta Description (Shows in Search Results)</label>
                                        <textarea
                                            rows={4}
                                            value={metaDescription}
                                            onChange={(e) => setMetaDescription(e.target.value)}
                                            placeholder="Summarize your page for Google search results..."
                                            style={{ ...inputStyle, minHeight: '100px' }}
                                        />

                                        <label style={labelStyle}>Social Sharing OpenGraph Image URL</label>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <input
                                                value={ogImageUrl}
                                                onChange={(e) => setOgImageUrl(e.target.value)}
                                                placeholder="https://..."
                                                style={{ ...inputStyle, flex: 1 }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setActiveMediaTarget({ type: 'og_image' });
                                                    setShowMediaPicker(true);
                                                }}
                                                className="btn btn-secondary"
                                                style={{ padding: '0.75rem', borderRadius: '10px' }}
                                            >
                                                <Upload size={16} />
                                            </button>
                                        </div>

                                        {/* Google SERP Snippet Preview */}
                                        <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                                            <div style={{ fontSize: '0.8rem', color: '#202124', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                <span>https://vaiyaaree.com</span> › <span>{pageSlug || 'page'}</span>
                                            </div>
                                            <div style={{ fontSize: '1.25rem', color: '#1a0dab', fontWeight: 600, marginBottom: '0.35rem', cursor: 'pointer' }}>
                                                {seoTitle || pageTitle || 'SEO Title Preview | Vaiyaaree Sarees'}
                                            </div>
                                            <div style={{ fontSize: '0.88rem', color: '#4d5156', lineHeight: 1.5 }}>
                                                {metaDescription || 'Experience the authentic weaves and handcrafted printed sarees at Vaiyaaree. Browse our exclusive collection crafted with love and tradition.'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 3: DESIGN & LAYOUT SETTINGS */}
                            {activeTab === 'appearance' && (
                                <div style={{ padding: '3rem', maxWidth: '900px', margin: '0 auto', width: '100%' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem' }}>
                                        <div>
                                            <label style={labelStyle}>Layout Template</label>
                                            <select value={pageTemplate} onChange={e => setPageTemplate(e.target.value)} style={inputStyle}>
                                                <option value="default">Default Standard Layout</option>
                                                <option value="home">Homepage Style (Full Width)</option>
                                                <option value="landing">Landing Page (No Header/Footer)</option>
                                                <option value="wide">Wide Sidebar Layout</option>
                                            </select>

                                            <label style={labelStyle}><Globe size={14} /> Page URL Link Address</label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                                <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>/page/</span>
                                                <input
                                                    value={pageSlug}
                                                    onChange={e => setPageSlug(generateSlug(e.target.value))}
                                                    style={{ ...inputStyle, marginBottom: 0 }}
                                                    placeholder="about-us"
                                                />
                                            </div>

                                            <label style={labelStyle}><Lock size={14} /> Publication Status</label>
                                            <select value={pageStatus} onChange={e => setPageStatus(e.target.value)} style={inputStyle}>
                                                <option value="published">Live on Website (Published)</option>
                                                <option value="draft">Saved Draft (Hidden)</option>
                                                <option value="scheduled">Schedule for Later</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label style={labelStyle}>Featured Media (Cover Image)</label>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <input
                                                    value={featuredImageUrl}
                                                    onChange={(e) => setFeaturedImageUrl(e.target.value)}
                                                    placeholder="https://..."
                                                    style={{ ...inputStyle, flex: 1 }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setActiveMediaTarget({ type: 'featured_image' });
                                                        setShowMediaPicker(true);
                                                    }}
                                                    className="btn btn-secondary"
                                                    style={{ padding: '0.75rem', borderRadius: '10px' }}
                                                >
                                                    <Upload size={16} />
                                                </button>
                                            </div>

                                            {featuredImageUrl && (
                                                <img src={featuredImageUrl} alt="Cover Preview" style={{ width: '100%', borderRadius: '12px', height: '180px', objectFit: 'cover', marginTop: '0.5rem', border: '1px solid hsl(var(--border-subtle))' }} />
                                            )}

                                            <div style={{ marginTop: '1.5rem' }}>
                                                <label style={labelStyle}>Hierarchy (Parent Page)</label>
                                                <select value={parentId} onChange={e => setParentId(e.target.value)} style={inputStyle}>
                                                    <option value="none">No Parent (Main Level)</option>
                                                    {pages.filter(p => p.id !== currentPage?.id).map(p => (
                                                        <option key={p.id} value={p.id}>{p.title}</option>
                                                    ))}
                                                </select>

                                                <label style={labelStyle}>Navigation Order (Low to High)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={menuOrder}
                                                    onChange={e => setMenuOrder(parseInt(e.target.value) || 0)}
                                                    style={inputStyle}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 4: ADVANCED TECHNICAL SETTINGS */}
                            {activeTab === 'advanced' && (
                                <div style={{ padding: '3rem', maxWidth: '900px', margin: '0 auto', width: '100%' }}>
                                    <div style={{ display: 'grid', gap: '2rem' }}>
                                        <div className="card" style={{ padding: '2rem', background: '#ffffff', borderRadius: '18px', border: '1px solid #e2e8f0' }}>
                                            <label style={{ ...labelStyle, color: '#1e293b' }}><ImageIcon size={14} /> Global Style Override (CSS)</label>
                                            <textarea
                                                rows={6}
                                                value={customCss}
                                                onChange={e => setCustomCss(e.target.value)}
                                                style={{ ...inputStyle, background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', fontFamily: 'monospace' }}
                                                placeholder=".cms-block-hero { background: #fdfbf7; }"
                                            />
                                            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>Inject custom CSS scoped strictly to this page.</p>
                                        </div>

                                        <div className="card" style={{ padding: '2rem', background: '#ffffff', borderRadius: '18px', border: '1px solid #e2e8f0' }}>
                                            <label style={{ ...labelStyle, color: '#1e293b' }}><Settings size={14} /> Logic Runtime Script (JS)</label>
                                            <textarea
                                                rows={6}
                                                value={customJs}
                                                onChange={e => setCustomJs(e.target.value)}
                                                style={{ ...inputStyle, background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', fontFamily: 'monospace' }}
                                                placeholder="console.log('Vaiyaaree CMS page loaded');"
                                            />
                                            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>Run custom JavaScript functionality when this page is visited.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                )}

                {/* MEDIA PICKER INTEGRATION */}
                {showMediaPicker && (
                    <MediaPicker
                        currentImage={
                            activeMediaTarget?.type === 'og_image' ? ogImageUrl :
                            activeMediaTarget?.type === 'featured_image' ? featuredImageUrl :
                            activeMediaTarget?.type === 'block_image' ? (blocks.find(b => b.id === activeMediaTarget.blockId)?.imageUrl || '') : ''
                        }
                        onSelect={(url) => {
                            if (activeMediaTarget?.type === 'og_image') {
                                setOgImageUrl(url);
                            } else if (activeMediaTarget?.type === 'featured_image') {
                                setFeaturedImageUrl(url);
                            } else if (activeMediaTarget?.type === 'block_image' && activeMediaTarget.blockId) {
                                updateBlock(activeMediaTarget.blockId, { imageUrl: url });
                            }
                            setShowMediaPicker(false);
                            setActiveMediaTarget(null);
                        }}
                        onClose={() => {
                            setShowMediaPicker(false);
                            setActiveMediaTarget(null);
                        }}
                    />
                )}

                {/* FULLSCREEN PREVIEW MODAL */}
                {showPreview && (
                    <ModalPortal>
                        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 99999 }} onClick={() => setShowPreview(false)}>
                            <div className="modal-box" style={{ maxWidth: '1100px', width: '95%', height: '90vh', background: '#fff', borderRadius: '24px', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0 }} onClick={e => e.stopPropagation()}>
                                <div style={{ padding: '1rem 2rem', background: '#111', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Storefront Simulation Preview</div>
                                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>{pageTitle || 'Untitled Page'}</h3>
                                    </div>
                                    <button onClick={() => setShowPreview(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                                        Close Preview
                                    </button>
                                </div>
                                <div style={{ flex: 1, overflowY: 'auto', padding: '3.5rem 2.5rem', background: '#fff' }}>
                                    <div className="about-us-cms-container" style={{ maxWidth: '960px', margin: '0 auto', fontFamily: 'Outfit, sans-serif' }}>
                                        <div
                                            dangerouslySetInnerHTML={{
                                                __html: editorMode === 'visual' ? blocksToHtml(blocks) : rawHtmlCode
                                            }}
                                            style={{ fontSize: '1.1rem', lineHeight: 1.8, color: '#333' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ModalPortal>
                )}

                {/* CONFIRM ACTION MODAL */}
                {confirmAction && (
                    <ModalPortal>
                        <div className="modal-overlay" onClick={() => setConfirmAction(null)}>
                            <div className="modal-box shadow-premium" style={{ maxWidth: '440px', padding: '3.5rem', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                                <div style={{
                                    width: '88px', height: '88px', borderRadius: '30px',
                                    background: '#fef2f2',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2.5rem',
                                    color: '#ef4444', transform: 'rotate(-5deg)',
                                    boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.1)'
                                }}>
                                    <div style={{ transform: 'rotate(5deg)' }}>
                                        <Trash2 size={40} strokeWidth={2} />
                                    </div>
                                </div>
                                <h3 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '0.75rem', color: '#1a1a1a', letterSpacing: '-0.02em' }}>
                                    {confirmAction.title}
                                </h3>
                                <p style={{ color: '#64748b', lineHeight: '1.6', fontSize: '1rem', marginBottom: '2.5rem' }}>
                                    {confirmAction.message}
                                </p>
                                <div className="modal-actions" style={{ gap: '0.75rem' }}>
                                    <button
                                        onClick={() => setConfirmAction(null)}
                                        className="modal-btn modal-btn-secondary"
                                        style={{ flex: 1, height: '52px', borderRadius: '16px', fontWeight: 700 }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmAction.onConfirm}
                                        className="modal-btn modal-btn-primary"
                                        style={{
                                            flex: 1.5, background: '#ef4444', height: '52px', borderRadius: '16px', fontWeight: 800,
                                            boxShadow: '0 8px 20px -5px rgba(239, 68, 68, 0.3)'
                                        }}
                                    >
                                        {confirmAction.btnText || 'Confirm Action'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </ModalPortal>
                )}
            </div>

            <style jsx>{`
                @keyframes slideIn { from { transform: translateY(-30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes fade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-enter { animation: fade 0.4s ease-out; }
                .animate-fade { animation: fade 0.3s ease-out; }
                .animate-spin { animation: spin 1s linear infinite; }
                
                .shadow-premium {
                    box-shadow: 0 20px 60px -15px rgba(0,0,0,0.1), 0 10px 30px -10px rgba(0,0,0,0.05);
                }
                
                input:focus, textarea:focus, select:focus {
                    border-color: hsl(var(--primary)) !important;
                    box-shadow: 0 0 0 3px hsl(var(--primary) / 0.1);
                }
            `}</style>
        </>
    );
}
