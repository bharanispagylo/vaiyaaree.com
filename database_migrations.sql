-- 1. Wishlists Table (For Task 2)
CREATE TABLE IF NOT EXISTS public.wishlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(customer_id, product_id)
);

-- 2. Restock Notifications Table (For Task 7)
CREATE TABLE IF NOT EXISTS public.restock_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    is_notified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Customer Address Book (For Task 11)
CREATE TABLE IF NOT EXISTS public.customer_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    title TEXT, -- e.g., 'Home', 'Office'
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address_line TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    pincode TEXT NOT NULL,
    country TEXT DEFAULT 'India',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Product Tags (For Task 21)
-- Adding a tags array column to the existing products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS product_no INTEGER;


-- 5. Return / Exchange Requests (For Task 23)
CREATE TABLE IF NOT EXISTS public.return_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id TEXT REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    request_type TEXT CHECK (request_type IN ('RETURN', 'EXCHANGE')),
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED')),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Atomic Order Sequence Generator
CREATE TABLE IF NOT EXISTS public.order_sequences (
    prefix TEXT PRIMARY KEY,
    last_val BIGINT NOT NULL DEFAULT 1000
);

INSERT INTO public.order_sequences (prefix, last_val)
VALUES ('WEB-', 1000), ('ORD-', 1000), ('MAN-', 1000)
ON CONFLICT (prefix) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_next_order_id(p_prefix TEXT DEFAULT 'WEB-')
RETURNS TEXT AS $$
DECLARE
    v_next_val BIGINT;
BEGIN
    INSERT INTO public.order_sequences (prefix, last_val)
    VALUES (p_prefix, 1001)
    ON CONFLICT (prefix) DO UPDATE
    SET last_val = public.order_sequences.last_val + 1
    RETURNING last_val INTO v_next_val;
    
    RETURN p_prefix || v_next_val::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

