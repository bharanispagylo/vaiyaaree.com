'use client';

import { ShopProvider } from '@/context/ShopContext';
import { CompareProvider } from '@/context/CompareContext';
import CartDrawer from '@/components/CartDrawer';

export function Providers({ children }) {
    return (
        <ShopProvider>
            <CompareProvider>
                {children}
                <CartDrawer />
            </CompareProvider>
        </ShopProvider>
    );
}
