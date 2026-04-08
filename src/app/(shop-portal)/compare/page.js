'use client';

import { useCompare } from '@/context/CompareContext';
import { ShoppingCart, Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useShop } from '@/context/ShopContext';

export default function ComparePage() {
    const { compareItems, toggleCompare, clearCompare } = useCompare();
    const { addToCart } = useShop();

    if (compareItems.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '6rem 2rem', background: '#f8fafc', minHeight: '60vh' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b' }}>Product Comparison</h1>
                <p style={{ color: '#64748b', marginTop: '1rem', marginBottom: '2rem' }}>You haven't added any products to compare yet.</p>
                <Link href="/shop" style={{ display: 'inline-block', background: '#0f172a', color: '#fff', padding: '0.75rem 2rem', borderRadius: '8px', fontWeight: 600, textDecoration: 'none' }}>
                    Browse Products
                </Link>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '4rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Compare Products</h1>
                    <p style={{ color: '#64748b', margin: '0.25rem 0 0 0' }}>Analyze features side-by-side</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <Link href="/shop" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', textDecoration: 'none', fontWeight: 600 }}>
                        <ArrowLeft size={16}/> Back
                    </Link>
                    <button onClick={clearCompare} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Trash2 size={16}/> Clear All
                    </button>
                </div>
            </div>

            <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr>
                            <th style={{ width: '20%', padding: '1.5rem', background: '#f8fafc', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>Features</th>
                            {compareItems.map(p => (
                                <th key={p.id} style={{ width: `${80 / Math.max(1, compareItems.length)}%`, padding: '1.5rem', background: '#fff', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', position: 'relative' }}>
                                    <button onClick={() => toggleCompare(p)} title="Remove" style={{ position: 'absolute', top: '1rem', right: '1rem', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
                                    <div style={{ width: '100%', aspectRatio: '3/4', background: '#f1f5f9', borderRadius: '8px', overflow: 'hidden', marginBottom: '1rem' }}>
                                        {p.image_url ? (
                                            <img src={p.image_url.split(',')[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={p.name} />
                                        ) : null}
                                    </div>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', margin: '0 0 0.5rem 0' }}>{p.name}</h3>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem' }}>₹{p.price?.toLocaleString()}</div>
                                    <button 
                                        onClick={() => addToCart(p, 1)}
                                        disabled={p.stock <= 0}
                                        style={{ width: '100%', padding: '0.75rem', background: p.stock > 0 ? '#1e293b' : '#cbd5e1', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: p.stock > 0 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                    >
                                        <ShoppingCart size={16} /> {p.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                                    </button>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style={{ padding: '1.5rem', fontWeight: 700, color: '#475569', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>Category</td>
                            {compareItems.map(p => (
                                <td key={p.id} style={{ padding: '1.5rem', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', color: '#1e293b' }}>
                                    {p.category || 'N/A'}
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td style={{ padding: '1.5rem', fontWeight: 700, color: '#475569', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>Brand</td>
                            {compareItems.map(p => (
                                <td key={p.id} style={{ padding: '1.5rem', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', color: '#1e293b' }}>
                                    {p.product_group || 'Standard'}
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td style={{ padding: '1.5rem', fontWeight: 700, color: '#475569', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>Stock Status</td>
                            {compareItems.map(p => (
                                <td key={p.id} style={{ padding: '1.5rem', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
                                    <span style={{ color: p.stock > 0 ? '#10b981' : '#ef4444', fontWeight: 700, padding: '0.25rem 0.75rem', background: p.stock > 0 ? '#d1fae5' : '#fee2e2', borderRadius: '50px', fontSize: '0.85rem' }}>
                                        {p.stock > 0 ? 'In Stock' : 'Out of Stock'}
                                    </span>
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td style={{ padding: '1.5rem', fontWeight: 700, color: '#475569', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>Description</td>
                            {compareItems.map(p => (
                                <td key={p.id} style={{ padding: '1.5rem', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.9rem', lineHeight: 1.5 }}>
                                    {p.description || 'No description provided.'}
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
