import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { transitionReturnStatus, logReturnStatus } from '@/services/returnService';

export const dynamic = 'force-dynamic';

// ─── GET: Full return detail ─────────────────────────────────────────────────

export async function GET(request, { params }) {
    try {
        const resolvedParams = await params;
        const rawId = resolvedParams?.id;

        if (!rawId) {
            return NextResponse.json({ error: 'Return ID is required' }, { status: 400 });
        }

        // Resilient lookup: try matching primary UUID id first, then return_id code
        let { data: ret, error: retErr } = await supabaseAdmin.from('return_requests')
            .select('*, products(*), customers(*), orders(*)')
            .eq('id', rawId)
            .maybeSingle();

        if (!ret) {
            const { data: ret2 } = await supabaseAdmin.from('return_requests')
                .select('*, products(*), customers(*), orders(*)')
                .eq('return_id', rawId)
                .maybeSingle();
            ret = ret2;
        }

        if (!ret) {
            return NextResponse.json({ error: 'Return request not found' }, { status: 404 });
        }

        const id = ret.id;

        const [
            { data: images },
            { data: logs },
            { data: shipments },
            { data: returnShipping },
            { data: inspection },
        ] = await Promise.all([
            supabaseAdmin.from('return_images').select('*').eq('return_request_id', id).order('uploaded_at', { ascending: true }),
            supabaseAdmin.from('return_status_logs').select('*').eq('return_request_id', id).order('created_at', { ascending: true }),
            supabaseAdmin.from('return_courier_shipments').select('*').eq('return_request_id', id).order('created_at', { ascending: true }),
            supabaseAdmin.from('return_shipping').select('*').eq('return_request_id', id).order('created_at', { ascending: false }).maybeSingle(),
            supabaseAdmin.from('return_inspections').select('*').eq('return_request_id', id).maybeSingle(),
        ]);

        return NextResponse.json({
            ...ret,
            images: images || [],
            statusLogs: logs || [],
            shipments: shipments || [],
            returnShipping: returnShipping || null,
            inspection: inspection || null,
        });
    } catch (err) {
        console.error('[GET /api/returns/[id]]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ─── PATCH: Admin actions ────────────────────────────────────────────────────

export async function PATCH(request, { params }) {
    try {
        const resolvedParams = await params;
        const rawId = resolvedParams?.id;

        if (!rawId) {
            return NextResponse.json({ error: 'Return ID is required' }, { status: 400 });
        }

        const body = await request.json();
        const { action, notes, rejectionReason, courierData, inspectionData, refundData, exchangeData, actor = 'admin' } = body;

        // Fetch current state by ID or return_id
        let { data: ret } = await supabaseAdmin.from('return_requests').select('*').eq('id', rawId).maybeSingle();
        if (!ret) {
            const { data: ret2 } = await supabaseAdmin.from('return_requests').select('*').eq('return_id', rawId).maybeSingle();
            ret = ret2;
        }

        if (!ret) return NextResponse.json({ error: 'Return request not found' }, { status: 404 });

        const id = ret.id;
        let result;

        switch (action) {

            // ── APPROVE RETURN REQUEST ────────────────────────────────────────
            case 'approve': {
                result = await transitionReturnStatus({
                    returnRequestId: id,
                    newStatus: 'RETURN_APPROVED',
                    actor,
                    notes: notes || 'Return request approved by admin. Customer can now ship product to company.',
                    extraUpdates: {
                        approved_at: new Date().toISOString(),
                        approved_by: actor
                    }
                });
                break;
            }

            // ── REJECT RETURN REQUEST ─────────────────────────────────────────
            case 'reject': {
                const finalReason = rejectionReason || notes || 'Request does not meet return policy requirements.';
                result = await transitionReturnStatus({
                    returnRequestId: id,
                    newStatus: 'RETURN_REJECTED',
                    actor,
                    notes: finalReason,
                    extraUpdates: { rejection_reason: finalReason }
                });
                break;
            }

            // ── MARK RECEIVED BY COMPANY ──────────────────────────────────────
            case 'mark_received': {
                result = await transitionReturnStatus({
                    returnRequestId: id,
                    newStatus: 'RECEIVED_BY_COMPANY',
                    actor,
                    notes: notes || 'Returned product received at company facility.',
                    extraUpdates: {
                        received_at: new Date().toISOString(),
                        received_by: actor,
                        received_notes: notes || null
                    }
                });
                break;
            }

            // ── START INSPECTION ──────────────────────────────────────────────
            case 'start_inspection': {
                await supabaseAdmin.from('return_inspections').upsert({
                    return_request_id: id,
                    result: 'PENDING',
                    inspector: actor,
                });
                result = await transitionReturnStatus({ returnRequestId: id, newStatus: 'INSPECTION_PENDING', actor, notes });
                break;
            }

            // ── BEGIN INSPECTION FORM ─────────────────────────────────────────
            case 'under_inspection': {
                result = await transitionReturnStatus({ returnRequestId: id, newStatus: 'UNDER_INSPECTION', actor, notes });
                break;
            }

            // ── SAVE INSPECTION (APPROVE) ─────────────────────────────────────
            case 'inspection_approve': {
                const insp = inspectionData || {};
                await supabaseAdmin.from('return_inspections').upsert({
                    return_request_id: id,
                    packaging_condition: insp.packagingCondition || 'GOOD',
                    product_condition: insp.productCondition || 'GOOD',
                    has_damage: insp.hasDamage ? 1 : 0,
                    has_stain: insp.hasStain ? 1 : 0,
                    has_usage: insp.hasUsage ? 1 : 0,
                    has_tags: insp.hasTags ? 1 : 0,
                    has_accessories: insp.hasAccessories ? 1 : 0,
                    inspection_notes: insp.notes,
                    inspector: actor,
                    result: 'APPROVED',
                    inspected_at: new Date().toISOString(),
                });
                result = await transitionReturnStatus({
                    returnRequestId: id,
                    newStatus: 'INSPECTION_APPROVED',
                    actor,
                    notes: 'Quality inspection passed successfully.'
                });
                break;
            }

            // ── SAVE INSPECTION (REJECT) ──────────────────────────────────────
            case 'inspection_reject': {
                const finalReason2 = rejectionReason || 'Failed quality inspection.';
                const insp2 = inspectionData || {};
                await supabaseAdmin.from('return_inspections').upsert({
                    return_request_id: id,
                    packaging_condition: insp2.packagingCondition || 'DAMAGED',
                    product_condition: insp2.productCondition || 'DAMAGED',
                    has_damage: insp2.hasDamage ? 1 : 0,
                    has_stain: insp2.hasStain ? 1 : 0,
                    has_usage: insp2.hasUsage ? 1 : 0,
                    has_tags: insp2.hasTags ? 1 : 0,
                    has_accessories: insp2.hasAccessories ? 1 : 0,
                    inspection_notes: insp2.notes,
                    inspector: actor,
                    result: 'REJECTED',
                    rejection_reason: finalReason2,
                    inspected_at: new Date().toISOString(),
                });
                result = await transitionReturnStatus({
                    returnRequestId: id,
                    newStatus: 'INSPECTION_REJECTED',
                    actor,
                    notes: finalReason2,
                    extraUpdates: { rejection_reason: finalReason2 }
                });
                break;
            }

            // ── PROCESS REFUND ────────────────────────────────────────────────
            case 'process_refund': {
                const { data: order } = await supabaseAdmin
                    .from('orders')
                    .select('total_amount, payment_method')
                    .eq('id', ret.order_id)
                    .single();

                let shippingReimbursement = 0;
                if (refundData?.reimburseShipping) {
                    const { data: shipData } = await supabaseAdmin
                        .from('return_shipping')
                        .select('shipping_cost')
                        .eq('return_request_id', id)
                        .maybeSingle();
                    shippingReimbursement = shipData?.shipping_cost ? parseFloat(shipData.shipping_cost) : 0;
                }

                const baseAmount = order?.total_amount ? parseFloat(order.total_amount) : 0;
                const calculatedAmount = baseAmount + shippingReimbursement;
                const refundMethod = refundData?.refundMethod || order?.payment_method || 'ORIGINAL';

                await transitionReturnStatus({ returnRequestId: id, newStatus: 'REFUND_PENDING', actor });
                await transitionReturnStatus({
                    returnRequestId: id,
                    newStatus: 'REFUND_PROCESSING',
                    actor,
                    notes: `Refund of ₹${calculatedAmount} (Base: ₹${baseAmount}${shippingReimbursement ? `, Shipping Reimbursement: ₹${shippingReimbursement}` : ''}) via ${refundMethod} initiated`,
                    extraUpdates: {
                        refund_amount: calculatedAmount,
                        refund_method: refundMethod,
                        refund_status: 'PROCESSING',
                    }
                });

                result = { success: true };
                break;
            }

            // ── COMPLETE REFUND ───────────────────────────────────────────────
            case 'complete_refund': {
                const refundId = refundData?.refundId || `REF-${Date.now()}`;
                result = await transitionReturnStatus({
                    returnRequestId: id,
                    newStatus: 'REFUND_COMPLETED',
                    actor,
                    notes: `Refund completed. Transaction ID: ${refundId}`,
                    extraUpdates: {
                        refund_id: refundId,
                        refund_status: 'COMPLETED',
                        refund_completed_at: new Date().toISOString(),
                    }
                });
                await transitionReturnStatus({ returnRequestId: id, newStatus: 'COMPLETED', actor, notes: 'Return request closed and completed.' });
                break;
            }

            // ── PROCESS EXCHANGE ──────────────────────────────────────────────
            case 'process_exchange': {
                const { replacementProductId, replacementVariantId, exchangeNotes } = exchangeData || {};

                if (replacementProductId) {
                    const { data: prod } = await supabaseAdmin.from('products').select('stock, name').eq('id', replacementProductId).single();
                    if (prod && prod.stock < 1) {
                        return NextResponse.json({ error: `"${prod.name}" is out of stock.` }, { status: 400 });
                    }
                }

                await transitionReturnStatus({ returnRequestId: id, newStatus: 'EXCHANGE_PENDING', actor });
                result = await transitionReturnStatus({
                    returnRequestId: id,
                    newStatus: 'EXCHANGE_PROCESSING',
                    actor,
                    notes: exchangeNotes || 'Exchange processing started',
                    extraUpdates: {
                        exchange_product_id: replacementProductId || null,
                        exchange_variant_id: replacementVariantId || null,
                    }
                });
                break;
            }

            // ── SHIP EXCHANGE ─────────────────────────────────────────────────
            case 'ship_exchange': {
                const { courierName: cn, awbNumber: awn, trackingUrl: tu } = courierData || {};
                if (!cn) return NextResponse.json({ error: 'Courier name required' }, { status: 400 });

                await supabaseAdmin.from('return_courier_shipments').insert({
                    return_request_id: id,
                    shipment_type: 'BACK_TO_CUSTOMER',
                    courier_name: cn,
                    awb_number: awn || null,
                    tracking_url: tu || null,
                    notes: 'Exchange product shipped to customer',
                });

                result = await transitionReturnStatus({
                    returnRequestId: id,
                    newStatus: 'EXCHANGE_SHIPPED',
                    actor,
                    notes: `Exchange shipped via ${cn}. AWB: ${awn || 'N/A'}`
                });
                break;
            }

            // ── MARK EXCHANGE DELIVERED ───────────────────────────────────────
            case 'exchange_delivered': {
                await supabaseAdmin.from('return_courier_shipments')
                    .update({ delivered_at: new Date().toISOString() })
                    .eq('return_request_id', id)
                    .eq('shipment_type', 'BACK_TO_CUSTOMER');
                await transitionReturnStatus({ returnRequestId: id, newStatus: 'EXCHANGE_DELIVERED', actor });
                result = await transitionReturnStatus({ returnRequestId: id, newStatus: 'COMPLETED', actor, notes: 'Exchange delivered and closed.' });
                break;
            }

            // ── CREATE REVERSE SHIPMENT ────────────────────────────────────────
            case 'return_to_customer': {
                const { courierName: rcn, awbNumber: rawn, trackingUrl: rtu } = courierData || {};
                if (!rcn) return NextResponse.json({ error: 'Courier name required' }, { status: 400 });

                await supabaseAdmin.from('return_courier_shipments').insert({
                    return_request_id: id,
                    shipment_type: 'BACK_TO_CUSTOMER',
                    courier_name: rcn,
                    awb_number: rawn || null,
                    tracking_url: rtu || null,
                    notes: 'Rejected item shipped back to customer',
                });

                result = await transitionReturnStatus({ returnRequestId: id, newStatus: 'RETURN_TO_CUSTOMER', actor });
                break;
            }

            // ── MARK REVERSE SHIPPED ──────────────────────────────────────────
            case 'mark_reverse_shipped': {
                result = await transitionReturnStatus({ returnRequestId: id, newStatus: 'RETURN_TO_CUSTOMER_SHIPPED', actor, notes });
                break;
            }

            // ── MARK REVERSE DELIVERED & CLOSE ─────────────────────────────────
            case 'mark_reverse_delivered': {
                await supabaseAdmin.from('return_courier_shipments')
                    .update({ delivered_at: new Date().toISOString() })
                    .eq('return_request_id', id)
                    .eq('shipment_type', 'BACK_TO_CUSTOMER');
                await transitionReturnStatus({ returnRequestId: id, newStatus: 'RETURN_TO_CUSTOMER_DELIVERED', actor });
                result = await transitionReturnStatus({ returnRequestId: id, newStatus: 'RETURN_CLOSED', actor, notes: 'Rejected product returned to customer. Return closed.' });
                break;
            }

            // ── CANCEL ────────────────────────────────────────────────────────
            case 'cancel': {
                result = await transitionReturnStatus({ returnRequestId: id, newStatus: 'CANCELLED', actor, notes });
                break;
            }

            default:
                return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
        }

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[PATCH /api/returns/[id]]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
