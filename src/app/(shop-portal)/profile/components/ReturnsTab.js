'use client';

import React from 'react';
import { RotateCcw } from 'lucide-react';
import ReturnWizard from '@/components/ReturnWizard';
import styles from '../profile.module.css';

export default function ReturnsTab({
    user,
    mysqlClient,
    addresses = [],
    orders = [],
    returns = [],
    fetchReturns
}) {
    return (
        <section className={styles.profileSection}>
            <div className={styles.sectionHeader}>
                <div>
                    <h3 className={styles.sectionTitle}><RotateCcw size={20} /> Return & Exchange Requests</h3>
                    <p className={styles.sectionSubtitle}>Submit a return or exchange for delivered products</p>
                </div>
            </div>
            <ReturnWizard
                user={user}
                mysqlClient={mysqlClient}
                addresses={addresses}
                orders={orders}
                returns={returns}
                onSuccess={fetchReturns}
            />
        </section>
    );
}
