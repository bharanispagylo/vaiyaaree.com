
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Facebook, Shield, Key, ExternalLink, CheckCircle2, AlertCircle, Loader2, RefreshCw, Layout, Smartphone } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

function MetaConnectContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [config, setConfig] = useState({ pageId: '', accessToken: '' });
    const [availablePages, setAvailablePages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState({ type: 'idle', message: '' });

    useEffect(() => {
        fetchConfig();

        const success = searchParams.get('success');
        const error = searchParams.get('error');

        if (success === 'connected') {
            setStatus({ type: 'success', message: 'Meta Account Connected Successfully!' });
            // Remove params from URL
            setTimeout(() => {
                const newUrl = window.location.pathname;
                window.history.replaceState({}, '', newUrl);
            }, 3000);
        } else if (error) {
            setStatus({ type: 'error', message: `Connection Failed: ${error.replace(/_/g, ' ')}` });
        }
    }, [searchParams]);

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const { data } = await supabase.from('app_settings')
                .select('*')
                .in('key', ['fb_page_id', 'fb_page_access_token', 'fb_available_pages']);

            const newConfig = { pageId: '', accessToken: '' };
            let pages = [];

            data?.forEach(item => {
                if (item.key === 'fb_page_id') newConfig.pageId = item.value;
                if (item.key === 'fb_page_access_token') newConfig.accessToken = item.value;
                if (item.key === 'fb_available_pages') {
                    try { pages = JSON.parse(item.value); } catch (e) { }
                }
            });

            setConfig(newConfig);
            setAvailablePages(pages);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = () => {
        const appId = process.env.NEXT_PUBLIC_META_APP_ID;
        const baseUrl = window.location.origin || process.env.NEXT_PUBLIC_APP_URL;
        const redirectUri = `${baseUrl}/api/auth/facebook/callback`;
        const scope = 'pages_manage_posts,pages_read_engagement,pages_show_list,instagram_basic,instagram_content_publish';

        const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code`;

        window.location.href = authUrl;
    };

    const selectPage = async (page) => {
        setSaving(true);
        try {
            await supabase.from('app_settings').upsert([
                { key: 'fb_page_id', value: page.id },
                { key: 'fb_page_access_token', value: page.access_token },
                { key: 'fb_page_name', value: page.name }
            ]);
            setConfig({ pageId: page.id, accessToken: page.access_token });
            setStatus({ type: 'success', message: `Connected to ${page.name}!` });
            setTimeout(() => setStatus({ type: 'idle', message: '' }), 3000);
        } catch (error) {
            setStatus({ type: 'error', message: 'Failed to select page' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'hsl(var(--text-muted))' }}>
            <Loader2 className="animate-spin" size={32} />
        </div>
    );

    return (
        <div className="animate-enter">
            <div className="admin-header-row">
                <div>
                    <h1>Meta Connect</h1>
                    <p>Automate your business on Facebook & Instagram</p>
                </div>
            </div>

            {status.message && (
                <div style={{
                    marginBottom: '1.5rem', padding: '1rem', borderRadius: '12px',
                    background: status.type === 'success' ? 'hsl(var(--success) / 0.1)' : 'hsl(var(--danger) / 0.1)',
                    border: `1px solid ${status.type === 'success' ? 'hsl(var(--success) / 0.3)' : 'hsl(var(--danger) / 0.3)'}`,
                    color: status.type === 'success' ? 'hsl(var(--success))' : 'hsl(var(--danger))',
                    display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600
                }}>
                    {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    {status.message}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Connection Status Card */}
                    <div className="card" style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ padding: '12px', background: '#1877F2', borderRadius: '12px', color: 'white' }}>
                                    <Facebook size={24} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0 }}>Step 1: Link Meta Account</h3>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>Authorize your account to enable auto-posting</p>
                                </div>
                            </div>
                            <button
                                onClick={handleConnect}
                                className="btn btn-primary"
                                style={{ background: '#1877F2', border: 'none', padding: '10px 20px' }}
                            >
                                <RefreshCw size={16} style={{ marginRight: '8px' }} />
                                {availablePages.length > 0 ? 'Reconnect Meta' : 'Connect Meta'}
                            </button>
                        </div>

                        {availablePages.length > 0 ? (
                            <div>
                                <h4 style={{ fontSize: '0.9rem', color: 'hsl(var(--text-muted))', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Step 2: Select Business Page</h4>
                                <div style={{ display: 'grid', gap: '0.75rem' }}>
                                    {availablePages.map(page => (
                                        <div
                                            key={page.id}
                                            onClick={() => selectPage(page)}
                                            style={{
                                                padding: '1rem', borderRadius: '12px', border: page.id === config.pageId ? '2px solid #1877F2' : '1px solid hsl(var(--border-subtle))',
                                                background: page.id === config.pageId ? '#1877F20A' : '#f1f5f9',
                                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'hsl(var(--primary) / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'hsl(var(--primary))' }}>
                                                    {page.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{page.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>ID: {page.id}</div>
                                                </div>
                                            </div>
                                            {page.id === config.pageId && <CheckCircle2 size={24} color="#1877F2" />}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '2rem', background: '#f1f5f9', borderRadius: '12px', border: '1px dashed hsl(var(--border-subtle))' }}>
                                <Smartphone size={32} color="hsl(var(--text-muted))" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                                <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>Click the button above to link your Facebook pages.</p>
                            </div>
                        )}
                    </div>

                    {/* Manual Settings (Advanced) */}
                    <details className="card" style={{ padding: '1rem' }}>
                        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>Advanced / Manual Configuration</summary>
                        <div style={{ paddingTop: '1.5rem' }}>
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '0.85rem' }}>Facebook Page ID</label>
                                <input
                                    type="text"
                                    value={config.pageId}
                                    readOnly
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#f8fafc', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-muted))' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '0.85rem' }}>Page Access Token (Automatic)</label>
                                <textarea
                                    value={config.accessToken}
                                    readOnly
                                    rows={3}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#f8fafc', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-muted))', resize: 'none', fontSize: '0.7rem', fontFamily: 'var(--font-roboto)' }}
                                />
                            </div>
                        </div>
                    </details>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="card" style={{ padding: '1.5rem' }}>
                        <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Layout size={18} color="#1877F2" /> Overview
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ fontSize: '0.82rem', lineHeight: 1.5, color: 'hsl(var(--text-muted))' }}>
                                Once connected, you can toggle <strong>Facebook Auto-post</strong> when adding new sarees.
                            </div>
                            <div style={{ padding: '12px', background: 'hsl(var(--success) / 0.1)', borderRadius: '8px', border: '1px solid hsl(var(--success) / 0.2)' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--success))', marginBottom: '4px' }}>ACTIVE SERVICES</div>
                                <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.7rem', color: 'hsl(var(--text-muted))' }}>
                                    <li>Saree Auto-Posting</li>
                                    <li>Page Insights (Beta)</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ padding: '1.5rem', background: '#1877F20A', border: '1px solid #1877F233' }}>
                        <h4 style={{ margin: '0 0 1rem 0' }}>Connected To</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                <span>Status</span>
                                <span style={{ color: config.pageId ? 'hsl(var(--success))' : 'hsl(var(--text-muted))', fontWeight: 700 }}>
                                    {config.pageId ? 'Linked' : 'Not Linked'}
                                </span>
                            </div>
                            {config.pageId && (
                                <div style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', wordBreak: 'break-all' }}>
                                    Page ID: {config.pageId}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function MetaConnectPage() {
    return (
        <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}><Loader2 className="animate-spin" /></div>}>
            <MetaConnectContent />
        </Suspense>
    );
}
