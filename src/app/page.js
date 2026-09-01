import { Suspense } from 'react';
import HomePageClient from '@/components/HomePageClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getBaseUrl() {
    let url = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || '').trim();
    if (!url || url.includes('trycloudflare.com') || url.includes('loca.lt') || url.includes('ngrok')) {
        url = process.env.NODE_ENV === 'production' ? 'https://vaiyaaree.com' : 'http://localhost:3000';
    }
    return url.replace(/\/$/, '');
}

export const metadata = {
    title: 'Vaiyaaree | Premium Pure Silk, Cotton & Handloom Sarees Online',
    description: 'Discover the finest collection of handcrafted sarees at Vaiyaaree. Pure silk, Kanjivaram, Banarasi, soft cotton, and designer sarees crafted with timeless elegance. Fast pan-India delivery.',
    keywords: [
        'saree', 'buy saree online', 'pure silk sarees', 'handloom sarees',
        'kanjivaram silk saree', 'banarasi saree', 'cotton sarees online',
        'designer sarees', 'wedding sarees', 'vaiyaaree', 'vaiyaaree sarees'
    ],
    alternates: {
        canonical: 'https://vaiyaaree.com'
    },
    openGraph: {
        title: 'Vaiyaaree | Premium Pure Silk, Cotton & Handloom Sarees Online',
        description: 'Discover the finest collection of handcrafted sarees at Vaiyaaree. Pure silk, Banarasi, soft cotton, and designer sarees with authentic heritage.',
        url: 'https://vaiyaaree.com',
        siteName: 'Vaiyaaree Sarees',
        images: [
            {
                url: 'https://vaiyaaree.com/images/vaiyaaree-logo.png',
                width: 1200,
                height: 630,
                alt: 'Vaiyaaree Premium Saree Collection'
            }
        ],
        locale: 'en_IN',
        type: 'website'
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Vaiyaaree | Premium Pure Silk, Cotton & Handloom Sarees Online',
        description: 'Discover the finest collection of handcrafted sarees at Vaiyaaree. Pure silk, Banarasi, soft cotton, and designer sarees.',
        images: ['https://vaiyaaree.com/images/vaiyaaree-logo.png']
    }
};

export default function Page() {
    const baseUrl = getBaseUrl();

    // ── SCHEMA.ORG STRUCTURED DATA ───────────────────────────────────────────
    const organizationSchema = {
        '@context': 'https://schema.org',
        '@type': 'ClothingStore',
        'name': 'Vaiyaaree Sarees',
        'legalName': 'Vaiyaaree Sarees Private Limited',
        'url': baseUrl,
        'logo': `${baseUrl}/images/vaiyaaree-logo.png`,
        'image': `${baseUrl}/images/vaiyaaree-logo.png`,
        'description': 'Exclusive collection of premium handloom silk, soft cotton, Banarasi, and designer sarees.',
        'priceRange': '₹₹',
        'currenciesAccepted': 'INR',
        'paymentAccepted': 'Cash, Credit Card, Debit Card, UPI, Net Banking',
        'address': {
            '@type': 'PostalAddress',
            'streetAddress': 'Tamil Nadu',
            'addressLocality': 'Chennai',
            'addressRegion': 'Tamil Nadu',
            'postalCode': '600001',
            'addressCountry': 'IN'
        },
        'contactPoint': {
            '@type': 'ContactPoint',
            'telephone': '+91-8667793292',
            'contactType': 'Customer Service',
            'areaServed': 'IN',
            'availableLanguage': ['English', 'Tamil', 'Hindi']
        },
        'sameAs': [
            'https://instagram.com/vaiyaaree',
            'https://facebook.com/vaiyaaree'
        ]
    };

    const websiteSchema = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        'name': 'Vaiyaaree',
        'url': baseUrl,
        'potentialAction': {
            '@type': 'SearchAction',
            'target': `${baseUrl}/shop?q={search_term_string}`,
            'query-input': 'required name=search_term_string'
        }
    };

    return (
        <>
            {/* JSON-LD Schema Scripts */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
            />

            <Suspense fallback={null}>
                <HomePageClient />
            </Suspense>
        </>
    );
}
