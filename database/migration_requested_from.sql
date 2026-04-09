-- Add requested_from column to return_requests table
ALTER TABLE public.return_requests ADD COLUMN IF NOT EXISTS requested_from TEXT DEFAULT 'website';

-- Add index for better performance when filtering by order_id
CREATE INDEX IF NOT EXISTS idx_return_requests_order_id ON public.return_requests(order_id);

-- Optional: Add index for status
CREATE INDEX IF NOT EXISTS idx_return_requests_status ON public.return_requests(status);
