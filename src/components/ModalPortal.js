'use client';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * ModalPortal — renders children directly into document.body
 * This bypasses ALL ancestor CSS issues:
 *   - backdrop-filter (AdminTopBar, .card)
 *   - transform
 *   - overflow
 * Guarantees modals always appear centered on the visible screen.
 */
export default function ModalPortal({ children }) {
    const elRef = useRef(null);

    if (!elRef.current) {
        if (typeof document !== 'undefined') {
            elRef.current = document.createElement('div');
            elRef.current.setAttribute('id', 'modal-portal-' + Math.random().toString(36).slice(2));
        }
    }

    useEffect(() => {
        const el = elRef.current;
        if (!el) return;
        document.body.appendChild(el);
        return () => {
            if (document.body.contains(el)) {
                document.body.removeChild(el);
            }
        };
    }, []);

    if (!elRef.current) return null;
    return createPortal(children, elRef.current);
}
