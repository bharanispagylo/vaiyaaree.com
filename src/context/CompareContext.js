'use client';
import { createContext, useContext, useState, useEffect } from 'react';

const CompareContext = createContext();

export function CompareProvider({ children }) {
    const [compareItems, setCompareItems] = useState([]);

    useEffect(() => {
        const saved = JSON.parse(localStorage.getItem('compare_items') || '[]');
        setCompareItems(saved);
    }, []);

    const toggleCompare = (product) => {
        setCompareItems((prev) => {
            let next;
            if (prev.find(p => p.id === product.id)) {
                next = prev.filter(p => p.id !== product.id);
            } else {
                if (prev.length >= 4) {
                    alert('You can only compare up to 4 products at a time.');
                    next = prev;
                } else {
                    next = [...prev, product];
                }
            }
            localStorage.setItem('compare_items', JSON.stringify(next));
            return next;
        });
    };

    const clearCompare = () => {
        setCompareItems([]);
        localStorage.removeItem('compare_items');
    };

    return (
        <CompareContext.Provider value={{ compareItems, toggleCompare, clearCompare }}>
            {children}
        </CompareContext.Provider>
    );
}

export const useCompare = () => useContext(CompareContext);
