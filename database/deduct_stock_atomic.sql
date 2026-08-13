-- ════════════════════════════════════════════════════════════════
-- ATOMIC STOCK DEDUCTION FUNCTION FOR SUPABASE
-- ════════════════════════════════════════════════════════════════
-- Prevents race conditions when multiple customers buy the last stock item simultaneously.
-- Run this script in your Supabase SQL Editor.

CREATE OR REPLACE FUNCTION deduct_stock_atomic(
    p_id UUID,
    p_qty INT,
    p_variant_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_updated_rows INT;
BEGIN
    IF p_variant_id IS NOT NULL THEN
        UPDATE product_variants 
        SET stock = stock - p_qty 
        WHERE id = p_variant_id AND stock >= p_qty;
        GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
    ELSE
        UPDATE products 
        SET stock = stock - p_qty 
        WHERE id = p_id AND stock >= p_qty;
        GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
    END IF;

    -- Returns TRUE if stock was successfully decremented, FALSE if insufficient stock (race condition)
    RETURN v_updated_rows > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
