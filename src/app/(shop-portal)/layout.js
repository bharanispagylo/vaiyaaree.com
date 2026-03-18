import ShopHeader from '@/components/ShopHeader';
import ShopFooter from '@/components/ShopFooter';
import PortalWrapper from '@/components/PortalWrapper';
import styles from './portal.module.css';

export const metadata = {
    title: 'Caste Print — Shop Premium Collections',
    description: 'Browse and order premium silk & cotton sarees online. Kanjivaram, Banarasi, Designer sarees with free shipping. Order via WhatsApp.',
    keywords: 'saree, silk saree, cotton saree, buy saree online, kanjivaram, banarasi saree, designer saree',
};

export default function ShopPortalLayout({ children }) {
    return (
        <div className={styles.portalContainer}>
            <ShopHeader />
            <PortalWrapper>
                <main className={styles.mainContent}>
                    {children}
                </main>
            </PortalWrapper>
            <ShopFooter />
        </div>
    );
}
