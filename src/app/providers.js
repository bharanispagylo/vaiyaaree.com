'use client';

import { ShopProvider } from '@/context/ShopContext';
import { CompareProvider } from '@/context/CompareContext';

export function Providers({ children }) {
    return (
        <ShopProvider>
            <CompareProvider>
                {children}
            </CompareProvider>
        </ShopProvider>
    );
}
