import Link from 'next/link';

export const metadata = {
    title: 'Page Not Found | Vaiyaaree Sarees',
    description: 'The requested page could not be found.',
    robots: {
        index: false,
        follow: false
    }
};

export default function RootNotFound() {
    return (
        <div style={{
            minHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4rem 1.5rem',
            textAlign: 'center',
            background: 'linear-gradient(180deg, #fbfaf8 0%, #f7f5f0 100%)'
        }}>
            <span style={{
                fontSize: '0.85rem',
                fontWeight: 800,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#991b1b',
                marginBottom: '0.5rem'
            }}>
                404 • Page Not Found
            </span>

            <h1 style={{
                fontSize: '2.4rem',
                fontWeight: 800,
                color: '#0f172a',
                marginBottom: '1rem',
                letterSpacing: '-0.02em',
                maxWidth: '600px',
                lineHeight: 1.2
            }}>
                Looking for Something Special?
            </h1>

            <p style={{
                fontSize: '1rem',
                color: '#64748b',
                maxWidth: '480px',
                lineHeight: 1.6,
                marginBottom: '2.2rem'
            }}>
                The page or product you are looking for might have been removed, disabled, or had its name changed.
            </p>

            <Link
                href="/shop"
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '0.85rem 2rem',
                    backgroundColor: '#991b1b',
                    color: '#ffffff',
                    fontWeight: 700,
                    borderRadius: '10px',
                    textDecoration: 'none',
                    fontSize: '1rem',
                    boxShadow: '0 4px 14px rgba(153, 27, 27, 0.25)'
                }}
            >
                Browse Shop Collection
            </Link>
        </div>
    );
}
