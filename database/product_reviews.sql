-- ════════════════════════════════════════════════════════════════
-- PRODUCT RATINGS & REVIEWS SCHEMA
-- ════════════════════════════════════════════════════════════════
-- Run this script in your Supabase SQL Editor to enable Ratings & Reviews.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Product Reviews Table
CREATE TABLE IF NOT EXISTS public.product_reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_title TEXT,
    review_text TEXT,
    is_verified_buyer BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON public.product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_rating ON public.product_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_product_reviews_approved ON public.product_reviews(is_approved);

-- 3. Function to calculate rating summary for a product
CREATE OR REPLACE FUNCTION get_product_rating_summary(p_product_id UUID)
RETURNS TABLE (
    avg_rating NUMERIC,
    total_reviews BIGINT,
    five_star BIGINT,
    four_star BIGINT,
    three_star BIGINT,
    two_star BIGINT,
    one_star BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ROUND(COALESCE(AVG(rating), 0)::numeric, 1) AS avg_rating,
        COUNT(*)::BIGINT AS total_reviews,
        COUNT(*) FILTER (WHERE rating = 5)::BIGINT AS five_star,
        COUNT(*) FILTER (WHERE rating = 4)::BIGINT AS four_star,
        COUNT(*) FILTER (WHERE rating = 3)::BIGINT AS three_star,
        COUNT(*) FILTER (WHERE rating = 2)::BIGINT AS two_star,
        COUNT(*) FILTER (WHERE rating = 1)::BIGINT AS one_star
    FROM public.product_reviews
    WHERE product_id = p_product_id AND is_approved = TRUE;
END;
$$ LANGUAGE plpgsql;

-- 4. Enable Row Level Security (RLS) policies
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- Public can read approved reviews
CREATE POLICY "Public read approved reviews" ON public.product_reviews
    FOR SELECT USING (is_approved = TRUE);

-- Anyone can submit a review
CREATE POLICY "Public submit reviews" ON public.product_reviews
    FOR INSERT WITH CHECK (TRUE);

-- Full access for admins
CREATE POLICY "Full access for admin" ON public.product_reviews
    FOR ALL USING (TRUE) WITH CHECK (TRUE);
