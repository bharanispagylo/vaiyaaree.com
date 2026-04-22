'use client';

import { useShop } from '@/context/ShopContext';
import styles from '@/app/(shop-portal)/portal.module.css';
import { CheckCircle, AlertCircle } from 'lucide-react';

export default function PortalWrapper({ children }) {
    const { toast } = useShop();

    return (
        <>
            {children}
            {toast?.show && (
                <div className={`${styles.toast} ${styles[`toast${toast.type}`]}`}>
                    {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    <span className={styles.toastMessage}>{toast.message}</span>
                </div>
            )}
        </>
    );
}
