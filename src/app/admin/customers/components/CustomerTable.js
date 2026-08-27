'use client';
import { 
    Search, Filter, ChevronDown, ChevronLeft, ChevronRight, 
    MessageCircle, Trash2, Mail, Phone, ExternalLink, Users, CheckSquare, Square 
} from 'lucide-react';

export default function CustomerTable({
    customers = [],
    totalCount = 0,
    currentPage = 1,
    pageSize = 10,
    searchTerm = '',
    setSearchTerm,
    filterMode = 'ALL',
    setFilterMode,
    stats,
    selectedPhones = [],
    setSelectedPhones,
    onCustomerClick,
    onDeleteSingleClick,
    onDeleteBatchClick,
    onPageChange
}) {
    const totalPages = Math.ceil(totalCount / pageSize);

    const getTierBadge = (spent) => {
        if (spent >= 20000) return { label: 'VIP', style: { background: 'hsl(var(--primary))', color: 'white', border: 'none' } };
        if (spent >= 7000) return { label: 'Gold', style: { background: 'hsl(var(--success))', color: 'white', border: 'none' } };
        if (spent >= 2000) return { label: 'Silver', style: { background: 'hsl(var(--warning))', color: 'white', border: 'none' } };
        return { label: 'Regular', style: { background: '#64748b', color: 'white', border: 'none' } };
    };

    // Check if all displayed customers are selected
    const allDisplayedSelected = customers.length > 0 && customers.every(c => selectedPhones.includes(c.phone));
    const someDisplayedSelected = customers.some(c => selectedPhones.includes(c.phone));

    const handleSelectAll = () => {
        if (allDisplayedSelected) {
            const displayedPhones = customers.map(c => c.phone);
            setSelectedPhones(prev => prev.filter(p => !displayedPhones.includes(p)));
        } else {
            const displayedPhones = customers.map(c => c.phone);
            setSelectedPhones(prev => [...new Set([...prev, ...displayedPhones])]);
        }
    };

    const handleToggleRow = (phone, e) => {
        e.stopPropagation();
        setSelectedPhones(prev => {
            if (prev.includes(phone)) {
                return prev.filter(p => p !== phone);
            } else {
                return [...prev, phone];
            }
        });
    };

    return (
        <div className="card shadow-premium" style={{ padding: 0, borderRadius: '16px', background: '#ffffff', border: '1px solid hsl(var(--border-subtle))', overflow: 'hidden' }}>
            {/* Search & Filter Header Bar */}
            <div style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid hsl(var(--border-subtle))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1.25rem',
                flexWrap: 'wrap'
            }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '280px', maxWidth: '420px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
                    <input
                        type="text"
                        placeholder="Search by name, phone, or email..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); if (onPageChange) onPageChange(1); }}
                        className="admin-input"
                        style={{ paddingLeft: '2.75rem', width: '100%', borderRadius: '12px' }}
                    />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'hsl(var(--text-muted))', whiteSpace: 'nowrap' }}>
                            Filter:
                        </span>
                        <div style={{ position: 'relative', minWidth: '190px' }}>
                            <Filter size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))', pointerEvents: 'none' }} />
                            <select
                                value={filterMode}
                                onChange={(e) => { setFilterMode(e.target.value); if (onPageChange) onPageChange(1); }}
                                className="admin-input"
                                style={{ paddingLeft: '2.4rem', paddingRight: '2rem', width: '100%', height: '42px', fontSize: '0.85rem', appearance: 'none', cursor: 'pointer', borderRadius: '12px' }}
                            >
                                <option value="ALL">All Customers ({stats?.totalCustomers || 0})</option>
                                <option value="ORDERED">Ordered ({stats?.orderedCustomers || 0})</option>
                                <option value="UNORDERED">Unordered ({stats?.unorderedCustomers || 0})</option>
                            </select>
                            <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))', pointerEvents: 'none' }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating / Sticky Bulk Action Bar */}
            {selectedPhones.length > 0 && (
                <div style={{
                    padding: '0.85rem 1.5rem',
                    background: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    flexWrap: 'wrap',
                    animation: 'fadeIn 0.2s ease'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{
                            background: '#0f172a',
                            color: '#ffffff',
                            padding: '3px 10px',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            fontWeight: 800
                        }}>
                            {selectedPhones.length} Selected
                        </span>
                        <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
                            customers selected for bulk action
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button
                            type="button"
                            onClick={() => setSelectedPhones([])}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#64748b',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                padding: '6px 12px'
                            }}
                        >
                            Deselect All
                        </button>
                        <button
                            type="button"
                            onClick={onDeleteBatchClick}
                            style={{
                                background: '#dc2626',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '10px',
                                padding: '0.55rem 1.1rem',
                                fontSize: '0.82rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)'
                            }}
                        >
                            <Trash2 size={14} /> Delete Selected ({selectedPhones.length})
                        </button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
                <table style={{ margin: 0, width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid hsl(var(--border-subtle))' }}>
                            <th style={{ width: '48px', padding: '1rem', textAlign: 'center' }}>
                                <input
                                    type="checkbox"
                                    checked={allDisplayedSelected}
                                    onChange={handleSelectAll}
                                    style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'hsl(var(--primary))' }}
                                />
                            </th>
                            <th style={{ textAlign: 'left', padding: '1rem' }}>Customer</th>
                            <th style={{ textAlign: 'left', padding: '1rem' }}>Phone</th>
                            <th style={{ textAlign: 'left', padding: '1rem' }}>Email</th>
                            <th style={{ textAlign: 'center', padding: '1rem' }}>Orders</th>
                            <th style={{ textAlign: 'right', padding: '1rem' }}>Total Spent</th>
                            <th style={{ textAlign: 'center', padding: '1rem' }}>Tier</th>
                            <th style={{ textAlign: 'left', padding: '1rem' }}>Last Activity</th>
                            <th style={{ textAlign: 'right', padding: '1rem 1.5rem' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {customers.length === 0 ? (
                            <tr>
                                <td colSpan={9} style={{ padding: '4rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                                    No customers found matching the search or filter.
                                </td>
                            </tr>
                        ) : (
                            customers.map((customer, index) => {
                                const isSelected = selectedPhones.includes(customer.phone);
                                const tier = getTierBadge(customer.totalSpent || 0);
                                const uniqueKey = customer.id || `${customer.phone}-${index}`;

                                return (
                                    <tr 
                                        key={uniqueKey} 
                                        onClick={() => onCustomerClick && onCustomerClick(customer)} 
                                        style={{ 
                                            cursor: 'pointer', 
                                            transition: 'background 0.15s',
                                            background: isSelected ? 'hsl(var(--primary) / 0.04)' : 'transparent',
                                            borderBottom: '1px solid #f1f5f9'
                                        }} 
                                        onMouseOver={(e) => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }} 
                                        onMouseOut={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                                    >
                                        {/* Row Checkbox */}
                                        <td style={{ padding: '1rem', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={(e) => handleToggleRow(customer.phone, e)}
                                                style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'hsl(var(--primary))' }}
                                            />
                                        </td>

                                        {/* Customer Name */}
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
                                                {customer.name}
                                            </div>
                                            {customer.city && (
                                                <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                                                    {customer.city}, {customer.state || 'India'}
                                                </div>
                                            )}
                                        </td>

                                        {/* Phone */}
                                        <td style={{ padding: '1rem', color: '#475569', fontSize: '0.85rem', fontWeight: 600 }}>
                                            <span style={{
                                                background: '#f1f5f9',
                                                border: '1px solid #cbd5e1',
                                                color: '#334155',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                fontSize: '0.72rem',
                                                fontWeight: 800,
                                                marginRight: '6px',
                                                display: 'inline-block'
                                            }}>
                                                {customer.country_code || '+91'}
                                            </span>
                                            {customer.phone}
                                        </td>

                                        {/* Email Column */}
                                        <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                                            {customer.email ? (
                                                <span style={{ color: '#0f172a', fontWeight: 500 }}>
                                                    {customer.email}
                                                </span>
                                            ) : (
                                                <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.78rem' }}>
                                                    Not provided
                                                </span>
                                            )}
                                        </td>

                                        {/* Orders */}
                                        <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, color: customer.totalOrders > 0 ? '#0f172a' : '#94a3b8' }}>
                                            {customer.totalOrders}
                                        </td>

                                        {/* Total Spent */}
                                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                                            ₹{(customer.totalSpent || 0).toLocaleString()}
                                        </td>

                                        {/* Tier Badge */}
                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                            <span className="badge" style={{ ...tier.style, fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px' }}>
                                                {tier.label}
                                            </span>
                                        </td>

                                        {/* Last Order / Activity */}
                                        <td style={{ padding: '1rem', fontSize: '0.82rem', color: 'hsl(var(--text-muted))' }}>
                                            {customer.lastOrder ? new Date(customer.lastOrder).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                        </td>

                                        {/* Actions */}
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                                                <a 
                                                    href={`https://wa.me/${(customer.country_code || '+91').replace('+', '')}${customer.phone}`} 
                                                    target="_blank" 
                                                    rel="noreferrer"
                                                    title="Chat on WhatsApp"
                                                    style={{
                                                        padding: '0.4rem 0.65rem',
                                                        borderRadius: '8px',
                                                        background: '#25D36615',
                                                        color: '#25D366',
                                                        border: '1px solid #25D36630',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 700,
                                                        textDecoration: 'none'
                                                    }}
                                                >
                                                    <MessageCircle size={14} /> Chat
                                                </a>

                                                <button
                                                    type="button"
                                                    title="Delete Customer"
                                                    onClick={() => onDeleteSingleClick && onDeleteSingleClick(customer)}
                                                    style={{
                                                        padding: '0.4rem 0.6rem',
                                                        borderRadius: '8px',
                                                        background: '#fee2e2',
                                                        color: '#dc2626',
                                                        border: '1px solid #fecaca',
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center'
                                                    }}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem',
                    padding: '1.25rem',
                    borderTop: '1px solid hsl(var(--border-subtle))',
                    flexWrap: 'wrap',
                    background: '#ffffff'
                }}>
                    <button 
                        onClick={() => onPageChange && onPageChange(Math.max(1, currentPage - 1))} 
                        disabled={currentPage === 1} 
                        className="btn btn-secondary" 
                        style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', opacity: currentPage === 1 ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '10px' }}
                    >
                        <ChevronLeft size={16} /> Previous
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {(() => {
                            const pages = [];
                            const range = 1;
                            pages.push(1);
                            if (currentPage > range + 2) pages.push('...');
                            for (let i = Math.max(2, currentPage - range); i <= Math.min(totalPages - 1, currentPage + range); i++) {
                                pages.push(i);
                            }
                            if (currentPage < totalPages - range - 1) pages.push('...');
                            if (totalPages > 1) pages.push(totalPages);

                            return pages.map((page, i) => (
                                page === '...' ? (
                                    <span key={`dots-${i}`} style={{ color: 'hsl(var(--text-muted))', padding: '0 0.4rem', fontWeight: 600 }}>...</span>
                                ) : (
                                    <button 
                                        key={page} 
                                        onClick={() => onPageChange && onPageChange(page)} 
                                        style={{ 
                                            minWidth: '36px', 
                                            height: '36px', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center', 
                                            padding: '0', 
                                            fontSize: '0.85rem', 
                                            fontWeight: 700, 
                                            borderRadius: '8px', 
                                            background: currentPage === page ? 'hsl(var(--primary))' : '#ffffff', 
                                            color: currentPage === page ? '#ffffff' : '#0f172a', 
                                            border: currentPage === page ? 'none' : '1px solid #e2e8f0', 
                                            cursor: 'pointer', 
                                            transition: 'all 0.2s' 
                                        }}
                                    >
                                        {page}
                                    </button>
                                )
                            ));
                        })()}
                    </div>

                    <button 
                        onClick={() => onPageChange && onPageChange(Math.min(totalPages, currentPage + 1))} 
                        disabled={currentPage === totalPages} 
                        className="btn btn-secondary" 
                        style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', opacity: currentPage === totalPages ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '10px' }}
                    >
                        Next <ChevronRight size={16} />
                    </button>
                </div>
            )}
        </div>
    );
}
