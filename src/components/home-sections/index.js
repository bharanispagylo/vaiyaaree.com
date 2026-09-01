'use client';

import HeroBannerSection from './HeroBannerSection';
import BestSellersSection from './BestSellersSection';
import ExploreCollectionSection from './ExploreCollectionSection';
import FeaturedProductSliderSection from './FeaturedProductSliderSection';
import AllProductSliderSection from './AllProductSliderSection';
import ShopByCategorySection from './ShopByCategorySection';
import ImageAndTextSection from './ImageAndTextSection';
import TextAndImageSection from './TextAndImageSection';
import CraftsmanshipStorySection from './CraftsmanshipStorySection';
import WhatsAppShoppingSection from './WhatsAppShoppingSection';
import GalleryPopupSection from './GalleryPopupSection';
import FeaturePerksSection from './FeaturePerksSection';
import BrandStoryLogoSection from './BrandStoryLogoSection';

export {
    HeroBannerSection,
    BestSellersSection,
    ExploreCollectionSection,
    FeaturedProductSliderSection,
    AllProductSliderSection,
    ShopByCategorySection,
    ImageAndTextSection,
    TextAndImageSection,
    CraftsmanshipStorySection,
    WhatsAppShoppingSection,
    GalleryPopupSection,
    FeaturePerksSection,
    BrandStoryLogoSection
};

/**
 * Universal Section Renderer for Homepage Builder
 */
export default function HomepageSectionDispatcher({
    sec,
    allProducts = [],
    featuredProducts = [],
    exploreProducts = [],
    allCategories = [],
    onOpenGalleryImage
}) {
    if (!sec || !sec.section_type) return null;

    switch (sec.section_type) {
        case 'hero_banner':
            return <HeroBannerSection key={sec.id} sec={sec} />;

        case 'best_sellers':
            return <BestSellersSection key={sec.id} sec={sec} featuredProducts={featuredProducts} />;

        case 'explore_collection':
            return <ExploreCollectionSection key={sec.id} sec={sec} exploreProducts={exploreProducts} />;

        case 'featured_product_slider':
            return <FeaturedProductSliderSection key={sec.id} sec={sec} featuredProducts={featuredProducts} />;

        case 'all_product_slider':
            return <AllProductSliderSection key={sec.id} sec={sec} allProducts={allProducts} featuredProducts={featuredProducts} />;

        case 'shop_by_category':
            return <ShopByCategorySection key={sec.id} sec={sec} allCategories={allCategories} />;

        case 'image_and_text':
            return <ImageAndTextSection key={sec.id} sec={sec} />;

        case 'text_and_image':
            return <TextAndImageSection key={sec.id} sec={sec} />;

        case 'craftsmanship_story':
            return <CraftsmanshipStorySection key={sec.id} sec={sec} />;

        case 'brand_story':
        case 'logo_with_text':
        case 'logo_text':
            return <BrandStoryLogoSection key={sec.id} sec={sec} />;

        case 'whatsapp_shopping':
            return <WhatsAppShoppingSection key={sec.id} sec={sec} />;

        case 'gallery_popup':
            return <GalleryPopupSection key={sec.id} sec={sec} onOpenImage={onOpenGalleryImage} />;

        case 'feature_perks':
            return <FeaturePerksSection key={sec.id} sec={sec} />;

        default:
            return null;
    }
}
