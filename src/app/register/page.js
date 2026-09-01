'use client';
import { Suspense } from 'react';
import CustomerLoginPage from '../login/page';

export default function RegisterPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
            <CustomerLoginPage initialMode="register" />
        </Suspense>
    );
}
