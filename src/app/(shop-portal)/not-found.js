import Link from 'next/link';
import { ShoppingBag, ArrowLeft } from 'lucide-react';

export const metadata = {
    title: 'Product Not Found | Vaiyaaree Sarees',
    description: 'The requested product is currently unavailable or does not exist.',
    robots: {
        index: false,
        follow: false
    }
};

export default function ShopNotFound() {
    return (
        <div style={{
            minHeight: '65vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4rem 1.5rem',
            textAlign: 'center',
            background: 'linear-gradient(180deg, #fbfaf8 0%, #f7f5f0 100%)'
        }}>
            <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: '#fef3c7',
                color: '#b45309',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.5rem',
                boxShadow: '0 4px 20px rgba(180, 83, 9, 0.1)'
            }}>
                <ShoppingBag size={40} strokeWidth={1.5} />
            </div>

            <span style={{
                fontSize: '0.85rem',
                fontWeight: 800,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#b45309',
                marginBottom: '0.5rem'
            }}>
                404 • Not Available
            </span>

            <h1 style={{
                fontSize: '2.2rem',
                fontWeight: 800,
                color: '#0f172a',
                marginBottom: '1rem',
                letterSpacing: '-0.02em',
                maxWidth: '600px',
                lineHeight: 1.2
            }}>
                This Product is Currently Unavailable
            </h1>

            <p style={{
                fontSize: '1rem',
                color: '#64748b',
                maxWidth: '480px',
                lineHeight: 1.6,
                marginBottom: '2.2rem'
            }}>
                The saree or collection you are looking for has been disabled, sold out, or moved. Explore our latest handloom and silk collections below.
            </p>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <Link
                    href="/shop"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '0.85rem 1.8rem',
                        backgroundColor: '#991b1b',
                        color: '#ffffff',
                        fontWeight: 700,
                        borderRadius: '10px',
                        textDecoration: 'none',
                        fontSize: '0.95rem',
                        boxShadow: '0 4px 14px rgba(153, 27, 27, 0.25)',
                        transition: 'transform 0.15s ease, background-color 0.15s ease'
                    }}
                >
                    <ShoppingBag size={18} /> Explore Sarees
                </Link>

                <Link
                    href="/"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '0.85rem 1.8rem',
                        backgroundColor: '#ffffff',
                        color: '#334155',
                        fontWeight: 700,
                        borderRadius: '10px',
                        textDecoration: 'none',
                        fontSize: '0.95rem',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                    }}
                >
                    <ArrowLeft size={18} /> Back to Home
                </Link>
            </div>
        </div>
    );
}
