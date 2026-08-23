import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { transitionReturnStatus } from '@/services/returnService';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
    try {
        const resolvedParams = await params;
        const rawId = resolvedParams?.id;

        if (!rawId) {
            return NextResponse.json({ error: 'Return ID is required' }, { status: 400 });
        }

        const body = await request.json();
        const {
            courier_company_id,
            courier_company_name,
            tracking_number,
            shipping_date,
            shipping_cost,
            receipt_url,
            notes,
            customer_id
        } = body;

        // 1. Fetch return request by primary UUID id or return_id code
        let { data: ret, error: fetchErr } = await supabaseAdmin
            .from('return_requests')
            .select('id, return_id, status, customer_id, order_id')
            .eq('id', rawId)
            .maybeSingle();

        if (!ret) {
            const { data: ret2 } = await supabaseAdmin
                .from('return_requests')
                .select('id, return_id, status, customer_id, order_id')
                .eq('return_id', rawId)
                .maybeSingle();
            ret = ret2;
        }

        if (fetchErr || !ret) {
            return NextResponse.json({ error: 'Return request not found' }, { status: 404 });
        }

        const id = ret.id;

        // 2. Validate ownership if customer_id supplied
        if (customer_id && ret.customer_id && String(ret.customer_id) !== String(customer_id)) {
            return NextResponse.json({ error: 'Unauthorized: Return request does not belong to this account' }, { status: 403 });
        }

        // 3. Status Validation: Allow RETURN_APPROVED, APPROVED, CUSTOMER_SHIPPING_PENDING, or CUSTOMER_SHIPPED (for updates)
        const ALLOWED_SHIPPING_STATUSES = [
            'RETURN_APPROVED',
            'APPROVED',
            'CUSTOMER_SHIPPING_PENDING',
            'CUSTOMER_SHIPPED'
        ];

        if (!ALLOWED_SHIPPING_STATUSES.includes(ret.status)) {
            return NextResponse.json({
                error: `Cannot submit shipping information. Return status is currently '${ret.status}'. Shipping can only be submitted for approved returns.`
            }, { status: 400 });
        }

        // 4. Validate mandatory inputs
        if (!courier_company_name || !courier_company_name.trim()) {
            return NextResponse.json({ error: 'Courier Company name is required.' }, { status: 400 });
        }
        if (!tracking_number || !tracking_number.trim()) {
            return NextResponse.json({ error: 'Courier Tracking / AWB Number is required.' }, { status: 400 });
        }
        if (!shipping_date) {
            return NextResponse.json({ error: 'Shipping Date is required.' }, { status: 400 });
        }

        // 5. Check if shipping entry already exists for this return request
        const { data: existingShipping } = await supabaseAdmin
            .from('return_shipping')
            .select('id')
            .eq('return_request_id', id)
            .maybeSingle();

        const shippingPayload = {
            return_request_id: id,
            courier_company_id: courier_company_id || null,
            courier_company_name: courier_company_name.trim(),
            tracking_number: tracking_number.trim(),
            shipping_date: shipping_date,
            shipping_cost: shipping_cost ? parseFloat(shipping_cost) : null,
            receipt_url: receipt_url || null,
            notes: notes || null,
            status: 'SHIPPED',
            shipped_at: new Date().toISOString(),
        };

        let savedShipping;

        if (existingShipping) {
            // Update existing shipping details
            const { data: updated, error: updateErr } = await supabaseAdmin
                .from('return_shipping')
                .update(shippingPayload)
                .eq('id', existingShipping.id)
                .select()
                .single();

            if (updateErr) {
                console.error('[POST /api/returns/[id]/shipping] Update DB Error:', updateErr);
                return NextResponse.json({ error: 'Failed to update shipping details.' }, { status: 500 });
            }
            savedShipping = updated;
        } else {
            // Insert new shipping details
            const { data: inserted, error: insertErr } = await supabaseAdmin
                .from('return_shipping')
                .insert(shippingPayload)
                .select()
                .single();

            if (insertErr) {
                console.error('[POST /api/returns/[id]/shipping] Insert DB Error:', insertErr);
                return NextResponse.json({ error: 'Failed to record shipping details.' }, { status: 500 });
            }
            savedShipping = inserted;
        }

        // 6. Transition return_requests status to CUSTOMER_SHIPPED
        if (ret.status !== 'CUSTOMER_SHIPPED') {
            const transitionRes = await transitionReturnStatus({
                returnRequestId: id,
                newStatus: 'CUSTOMER_SHIPPED',
                actor: 'customer',
                notes: `Product shipped by customer via ${courier_company_name.trim()} (AWB: ${tracking_number.trim()})`,
                extraUpdates: {
                    shipped_at: new Date().toISOString()
                }
            });

            if (!transitionRes.success) {
                console.error('[POST /api/returns/[id]/shipping] Transition Error:', transitionRes.error);
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Shipping details submitted successfully. Your return package is marked as shipped.',
            shipping: savedShipping
        });

    } catch (err) {
        console.error('[POST /api/returns/[id]/shipping] Exception:', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
