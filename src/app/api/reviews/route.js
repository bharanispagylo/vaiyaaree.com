import { NextResponse } from 'next/server';
import { mysqlClient } from '@/lib/mysqlClient';

// GET /api/reviews?productId=xxx
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const productId = searchParams.get('productId');

        if (!productId) {
            return NextResponse.json({ error: 'productId is required' }, { status: 400 });
        }

        // Fetch reviews
        const { data: reviews, error: reviewsErr } = await mysqlClient
            .from('product_reviews')
            .select('*')
            .eq('product_id', productId)
            .eq('is_approved', true)
            .order('created_at', { ascending: false });

        if (reviewsErr) throw reviewsErr;

        // Calculate summary metrics
        const total = reviews ? reviews.length : 0;
        const sum = reviews ? reviews.reduce((acc, r) => acc + (r.rating || 0), 0) : 0;
        const avg = total > 0 ? (sum / total).toFixed(1) : '0.0';

        const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        if (reviews) {
            reviews.forEach(r => {
                if (distribution[r.rating] !== undefined) distribution[r.rating]++;
            });
        }

        return NextResponse.json({
            success: true,
            summary: {
                averageRating: parseFloat(avg),
                totalReviews: total,
                distribution
            },
            reviews: reviews || []
        });
    } catch (err) {
        console.error('[API REVIEWS GET ERROR]', err);
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
    }
}

// POST /api/reviews
export async function POST(request) {
    try {
        const body = await request.json();
        const { productId, customerName, customerEmail, rating, reviewTitle, reviewText } = body;

        if (!productId || !customerName || !rating) {
            return NextResponse.json({ error: 'Missing required fields (productId, customerName, rating)' }, { status: 400 });
        }

        if (rating < 1 || rating > 5) {
            return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
        }

        const { data, error } = await mysqlClient
            .from('product_reviews')
            .insert([{
                product_id: productId,
                customer_name: customerName,
                customer_email: customerEmail || null,
                rating: parseInt(rating, 10),
                review_title: reviewTitle || null,
                review_text: reviewText || null,
                is_approved: true
            }])
            .select('*')
            .single();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            message: 'Review submitted successfully',
            review: data
        }, { status: 201 });
    } catch (err) {
        console.error('[API REVIEWS POST ERROR]', err);
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
    }
}
