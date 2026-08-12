/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['sharp', '@napi-rs/canvas', 'jspdf', 'pdfkit', 'pdfmake', 'xlsx'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 3600,
  },
 


  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  turbopack: {},

  webpack: (config) => {
    // Disable persistent disk pack file caching to prevent PackFileCacheStrategy
    // from exceeding V8 ArrayBuffer / Zone memory limits during dev & build
    config.cache = false;
    return config;
  },
 
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          {
            key: 'Content-Security-Policy',
            value:
              "frame-ancestors 'self' https://web.whatsapp.com https://*.whatsapp.net https://*.facebook.com",
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};
 
export default nextConfig;