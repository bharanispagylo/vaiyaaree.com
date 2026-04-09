'use client';

import { useState } from 'react';
import { User, Mail, MapPin, Phone, MessageCircle, Save } from 'lucide-react';
import { useShop } from '@/context/ShopContext';
import styles from './profile.module.css';

export default function ProfilePage() {
    const { user, setUser, showToast, supabase } = useShop();
    const [saving, setSaving] = useState(false);
    const [addresses, setAddresses] = useState([]);
    const [loadingAddresses, setLoadingAddresses] = useState(true);
    const [showAddressForm, setShowAddressForm] = useState(false);

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        if (!user) return;
        setSaving(true);

        try {
            const formData = new FormData(e.target);
            const updates = {
                name: formData.get('name'),
                email: formData.get('email'),
                address: formData.get('address'),
                city: formData.get('city'),
                state: formData.get('state'),
                pincode: formData.get('pincode'),
            };

            const { data, error } = await supabase
                .from('customers')
                .update(updates)
                .eq('id', user.id)
                .select()
                .single();

            if (error) throw error;

            setUser(data);
            localStorage.setItem('cast_prince_user', JSON.stringify(data));
            showToast('Profile updated successfully!');
        } catch (err) {
            console.error(err);
            showToast('Failed to update profile', 'error');
        } finally {
            setSaving(false);
        }
    };

    // Address Book Logic
    useEffect(() => {
        if (user?.id) {
            fetchAddresses();
        }
    }, [user]);

    async function fetchAddresses() {
        setLoadingAddresses(true);
        try {
            const { data, error } = await supabase
                .from('customer_addresses')
                .select('*')
                .eq('customer_id', user.id)
                .order('is_default', { ascending: false });
            if (!error && data) {
                setAddresses(data);
            }
        } catch (err) {
            console.error('Fetch addresses error', err);
        } finally {
            setLoadingAddresses(false);
        }
    }

    async function handleAddAddress(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        try {
            const newAddress = {
                customer_id: user.id,
                title: formData.get('title'),
                full_name: formData.get('full_name'),
                phone: formData.get('phone'),
                address_line: formData.get('address_line'),
                city: formData.get('city'),
                state: formData.get('state'),
                pincode: formData.get('pincode'),
                is_default: addresses.length === 0 || formData.get('is_default') === 'on'
            };

            // If this is set as default, remove default from others
            if (newAddress.is_default && addresses.length > 0) {
                await supabase.from('customer_addresses')
                    .update({ is_default: false })
                    .eq('customer_id', user.id);
            }

            const { error } = await supabase.from('customer_addresses').insert(newAddress);
            if (error) throw error;
            
            showToast('Address added successfully');
            setShowAddressForm(false);
            fetchAddresses();
        } catch (err) {
            console.error(err);
            showToast('Failed to add address', 'error');
        }
    }

    async function deleteAddress(addressId) {
        if (!confirm('Are you sure you want to delete this address?')) return;
        try {
            await supabase.from('customer_addresses').delete().eq('id', addressId);
            showToast('Address deleted');
            fetchAddresses();
        } catch (err) {
            console.error(err);
        }
    }

    if (!user) {
        return (
            <div className={styles.loginPrompt}>
                <div className={styles.promptContent}>
                    <User size={64} style={{ opacity: 0.1, marginBottom: '2rem' }} />
                    <h3>Please Login</h3>
                    <p>You need to be logged in to view and edit your profile.</p>
                    <button onClick={() => window.location.href = '/login'} className={styles.btnPrimary}>Login / Sign Up</button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.profileContainer}>
            <div className={styles.profileHeader}>
                <div className={styles.avatarLarge}>{(user.name?.[0] || 'U').toUpperCase()}</div>
                <div className={styles.headerInfo}>
                    <h2 className={styles.userName}>{user.name}</h2>
                    <p className={styles.userPhone}>+{user.phone}</p>
                </div>
            </div>

            <div className={styles.profileLayout}>
                <section className={styles.profileSection}>
                    <h3 className={styles.sectionTitle}>Account Information</h3>
                    <form onSubmit={handleUpdateProfile} className={styles.profileForm}>
                        <div className={styles.formGrid}>
                            <div className={styles.formGroup}>
                                <label><User size={14} /> FULL NAME</label>
                                <input name="name" defaultValue={user.name} required placeholder="Your name" />
                            </div>
                            <div className={styles.formGroup}>
                                <label><Mail size={14} /> EMAIL</label>
                                <input name="email" defaultValue={user.email} type="email" placeholder="email@example.com" />
                            </div>
                        </div>

                        <div className={styles.formGroupFull} style={{ marginTop: '2rem' }}>
                            <label><MapPin size={14} /> DEFAULT SHIPPING ADDRESS</label>
                            <textarea name="address" defaultValue={user.address} rows={3} placeholder="Flat/House No, Street, Area..." />
                        </div>

                        <div className={styles.formGrid3} style={{ marginTop: '1.5rem' }}>
                            <div className={styles.formGroup}>
                                <label>CITY</label>
                                <input name="city" defaultValue={user.city} placeholder="City" />
                            </div>
                            <div className={styles.formGroup}>
                                <label>STATE</label>
                                <input name="state" defaultValue={user.state} placeholder="State" />
                            </div>
                            <div className={styles.formGroup}>
                                <label>PINCODE</label>
                                <input name="pincode" defaultValue={user.pincode} placeholder="6-digit PIN" />
                            </div>
                        </div>

                        <button type="submit" className={styles.saveBtn} disabled={saving}>
                            {saving ? 'Saving Changes...' : <><Save size={18} /> Save Settings</>}
                        </button>
                    </form>
                </section>

                <section className={styles.profileSection} style={{ marginTop: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 className={styles.sectionTitle} style={{ margin: 0 }}>Address Book</h3>
                        <button 
                            onClick={() => setShowAddressForm(!showAddressForm)} 
                            style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                        >
                            {showAddressForm ? 'Cancel' : '+ Add New Address'}
                        </button>
                    </div>

                    {showAddressForm && (
                        <form onSubmit={handleAddAddress} style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '2rem' }}>
                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label>TITLE (e.g. Home, Office)</label>
                                    <input name="title" required placeholder="Home" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>FULL NAME</label>
                                    <input name="full_name" defaultValue={user.name} required />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>PHONE</label>
                                    <input name="phone" defaultValue={user.phone} required />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>PINCODE</label>
                                    <input name="pincode" required />
                                </div>
                            </div>
                            <div className={styles.formGroupFull} style={{ marginTop: '1rem' }}>
                                <label>ADDRESS LINE</label>
                                <textarea name="address_line" rows={2} required placeholder="Flat, Street, Area" />
                            </div>
                            <div className={styles.formGrid} style={{ marginTop: '1rem' }}>
                                <div className={styles.formGroup}>
                                    <label>CITY</label>
                                    <input name="city" required />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>STATE</label>
                                    <input name="state" defaultValue="Tamil Nadu" required />
                                </div>
                            </div>
                            <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input type="checkbox" name="is_default" id="is_default" />
                                <label htmlFor="is_default" style={{ margin: 0, fontWeight: 500, cursor: 'pointer' }}>Set as default address</label>
                            </div>
                            <button type="submit" className={styles.btnPrimary} style={{ marginTop: '1.5rem', width: 'auto' }}>Save Address</button>
                        </form>
                    )}

                    {loadingAddresses ? (
                        <p>Loading addresses...</p>
                    ) : addresses.length === 0 ? (
                        <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem', background: '#f9fafb', borderRadius: '8px' }}>
                            No saved addresses yet.
                        </p>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                            {addresses.map(addr => (
                                <div key={addr.id} style={{ padding: '1.5rem', border: '1px solid #e5e7eb', borderRadius: '12px', background: '#fff', position: 'relative' }}>
                                    {addr.is_default && <span style={{ position: 'absolute', top: '1rem', right: '1rem', background: '#ebfdf5', color: '#059669', fontSize: '0.7rem', padding: '0.25rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>DEFAULT</span>}
                                    <h4 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <MapPin size={16} color="#6b7280"/> {addr.title}
                                    </h4>
                                    <p style={{ margin: '0 0 0.25rem 0', fontWeight: 600 }}>{addr.full_name}</p>
                                    <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', color: '#4b5563' }}>{addr.address_line}</p>
                                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#4b5563' }}>{addr.city}, {addr.state} {addr.pincode}</p>
                                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#4b5563' }}>📞 +{addr.phone}</p>
                                    <button onClick={() => deleteAddress(addr.id)} style={{ color: '#ef4444', background: 'none', border: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                                        Delete
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <aside className={styles.profileSidebar}>
                    <div className={styles.sidebarCard}>
                        <h4>Need Help?</h4>
                        <p>If you have any issues with your account or orders, feel free to reach out.</p>
                        <a href={`https://wa.me/${process.env.NEXT_PUBLIC_BUSINESS_PHONE || '15551678232'}`} target="_blank" className={styles.supportBtn}>
                            <MessageCircle size={18} /> Chat with Support
                        </a>
                    </div>
                </aside>
            </div>
        </div>
    );
}
