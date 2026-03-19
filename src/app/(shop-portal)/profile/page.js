'use client';

import { useState } from 'react';
import { User, Mail, MapPin, Phone, MessageCircle, Save } from 'lucide-react';
import { useShop } from '@/context/ShopContext';
import styles from './profile.module.css';

export default function ProfilePage() {
    const { user, setUser, showToast, supabase } = useShop();
    const [saving, setSaving] = useState(false);

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
