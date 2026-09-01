'use client';

import { useState, useEffect } from 'react';
import { Loader2, Plus, BarChart3, Check, X } from 'lucide-react';

// Modular Components
import CustomerStats from './components/CustomerStats';
import CustomerTable from './components/CustomerTable';
import CustomerDetail from './components/CustomerDetail';
import CustomerAnalytics from './components/CustomerAnalytics';
import AddCustomerModal from './components/AddCustomerModal';
import ResetPasswordModal from './components/ResetPasswordModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';

export default function CustomersPage() {
    // View state
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'analytics'
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    // Data state
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [stats, setStats] = useState({
        totalCustomers: 0,
        averageSpend: 0,
        repeatCustomers: 0,
        orderedCustomers: 0,
        unorderedCustomers: 0
    });

    // Filters and Pagination
    const [searchTerm, setSearchTerm] = useState('');
    const [filterMode, setFilterMode] = useState('ALL');
    const [customersPage, setCustomersPage] = useState(1);
    const CUSTOMERS_PER_PAGE = 10;

    // Selection for Multi-select deletion
    const [selectedPhones, setSelectedPhones] = useState([]);

    // Modals
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [passwordModalCustomer, setPasswordModalCustomer] = useState(null);
    const [deleteModalState, setDeleteModalState] = useState({
        isOpen: false,
        customer: null,
        isBatch: false
    });
    const [isDeleting, setIsDeleting] = useState(false);

    // Notification toast
    const [notification, setNotification] = useState(null);

    // Analytics state
    const [timeRange, setTimeRange] = useState('ALL');
    const [analyticsData, setAnalyticsData] = useState({ growthData: [] });

    const showToast = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3500);
    };

    // Scroll to top on page change
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [customersPage]);

    // Reset view listener
    useEffect(() => {
        const handleReset = () => {
            setSelectedCustomer(null);
            setViewMode('list');
            setSelectedPhones([]);
        };
        window.addEventListener('resetAdminView', handleReset);
        return () => window.removeEventListener('resetAdminView', handleReset);
    }, []);

    // Fetch customers
    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(customersPage),
                limit: String(CUSTOMERS_PER_PAGE),
                search: searchTerm.trim(),
                filter: filterMode
            });

            const res = await fetch(`/api/admin/customers?${params.toString()}`);
            const data = await res.json();

            if (res.ok && data.success) {
                setCustomers(data.customers || []);
                setTotalCount(data.totalCount || 0);
                if (data.stats) setStats(data.stats);

                // If currently viewing a customer, refresh their details
                if (selectedCustomer) {
                    const refreshed = (data.customers || []).find(c => c.phone === selectedCustomer.phone);
                    if (refreshed) setSelectedCustomer(refreshed);
                }
            } else {
                console.error('Failed to fetch customers:', data.error);
            }
        } catch (err) {
            console.error('Customer fetch exception:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, [customersPage, searchTerm, filterMode]);

    // Fetch analytics data when analytics view opens
    const fetchAnalytics = async () => {
        try {
            const res = await fetch(`/api/admin/customers?limit=500`);
            const data = await res.json();
            if (data.success && Array.isArray(data.customers)) {
                // Group by month/day
                const monthMap = {};
                data.customers.forEach(c => {
                    if (c.created_at) {
                        const date = new Date(c.created_at);
                        const label = date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
                        monthMap[label] = (monthMap[label] || 0) + 1;
                    }
                });

                const growthData = Object.entries(monthMap).map(([name, value]) => ({ name, value }));
                setAnalyticsData({ growthData: growthData.length > 0 ? growthData : [{ name: 'Current', value: data.customers.length }] });
            }
        } catch (e) {
            console.error('Analytics load error:', e);
        }
    };

    useEffect(() => {
        if (viewMode === 'analytics') {
            fetchAnalytics();
        }
    }, [viewMode, timeRange]);

    // Delete single customer
    const handleDeleteSingle = (customer) => {
        setDeleteModalState({
            isOpen: true,
            customer,
            isBatch: false
        });
    };

    // Delete batch customers
    const handleDeleteBatch = () => {
        if (selectedPhones.length === 0) return;
        setDeleteModalState({
            isOpen: true,
            customer: null,
            isBatch: true
        });
    };

    // Confirm deletion execution
    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        try {
            const phonesToDelete = deleteModalState.isBatch 
                ? selectedPhones 
                : [deleteModalState.customer?.phone].filter(Boolean);

            const res = await fetch('/api/admin/customers', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phones: phonesToDelete })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                showToast(data.message || 'Deleted successfully!', 'success');
                setDeleteModalState({ isOpen: false, customer: null, isBatch: false });
                setSelectedPhones(prev => prev.filter(p => !phonesToDelete.includes(p)));
                
                if (selectedCustomer && phonesToDelete.includes(selectedCustomer.phone)) {
                    setSelectedCustomer(null);
                }

                await fetchCustomers();
            } else {
                showToast(data.error || 'Failed to delete customer(s).', 'error');
            }
        } catch (err) {
            showToast('Failed to delete. Please try again.', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    // Handle Lock / Unlock Customer Account
    const handleToggleLock = async (customer) => {
        if (!customer) return;
        const targetStatus = !customer.is_locked;
        const actionLabel = targetStatus ? 'Lock' : 'Unlock';

        if (!confirm(`Are you sure you want to ${actionLabel.toLowerCase()} the account for ${customer.name || customer.phone}? ${targetStatus ? 'The customer will not be able to log in, place orders, or reset password.' : 'The customer will be allowed to log in and shop normally.'}`)) {
            return;
        }

        try {
            const res = await fetch('/api/admin/customers', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: customer.id,
                    phone: customer.phone,
                    is_locked: targetStatus
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                showToast(data.message || `Customer account ${targetStatus ? 'locked' : 'unlocked'} successfully!`, 'success');
                // Optimistically update list and selectedCustomer
                setCustomers(prev => prev.map(c => (c.phone === customer.phone || (c.id && c.id === customer.id)) ? { ...c, is_locked: targetStatus } : c));
                if (selectedCustomer && (selectedCustomer.phone === customer.phone || selectedCustomer.id === customer.id)) {
                    setSelectedCustomer(prev => ({ ...prev, is_locked: targetStatus }));
                }
            } else {
                showToast(data.error || `Failed to ${actionLabel.toLowerCase()} customer`, 'error');
            }
        } catch (err) {
            showToast('Connection failed. Please try again.', 'error');
        }
    };

    return (
        <div className="animate-enter" style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
            {/* Notification Toast */}
            {notification && (
                <div style={{
                    position: 'fixed',
                    bottom: '2rem',
                    right: '2rem',
                    zIndex: 4000,
                    padding: '1rem 1.5rem',
                    borderRadius: '14px',
                    background: notification.type === 'success' ? '#059669' : '#dc2626',
                    color: '#ffffff',
                    fontWeight: 700,
                    boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    animation: 'slideUp 0.3s ease'
                }}>
                    {notification.type === 'success' ? <Check size={18} /> : <X size={18} />}
                    {notification.message}
                </div>
            )}

            {/* Modals */}
            <AddCustomerModal 
                isOpen={isAddModalOpen} 
                onClose={() => setIsAddModalOpen(false)} 
                onCustomerAdded={(msg) => { showToast(msg, 'success'); fetchCustomers(); }} 
            />

            <ResetPasswordModal 
                isOpen={Boolean(passwordModalCustomer)} 
                customer={passwordModalCustomer} 
                onClose={() => setPasswordModalCustomer(null)} 
                onPasswordUpdated={(msg) => { showToast(msg, 'success'); fetchCustomers(); }} 
            />

            <DeleteConfirmModal 
                isOpen={deleteModalState.isOpen} 
                customer={deleteModalState.customer} 
                selectedCount={deleteModalState.isBatch ? selectedPhones.length : 1} 
                loading={isDeleting} 
                onClose={() => setDeleteModalState({ isOpen: false, customer: null, isBatch: false })} 
                onConfirm={handleConfirmDelete} 
            />

            {/* Main Content Areas */}
            {selectedCustomer ? (
                /* Customer Detail & Edit Profile View */
                <CustomerDetail 
                    customer={selectedCustomer} 
                    onBack={() => setSelectedCustomer(null)} 
                    onCustomerUpdated={(msg) => { showToast(msg, 'success'); fetchCustomers(); }} 
                    onResetPasswordClick={(cust) => setPasswordModalCustomer(cust)} 
                    onDeleteCustomerClick={(cust) => handleDeleteSingle(cust)} 
                    onToggleLockClick={handleToggleLock}
                />
            ) : viewMode === 'analytics' ? (
                /* Analytics Charts View */
                <CustomerAnalytics 
                    analyticsData={analyticsData} 
                    timeRange={timeRange} 
                    setTimeRange={setTimeRange} 
                    onBack={() => setViewMode('list')} 
                />
            ) : (
                /* Customer List & Overview Table View */
                <>
                    {/* Header Row */}
                    <div className="admin-header-row" style={{ marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Customers</h1>
                            <p style={{ color: 'hsl(var(--text-muted))', marginTop: '0.35rem', fontSize: '0.9rem' }}>
                                Manage registered website and WhatsApp customers • {totalCount} total
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <button 
                                onClick={() => setViewMode('analytics')} 
                                className="btn btn-secondary" 
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '12px', padding: '0.65rem 1.1rem' }}
                            >
                                <BarChart3 size={16} /> Analytics
                            </button>

                            <button 
                                onClick={() => setIsAddModalOpen(true)} 
                                className="btn btn-primary" 
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '12px', padding: '0.65rem 1.25rem' }}
                            >
                                <Plus size={16} /> Add Customer
                            </button>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <CustomerStats stats={stats} />

                    {/* Customers Table */}
                    {loading ? (
                        <div className="card shadow-premium" style={{ padding: '4rem', textAlign: 'center', borderRadius: '16px', background: '#ffffff' }}>
                            <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 1rem', color: 'hsl(var(--primary))' }} />
                            <div style={{ color: 'hsl(var(--text-muted))', fontWeight: 600 }}>Loading Customers...</div>
                        </div>
                    ) : (
                        <CustomerTable 
                            customers={customers} 
                            totalCount={totalCount} 
                            currentPage={customersPage} 
                            pageSize={CUSTOMERS_PER_PAGE} 
                            searchTerm={searchTerm} 
                            setSearchTerm={setSearchTerm} 
                            filterMode={filterMode} 
                            setFilterMode={setFilterMode} 
                            stats={stats} 
                            selectedPhones={selectedPhones} 
                            setSelectedPhones={setSelectedPhones} 
                            onCustomerClick={(cust) => setSelectedCustomer(cust)} 
                            onResetPasswordClick={(cust) => setPasswordModalCustomer(cust)}
                            onToggleLockClick={handleToggleLock}
                            onDeleteSingleClick={handleDeleteSingle} 
                            onDeleteBatchClick={handleDeleteBatch} 
                            onPageChange={(page) => setCustomersPage(page)} 
                        />
                    )}
                </>
            )}
        </div>
    );
}
