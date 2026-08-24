'use client';



import React, { useState, useEffect } from 'react';
import Link from 'next/link';

import { supabase } from '@/lib/supabaseClient';

import {
    Search, Eye, ChevronDown, rotateCcw, ChevronLeft, ChevronRight,
    Loader2, MessageCircle, Truck, RefreshCw, Plus, Trash2, Download, ExternalLink, Package,
    Mail, XCircle, AlertCircle, CheckCircle, Send, Save, X, Trophy, TrendingUp, ShoppingCart, CreditCard, IndianRupee, Info,
    User, Phone, MapPin, Globe, ShieldAlert, FileText
} from 'lucide-react';
import { generateInvoicePDF } from '@/lib/invoiceGenerator';
import { getNextOrderAndInvoiceId } from '@/lib/orderIdGenerator';
import OrderLabelPrint from '@/components/OrderLabelPrint';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';


const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];
const STATUS_OPTIONS = ['PLACED', 'AWAITING_PAYMENT', 'PAID', 'PACKING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUND_REQUESTED', 'REFUNDED'];
const SOURCE_FILTERS = ['ALL', 'WEBSITE', 'WHATSAPP', 'MANUAL'];

// Helper: format invoice number with clean, single # prefix (never ##)
const formatOrderInvoice = (o) => {
    if (!o) return '#INV-0001';
    const raw = o.invoice_no || (o.id ? String(o.id).replace(/^[A-Z]+-/, 'INV-') : 'INV-0001');
    const clean = String(raw).replace(/^#+/, '');
    return `#${clean}`;
};

// Helper: parse UTC/MySQL timestamps reliably into IST (Asia/Kolkata)
const toIST = (dStr, opts = {}) => {
    if (!dStr) return '';
    let s = String(dStr).trim();
    if (s.includes(' ') && !s.includes('T')) s = s.replace(' ', 'T');
    if (!s.endsWith('Z') && !s.includes('+')) s += 'Z';
    try {
        const d = new Date(s);
        if (isNaN(d.getTime())) return dStr;
        return d.toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: 'numeric',
            month: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
            ...opts
        });
    } catch (e) { return dStr; }
};



const getStatusReference = (status) => {
    switch (status) {
        case 'PLACED': return 'badge-placed';
        case 'PENDING': return 'badge-placed';
        case 'AWAITING_PAYMENT': return 'badge-placed';
        case 'PAID': return 'badge-paid';
        case 'PACKING': return 'badge-placed'; // Use placed/pending style for packing
        case 'SHIPPED': return 'badge-shipped';
        case 'DELIVERED': return 'badge-delivered';
        case 'CANCELLED': return 'badge-cancelled';
        default: return 'badge';
    }
};


function parseCourierDetails(order) {
    if (!order) return { name: '', trackingNumber: '', trackingUrl: '' };

    let name = '';
    let trackingNumber = order.tracking_number || order.tracking_id || order.awb_number || '';
    let trackingUrl = order.tracking_url || '';

    const rawCourier = order.courier_name || order.courier_partner || order.courier || order.carrier || order.shipping_courier;

    if (typeof rawCourier === 'string') {
        if (rawCourier.trim().startsWith('{')) {
            try {
                const parsed = JSON.parse(rawCourier);
                name = parsed.name || parsed.courier_name || parsed.courier || parsed.carrier || parsed.title || parsed.query || '';
                if (!trackingNumber && (parsed.tracking_number || parsed.tracking_id || parsed.awb)) {
                    trackingNumber = parsed.tracking_number || parsed.tracking_id || parsed.awb;
                }
                if (!trackingUrl && (parsed.tracking_url || parsed.url)) {
                    trackingUrl = parsed.tracking_url || parsed.url;
                }
            } catch (e) {
                name = rawCourier;
            }
        } else {
            name = rawCourier;
        }
    } else if (typeof rawCourier === 'object' && rawCourier !== null) {
        name = rawCourier.name || rawCourier.courier_name || rawCourier.courier || rawCourier.carrier || rawCourier.title || '';
        if (!trackingNumber && (rawCourier.tracking_number || rawCourier.tracking_id || rawCourier.awb)) {
            trackingNumber = rawCourier.tracking_number || rawCourier.tracking_id || rawCourier.awb;
        }
        if (!trackingUrl && (rawCourier.tracking_url || rawCourier.url)) {
            trackingUrl = rawCourier.tracking_url || rawCourier.url;
        }
    }

    if (trackingUrl && trackingNumber && trackingUrl.includes('{')) {
        trackingUrl = trackingUrl.replace(/\{[^}]+\}/g, trackingNumber);
    }

    return {
        name: String(name || '').trim(),
        trackingNumber: String(trackingNumber || '').trim(),
        trackingUrl: String(trackingUrl || '').trim()
    };
}

function buildOrderSearchOrCondition(rawTerm) {
    if (!rawTerm || typeof rawTerm !== 'string') return null;
    const trimmed = rawTerm.trim();
    if (!trimmed) return null;

    // Remove leading hash '#' e.g. "#WEB-848593" -> "WEB-848593"
    const strippedHash = trimmed.replace(/^#+/, '').trim();
    // Remove PostgREST reserved syntax chars: commas, parentheses
    const cleanTerm = strippedHash.replace(/[,()]/g, '');
    if (!cleanTerm) return null;

    const digitsOnly = cleanTerm.replace(/\D/g, '');
    const conditions = new Set();

    // 1. Match order ID directly (case-insensitive substring)
    conditions.add(`id.ilike.%${cleanTerm}%`);
    if (strippedHash !== trimmed) {
        const cleanRaw = trimmed.replace(/[,()]/g, '');
        if (cleanRaw) conditions.add(`id.ilike.%${cleanRaw}%`);
    }

    // 2. Match Customer Name
    conditions.add(`customer_name.ilike.%${cleanTerm}%`);

    // 3. Match Email addresses
    conditions.add(`customer_email.ilike.%${cleanTerm}%`);
    conditions.add(`billing_email.ilike.%${cleanTerm}%`);
    conditions.add(`shipping_email.ilike.%${cleanTerm}%`);

    // 4. Direct phone string matching (e.g., if phone stored with spaces or exact format)
    conditions.add(`customer_phone.ilike.%${cleanTerm}%`);
    conditions.add(`billing_phone.ilike.%${cleanTerm}%`);
    conditions.add(`shipping_phone.ilike.%${cleanTerm}%`);

    // 5. Digit-based matching for IDs & Phone Numbers
    if (digitsOnly.length > 0) {
        // Match numeric part in Order ID (e.g. searching "848593" matches "WEB-848593" or "MAN-848593")
        conditions.add(`id.ilike.%${digitsOnly}%`);

        if (digitsOnly.length >= 3) {
            conditions.add(`customer_phone.ilike.%${digitsOnly}%`);
            conditions.add(`billing_phone.ilike.%${digitsOnly}%`);
            conditions.add(`shipping_phone.ilike.%${digitsOnly}%`);

            // Standard Indian phone number variations (10 digits vs 12 digits starting with 91)
            if (digitsOnly.length === 10) {
                conditions.add(`customer_phone.ilike.%91${digitsOnly}%`);
                conditions.add(`billing_phone.ilike.%91${digitsOnly}%`);
                conditions.add(`shipping_phone.ilike.%91${digitsOnly}%`);
            } else if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
                const tenDigits = digitsOnly.substring(2);
                conditions.add(`customer_phone.ilike.%${tenDigits}%`);
                conditions.add(`billing_phone.ilike.%${tenDigits}%`);
                conditions.add(`shipping_phone.ilike.%${tenDigits}%`);
            }
        }
    }

    // 6. Split words for customer name search if search term contains spaces (e.g., "Mano Sebastin")
    const words = cleanTerm.split(/\s+/).filter(w => w.length >= 2);
    if (words.length > 1) {
        words.forEach(w => {
            const cleanWord = w.replace(/[,()]/g, '');
            if (cleanWord) {
                conditions.add(`customer_name.ilike.%${cleanWord}%`);
            }
        });
    }

    return Array.from(conditions).join(',');
}


export default function OrdersPage() {

    const [orders, setOrders] = useState([]);

    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const [statusFilter, setStatusFilter] = useState('ALL');

    const [sourceFilter, setSourceFilter] = useState('ALL');

    const [selectedOrder, setSelectedOrder] = useState(null);

    const [orderItems, setOrderItems] = useState([]);
    const [isEditingItems, setIsEditingItems] = useState(false);
    const [notification, setNotification] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null); // { ids: string[] }
    const [orderActivityLogs, setOrderActivityLogs] = useState([]);
    const [hasMounted, setHasMounted] = useState(false);
    const [showShippingModal, setShowShippingModal] = useState(false);
    const [selectedOrderForTracking, setSelectedOrderForTracking] = useState(null);
    const [shippingForm, setShippingForm] = useState({
        courier_name: '',
        tracking_number: '',
        tracking_url: ''
    });
    const [isAddingOrder, setIsAddingOrder] = useState(false);
    const [showShippingForm, setShowShippingForm] = useState(false);
    const [savingCourier, setSavingCourier] = useState(false);
    const [courierModalError, setCourierModalError] = useState('');
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [showResendEmailModal, setShowResendEmailModal] = useState(false);
    const [showResendWhatsAppModal, setShowResendWhatsAppModal] = useState(false);
    const [showSendNotificationModal, setShowSendNotificationModal] = useState(false);
    const [sendWhatsAppChecked, setSendWhatsAppChecked] = useState(true);
    const [sendEmailChecked, setSendEmailChecked] = useState(true);
    const [notificationPhone, setNotificationPhone] = useState('');
    const [notificationEmail, setNotificationEmail] = useState('');
    const [statusConfirmModal, setStatusConfirmModal] = useState(null);
    const [returningItem, setReturningItem] = useState(null);
    const [returnQty, setReturnQty] = useState(1);
    const [isPrintingLabels, setIsPrintingLabels] = useState(false);
    const [couriers, setCouriers] = useState([]);
    const [selectedCourierId, setSelectedCourierId] = useState('');
    const [infoModalOrder, setInfoModalOrder] = useState(null);
    const [isCourierFromTable, setIsCourierFromTable] = useState(false);
    const [isCourierSaved, setIsCourierSaved] = useState(false);

    const formatDisplayPhoneNumber = (phone) => {
        if (!phone) return '';
        let cleaned = String(phone).replace(/\D/g, '');
        if (cleaned.length === 12 && cleaned.startsWith('91')) {
            const part1 = cleaned.substring(2, 7);
            const part2 = cleaned.substring(7);
            return `+91 ${part1} ${part2}`;
        } else if (cleaned.length === 10) {
            const part1 = cleaned.substring(0, 5);
            const part2 = cleaned.substring(5);
            return `+91 ${part1} ${part2}`;
        } else if (cleaned.startsWith('91') && cleaned.length > 10) {
            return `+${cleaned.substring(0, 2)} ${cleaned.substring(2)}`;
        } else if (cleaned.length > 5) {
            const part1 = cleaned.substring(0, 5);
            const part2 = cleaned.substring(5);
            return `${part1} ${part2}`;
        }
        return phone;
    };

    const parseStructuredAddress = (rawAddr, defaultName = '', defaultPhone = '') => {
        if (!rawAddr) return { name: defaultName, phone: defaultPhone, address_line: '', city: '', pincode: '', state: 'Tamil Nadu' };
        
        let obj = rawAddr;
        if (typeof rawAddr === 'string' && rawAddr.trim().startsWith('{')) {
            try { obj = JSON.parse(rawAddr); } catch(e) {}
        }
        
        if (typeof obj === 'object' && obj !== null) {
            return {
                name: obj.name || defaultName,
                phone: obj.phone || obj.mobile || defaultPhone,
                address_line: obj.address || obj.address_line || '',
                city: obj.city || '',
                pincode: obj.pincode || obj.postal_code || '',
                state: obj.state || 'Tamil Nadu'
            };
        }

        const str = String(rawAddr).trim();
        const parts = str.split(',').map(s => s.trim()).filter(Boolean);
        
        let name = defaultName;
        let phone = defaultPhone;
        let city = '';
        let state = 'Tamil Nadu';
        let pincode = '';
        let address_line = str;

        if (parts.length >= 2) {
            if (parts[0] && isNaN(parts[0])) name = parts[0];
            if (parts[1] && (parts[1].length >= 10 || !isNaN(parts[1]))) phone = parts[1];

            const lastPart = parts[parts.length - 1];
            if (lastPart && /^\d{6}$/.test(lastPart)) {
                pincode = lastPart;
            }

            const knownStates = ['Tamil Nadu', 'Kerala', 'Karnataka', 'Andhra Pradesh', 'Telangana', 'Maharashtra', 'Delhi', 'Gujarat'];
            const stateIdx = parts.findIndex(p => knownStates.includes(p));
            if (stateIdx !== -1) {
                state = parts[stateIdx];
            }

            if (stateIdx > 0) {
                city = parts[stateIdx - 1];
            } else if (parts.length >= 4) {
                city = parts[parts.length - (pincode ? 2 : 1)] || '';
            }

            const midParts = parts.filter(p => p !== name && p !== phone && p !== pincode && p !== state && p !== city);
            if (midParts.length > 0) {
                address_line = midParts.join(', ');
            }
        }

        return { name, phone, address_line, city, pincode, state };
    };

    const prepareOrderForEditing = (order) => {
        if (!order) return null;
        const ship = parseStructuredAddress(order.shipping_address || order.delivery_address, order.customer_name, order.customer_phone);
        const bill = parseStructuredAddress(order.billing_address || order.delivery_address, order.customer_name, order.customer_phone);
        
        const prepared = {
            ...order,
            shipping_name: order.shipping_name || ship.name,
            shipping_phone: order.shipping_phone || ship.phone,
            shipping_address_line: order.shipping_address_line || ship.address_line,
            shipping_city: order.shipping_city || ship.city,
            shipping_pincode: order.shipping_pincode || ship.pincode,
            shipping_state: order.shipping_state || ship.state,

            billing_name: order.billing_name || bill.name,
            billing_phone: order.billing_phone || bill.phone,
            billing_address_line: order.billing_address_line || bill.address_line,
            billing_city: order.billing_city || bill.city,
            billing_pincode: order.billing_pincode || bill.pincode,
            billing_state: order.billing_state || bill.state,
        };
        setSelectedOrder(prepared);
        return prepared;
    };

    const resolveItemProduct = (item, catalogProducts = []) => {
        if (!item) return null;
        if (item.products && (item.products.image_url || item.products.sku)) return item.products;

        const pId = String(item.product_id || '').trim();
        const pName = String(item.product_name || '').trim().toLowerCase();

        const catalog = catalogProducts && catalogProducts.length > 0 ? catalogProducts : allProducts;
        if (!catalog || catalog.length === 0) return item.products || null;

        // 1. Try match by ID, SKU, product_no, or product_catalog_image_id
        if (pId) {
            const matchById = catalog.find(p => 
                String(p.id) === pId || 
                String(p.sku || '').trim() === pId || 
                String(p.product_no || '').trim() === pId ||
                String(p.product_catalog_image_id || '').trim().toUpperCase() === pId.toUpperCase()
            );
            if (matchById) return matchById;
        }

        // 2. Try exact case-insensitive Name match
        if (pName) {
            const matchByName = catalog.find(p => String(p.name || '').trim().toLowerCase() === pName);
            if (matchByName) return matchByName;
        }

        // 3. Try fuzzy/substring Name match (e.g. "Kota Doria with embroidery" <-> "Kota Doria")
        if (pName) {
            const matchBySub = catalog.find(p => {
                const dbName = String(p.name || '').trim().toLowerCase();
                return dbName.length > 3 && (dbName.includes(pName) || pName.includes(dbName));
            });
            if (matchBySub) return matchBySub;
        }

        return item.products || null;
    };

    const enrichOrderItems = async (rawItems) => {
        let items = rawItems || [];
        if (items.length === 0) return [];

        let catalog = allProducts;
        if (!catalog || catalog.length === 0) {
            const { data: dbProds } = await supabase.from('products').select('*');
            catalog = dbProds || [];
            setAllProducts(catalog);
        }

        const productIds = items.map(i => i.product_id).filter(Boolean);
        const variantIds = items.map(i => i.variant_id).filter(Boolean);

        const [prodsRes, varsRes] = await Promise.all([
            productIds.length > 0 ? supabase.from('products').select('id, name, image_url, sku, category, product_no, product_group, product_catalog_image_id').in('id', productIds) : { data: [] },
            variantIds.length > 0 ? supabase.from('product_variants').select('id, image_url, sku, name').in('id', variantIds) : { data: [] }
        ]);

        const prodMap = new Map((prodsRes.data || []).map(p => [String(p.id), p]));
        const varMap = new Map((varsRes.data || []).map(v => [String(v.id), v]));

        return items.map(item => {
            let prod = item.product_id ? prodMap.get(String(item.product_id)) || null : null;
            let vnt = item.variant_id ? varMap.get(String(item.variant_id)) || null : null;

            if (!prod || (!prod.image_url && catalog.length > 0)) {
                const resolved = resolveItemProduct(item, catalog);
                if (resolved) prod = { ...(prod || {}), ...resolved };
            }

            return {
                ...item,
                products: prod,
                variant: vnt
            };
        });
    };

    const getItemImageUrl = (item) => {
        if (!item) return null;
        const resolvedProduct = item.products || resolveItemProduct(item, allProducts);
        const raw = 
            item.variant?.image_url || 
            resolvedProduct?.image_url || 
            item.products?.image_url ||
            item.product?.image_url || 
            item.image_url || 
            item.product_image || 
            item.product_image_url ||
            item.image;

        if (!raw) return null;
        const first = String(raw).split(',')[0].trim();
        if (!first) return null;
        if (first.startsWith('http://') || first.startsWith('https://') || first.startsWith('/') || first.startsWith('data:')) return first;
        if (first.startsWith('images/')) return `/${first}`;
        return `/images/${first}`;
    };

    const [newOrder, setNewOrder] = useState({
        customer_name: '',
        billing_email: '',
        billing_phone: '',
        billing_address: '',
        billing_city: '',
        billing_pincode: '',
        billing_state: 'Tamil Nadu',
        shipping_email: '',
        shipping_phone: '',
        shipping_address: '',
        shipping_city: '',
        shipping_pincode: '',
        shipping_state: 'Tamil Nadu',
        same_as_billing: true,
        payment_method: 'UPI',
        send_notifications: 'both',
        items: [], // {product_id, product_name, quantity, price}
        is_replacement: false,
        manual_shipping_cost: ''
    });
    const [allProducts, setAllProducts] = useState([]);
    const [productSearch, setProductSearch] = useState('');
    const [ordersPage, setOrdersPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [statusCounts, setStatusCounts] = useState({
        ALL: 0, PLACED: 0, AWAITING_PAYMENT: 0, PAID: 0, PACKING: 0, SHIPPED: 0, DELIVERED: 0, CANCELLED: 0, REFUNDED: 0
    });
    const ORDERS_PER_PAGE = 10;

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [ordersPage]);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'analytics'
    const [analyticsData, setAnalyticsData] = useState({
        revenueTrend: [],
        channelData: [],
        statusData: [],
        courierData: [],
        topProducts: []
    });
    const [timeRange, setTimeRange] = useState('MONTHLY'); // DAILY, MONTHLY, QUARTERLY, ALL

    // Reset to page 1 on search or filter (Moved down)
    const [selectedOrderIds, setSelectedOrderIds] = useState([]);
    const [printingOrders, setPrintingOrders] = useState([]);
    const [printMode, setPrintMode] = useState('address'); // 'address' or 'id'
    const [notificationSelection, setNotificationSelection] = useState(null); // { type: 'email' | 'whatsapp', billing: string, shipping: string, orderId: string }
    const [isCreatingOrder, setIsCreatingOrder] = useState(false);
    const [shippingZones, setShippingZones] = useState([]);
    const [shippingMappings, setShippingMappings] = useState([]);



    const toggleSelectItem = (id) => {
        setSelectedOrderIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedOrderIds.length === orders.length && orders.length > 0) {
            setSelectedOrderIds([]);
        } else {
            setSelectedOrderIds(orders.map(o => o.id));
        }
    };

    const handleBulkDelete = (idsToUse = null) => {
        // Ensure idsToUse is actually an array, not a click event
        const ids = Array.isArray(idsToUse) ? idsToUse : selectedOrderIds;
        if (!ids || !ids.length) return;
        setConfirmDelete({ ids });
    };

    const handleDeleteOrderConfirmed = async () => {
        if (!confirmDelete) return;
        const { ids } = confirmDelete;
        setConfirmDelete(null);

        setLoading(true);
        try {
            // Delete order items first (cascading delete should ideally be in DB, but being safe)
            // If DB doesn't have CASCADE, we delete manually
            await supabase.from('order_items').delete().in('order_id', ids);
            await supabase.from('order_status_logs').delete().in('order_id', ids);

            const { error } = await supabase
                .from('orders')
                .delete()
                .in('id', ids);

            if (error) throw error;

            setNotification({ type: 'success', message: `${ids.length} order(s) deleted successfully` });
            setSelectedOrderIds(prev => prev.filter(id => !ids.includes(id)));
            fetchOrders();
            setSelectedOrder(null);
        } catch (err) {
            console.error('Delete Error:', err);
            setNotification({ type: 'error', message: `Failed to delete order(s): ${err.message || 'Database error'}` });
        } finally {
            setLoading(false);
        }
    };


    const fetchOrderCounts = async () => {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('status')
                .neq('status', 'DRAFT');
            if (error) throw error;
            if (data) {
                const counts = {
                    ALL: data.length,
                    PLACED: data.filter(o => o.status === 'PLACED').length,
                    'AWAITING_PAYMENT': data.filter(o => o.status === 'AWAITING_PAYMENT' || o.status === 'PENDING' || o.status === 'PENDING_VERIFICATION').length,
                    PAID: data.filter(o => o.status === 'PAID').length,
                    PACKING: data.filter(o => o.status === 'PACKING').length,
                    SHIPPED: data.filter(o => o.status === 'SHIPPED').length,
                    DELIVERED: data.filter(o => o.status === 'DELIVERED').length,
                    CANCELLED: data.filter(o => o.status === 'CANCELLED').length,
                    REFUNDED: data.filter(o => o.status === 'REFUNDED').length,
                };
                setStatusCounts(counts);
            }
        } catch (err) {
            console.warn('Counts fetch warning:', err?.message || err?.details || err);
        }
    };

    const fetchAnalytics = async () => {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('id, created_at, status, total_amount, source, courier_name')
                .neq('status', 'DRAFT');
            if (error) throw error;
            const allOrders = data || [];

            const now = new Date();
            let filteredOrders = allOrders;

            // 1. Time Filtering Logic
            if (timeRange === 'DAILY') {
                filteredOrders = allOrders.filter(o => new Date(o.created_at).toDateString() === now.toDateString());
            } else if (timeRange === 'MONTHLY') {
                filteredOrders = allOrders.filter(o => {
                    const d = new Date(o.created_at);
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                });
            } else if (timeRange === 'QUARTERLY') {
                const currentQuarter = Math.floor(now.getMonth() / 3);
                filteredOrders = allOrders.filter(o => {
                    const d = new Date(o.created_at);
                    return Math.floor(d.getMonth() / 3) === currentQuarter && d.getFullYear() === now.getFullYear();
                });
            }

            // 2. Revenue Trend (Last 7 intervals)
            const trendMap = {};
            if (timeRange === 'DAILY') {
                for (let i = 0; i < 24; i++) trendMap[`${i}:00`] = 0;
                filteredOrders.forEach(o => {
                    if (o.status !== 'CANCELLED') trendMap[`${new Date(o.created_at).getHours()}:00`] += (o.total_amount || 0);
                });
            } else {
                const daysToFetch = timeRange === 'MONTHLY' ? 30 : timeRange === 'QUARTERLY' ? 90 : 365;
                for (let i = daysToFetch; i >= 0; i--) {
                    const d = new Date(now);
                    d.setDate(now.getDate() - i);
                    trendMap[d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })] = 0;
                }
                allOrders.forEach(o => {
                    if (o.status === 'CANCELLED') return;
                    const ds = new Date(o.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                    if (trendMap[ds] !== undefined) trendMap[ds] += (o.total_amount || 0);
                });
            }
            const revenueTrend = Object.entries(trendMap).map(([date, amount]) => ({ date, amount }));

            // 3. Channel Data
            const channels = { WEBSITE: 0, WHATSAPP: 0, MANUAL: 0 };
            filteredOrders.forEach(o => {
                const src = o.source || (o.id?.startsWith('WEB-') ? 'WEBSITE' : o.id?.startsWith('MAN-') ? 'MANUAL' : 'WHATSAPP');
                channels[src] = (channels[src] || 0) + 1;
            });
            const channelData = [
                { name: 'Website', value: channels.WEBSITE || 0, color: 'hsl(195 85% 40%)' },
                { name: 'WhatsApp', value: channels.WHATSAPP || 0, color: 'hsl(142 71% 45%)' },
                { name: 'Manual', value: (channels.MANUAL || 0) + (channels.ADMIN_MANUAL || 0), color: 'hsl(38 92% 50%)' }
            ];

            // 4. Status Data
            const stats = {};
            filteredOrders.forEach(o => { stats[o.status] = (stats[o.status] || 0) + 1; });
            const statusData = Object.entries(stats).map(([name, value]) => ({ name, value }));

            // 5. Courier Analysis
            const couriers = {};
            filteredOrders.forEach(o => {
                if (o.courier_name) couriers[o.courier_name] = (couriers[o.courier_name] || 0) + 1;
            });
            const courierData = Object.entries(couriers).map(([name, value]) => ({ name, value }));

            // 6. Top Products
            const orderIds = filteredOrders.map(o => o.id);
            const { data: items } = await supabase.from('order_items').select('product_name, quantity').in('order_id', orderIds);
            const prodMap = {};
            items?.forEach(i => { prodMap[i.product_name] = (prodMap[i.product_name] || 0) + i.quantity; });
            const topProducts = Object.entries(prodMap).map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value).slice(0, 5);

            setAnalyticsData({ revenueTrend, channelData, statusData, courierData, topProducts });
        } catch (err) {
            console.error('Orders Analytics Error:', err);
        }
    };

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const from = (ordersPage - 1) * ORDERS_PER_PAGE;
            const to = ordersPage * ORDERS_PER_PAGE - 1;

            let query = supabase
                .from('orders')
                .select('*', { count: 'exact' })
                .neq('status', 'DRAFT');

            // 1. Status Filter
            if (statusFilter !== 'ALL') {
                if (statusFilter === 'AWAITING_PAYMENT') {
                    query = query.or('status.eq.AWAITING_PAYMENT,status.eq.PENDING');
                } else {
                    query = query.eq('status', statusFilter);
                }
            }

            // 2. Source Filter
            if (sourceFilter !== 'ALL') {
                if (sourceFilter === 'WEBSITE') {
                    query = query.or('source.eq.WEBSITE,source.eq.WEB,id.ilike.WEB-%');
                } else if (sourceFilter === 'MANUAL') {
                    query = query.or('source.eq.MANUAL,source.eq.MAN,id.ilike.MAN-%');
                } else if (sourceFilter === 'WHATSAPP') {
                    query = query.or('source.eq.WHATSAPP,source.eq.WA,source.is.null,id.ilike.ORD-%');
                }
            }

            // 3. Search Term
            if (debouncedSearchTerm.trim()) {
                const searchOrCond = buildOrderSearchOrCondition(debouncedSearchTerm);
                if (searchOrCond) {
                    query = query.or(searchOrCond);
                }
            }

            const { data, count, error } = await query
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;

            setOrders(data || []);
            setTotalCount(count || 0);

            // Fetch total status counts dynamically
            fetchOrderCounts();
        } catch (error) {
            console.warn('Error fetching orders:', error?.message || error?.details || error);
        } finally {
            setLoading(false);
        }
    };

    const fetchShippingConfig = async () => {
        try {
            const [zonesRes, mappingsRes] = await Promise.all([
                supabase.from('shipping_zones').select('*'),
                supabase.from('shipping_zone_states').select('*')
            ]);
            setShippingZones(zonesRes.data || []);
            setShippingMappings(mappingsRes.data || []);
        } catch (err) {
            console.error('Failed to fetch shipping config:', err);
        }
    };

    useEffect(() => {
        setHasMounted(true);
        fetchShippingConfig();
        const channel = supabase
            .channel('orders_page')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
            .subscribe();

        const handleReset = () => {
            setSelectedOrder(null);
            setIsAddingOrder(false);
            setShowShippingModal(false);
            setShowShippingForm(false);
            setIsEditingItems(false);
        };
        window.addEventListener('resetAdminView', handleReset);
        return () => {
            supabase.removeChannel(channel);
            window.removeEventListener('resetAdminView', handleReset);
        };
    }, []);

    // Automatically open specific order if 'id' or 'orderId' is passed in URL query params
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const queryId = params.get('id') || params.get('orderId');
            if (queryId) {
                const numericId = parseInt(queryId, 10);
                if (!isNaN(numericId)) {
                    setSearchTerm(String(numericId));
                    supabase
                        .from('orders')
                        .select('*, customers(name, email, phone)')
                        .eq('id', numericId)
                        .single()
                        .then(({ data, error }) => {
                            if (data && !error) {
                                openOrderDetail(data);
                            }
                        })
                        .catch(err => console.error('[OrdersPage] Error opening order from URL param:', err));
                }
            }
        }
    }, []);

    // Reset to page 1 when filters change
    useEffect(() => { setOrdersPage(1); }, [debouncedSearchTerm, statusFilter, sourceFilter]);

    useEffect(() => {
        fetchOrders();
    }, [ordersPage, debouncedSearchTerm, statusFilter, sourceFilter]);

    // Re-run analytics when time range changes
    useEffect(() => {
        fetchAnalytics();
    }, [timeRange]);


    const fetchAllProducts = async () => {
        const { data } = await supabase.from('products').select('*').order('name');
        setAllProducts(data || []);
    };

    const fetchCouriers = async () => {
        try {
            const { data } = await supabase.from('couriers').select('*').eq('is_active', true).order('name');
            setCouriers(data || []);
        } catch (err) {
            console.error('Fetch couriers error:', err);
        }
    };

    useEffect(() => {
        fetchAllProducts();
        fetchCouriers();
    }, []);

    const openOrderDetail = async (order) => {
        setLoading(true);
        setSelectedOrder(order);
        prepareOrderForEditing(order);
        try {
            const [{ data: rawItems }, { data: logs }] = await Promise.all([
                supabase.from('order_items').select('*').eq('order_id', order.id),
                supabase.from('order_status_logs').select('*').eq('order_id', order.id).order('created_at', { ascending: true })
            ]);

            const enriched = await enrichOrderItems(rawItems);
            setOrderItems(enriched);
            setOrderActivityLogs(logs || []);
        } catch (err) {
            console.error('openOrderDetail error:', err);
        } finally {
            setLoading(false);
        }
    };

    const openCourierModal = (order, fromTable = false) => {
        if (!order || ['CANCELLED', 'REFUNDED', 'REFUND_REQUESTED'].includes((order.status || '').toUpperCase())) {
            return;
        }
        setSelectedOrder(order);
        setIsCourierFromTable(fromTable);
        setIsCourierSaved(false);
        setCourierModalError('');
        setShippingForm({
            courier_name: order.courier_name || '',
            tracking_number: order.tracking_number || '',
            tracking_url: order.tracking_url || ''
        });
        const matched = couriers.find(c => c.name === order.courier_name);
        setSelectedCourierId(matched ? matched.id : (order.courier_name ? 'CUSTOM' : ''));
        setShowShippingForm(true);
    };

    if (!hasMounted) {
        return (
            <div className="animate-enter" style={{ padding: '3rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 1.5rem' }} />
                <p>Initializing orders portal...</p>
            </div>
        );
    }

    const sendWhatsAppNotification = (order, newStatus, shippingData = {}) => {
        if (!order || !order.customer_phone) return;

        const phone = order.customer_phone.replace(/\D/g, '');
        // NOOP — We now rely on the automated bot notification from the backend.
        // This avoids browser 'popup blocked' issues during async status updates.
    };

    const updateOrderStatus = async (orderId, newStatus, shippingData = {}, targetPhone = null) => {
        try {
            const token = localStorage.getItem('cast_prince_admin') || '';
            const res = await fetch('/api/orders/update-status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ orderId, status: newStatus, targetPhone, ...shippingData })
            });

            const data = await res.json();
            if (res.ok) {
                // Map camelCase from shippingData back to snake_case for the UI state
                const mappedShipping = {};
                if (shippingData.courierName) mappedShipping.courier_name = shippingData.courierName;
                if (shippingData.trackingNumber) mappedShipping.tracking_number = shippingData.trackingNumber;
                if (shippingData.trackingUrl) mappedShipping.tracking_url = shippingData.trackingUrl;

                setSelectedOrder(prev => prev ? {
                    ...prev,
                    status: newStatus,
                    ...mappedShipping
                } : null);

                // Add to activity log in database
                const logEntry = {
                    order_id: orderId,
                    status: newStatus,
                    notes: shippingData.courierName ? `Shipped via ${shippingData.courierName}` : `Status updated to ${newStatus}`,
                    created_at: new Date().toISOString()
                };

                // Insert to database
                await supabase.from('order_status_logs').insert(logEntry);

                // Update local state
                const newLog = {
                    id: `log-${Date.now()}`,
                    ...logEntry
                };
                setOrderActivityLogs(prev => [...prev, newLog]);

                fetchOrders();
                setNotification({
                    message: `Order updated to ${newStatus}`,
                    type: 'success'
                });

            } else {
                setNotification({ message: `Failed: ${data.error}`, type: 'error' });
            }
        } catch (error) {
            setNotification({ message: 'Error updating status', type: 'error' });
        }
        setTimeout(() => setNotification(null), 4000);
    };

    const handleSendNotifications = async (order) => {
        setLoading(true);
        setNotification({ message: 'Sending WhatsApp & Email...', type: 'info' });
        try {
            const response = await fetch('/api/admin/send-order-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: order.id,
                    customerName: order.customer_name,
                    customerPhone: order.customer_phone,
                    customerEmail: order.customer_email,
                    courierName: order.courier_name,
                    trackingNumber: order.tracking_number,
                    trackingUrl: order.tracking_url,
                    sendWhatsApp: true,
                    sendEmail: true,
                    statusOverride: order.status
                })
            });

            if (!response.ok) throw new Error('Failed to send');
            setNotification({ message: 'Notifications sent successfully!', type: 'success' });
            setTimeout(() => setNotification(null), 3000);
        } catch (err) {
            setNotification({ message: 'Failed to send notifications.', type: 'error' });
            setTimeout(() => setNotification(null), 3000);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateItem = (index, field, value) => {
        const newItems = [...orderItems];
        newItems[index][field] = value;
        setOrderItems(newItems);
    };

    const handleRemoveItem = (index) => {
        const newItems = orderItems.filter((_, i) => i !== index);
        setOrderItems(newItems);
    };


    const handleDeleteOrder = (orderId) => {
        setConfirmDelete({ ids: [orderId] });
    };

    const handleReturnItem = async () => {
        if (!returningItem || returnQty < 1) return;

        const alreadyReturned = returningItem.returned_quantity || 0;
        const maxReturnable = returningItem.quantity - alreadyReturned;

        if (returnQty > maxReturnable) {
            setNotification({ message: `Cannot return more than ${maxReturnable} items.`, type: 'error' });
            return;
        }

        setLoading(true);
        try {
            // Update item returned quantity - Match based on order_id and product/variant
            const matchCriteria = { order_id: selectedOrder.id, product_id: returningItem.product_id };
            if (returningItem.variant_id) matchCriteria.variant_id = returningItem.variant_id;

            const { error: itemError } = await supabase
                .from('order_items')
                .update({ returned_quantity: alreadyReturned + returnQty })
                .match(matchCriteria);

            if (itemError) throw itemError;

            // Restore stock
            if (returningItem.variant_id) {
                const { data: variant } = await supabase
                    .from('product_variants')
                    .select('stock')
                    .eq('id', returningItem.variant_id)
                    .single();
                if (variant) {
                    await supabase
                        .from('product_variants')
                        .update({ stock: variant.stock + returnQty })
                        .eq('id', returningItem.variant_id);
                }
            } else {
                const { data: product } = await supabase
                    .from('products')
                    .select('stock')
                    .eq('id', returningItem.product_id)
                    .single();
                if (product) {
                    await supabase
                        .from('products')
                        .update({ stock: product.stock + returnQty })
                        .eq('id', returningItem.product_id);
                }
            }

            // Sync product history
            await supabase.from('product_history').insert({
                product_id: returningItem.product_id,
                change_type: 'STOCK_IN',
                quantity_change: returnQty,
                reason: `Item Returned from Order #${selectedOrder.id}`
            });

            // Activity Log
            await supabase.from('order_status_logs').insert({
                order_id: selectedOrder.id,
                status: 'PARTIAL_RETURN',
                notes: `Returned ${returnQty}x ${returningItem.product_name}`,
                created_at: new Date().toISOString()
            });

            // Refund Record
            await supabase.from('refunds').insert({
                order_id: selectedOrder.id,
                amount: (returningItem.price_at_time || 0) * returnQty,
                reason: `Product Return: ${returningItem.product_name} (x${returnQty})`,
                status: 'REQUESTED'
            });

            setNotification({ message: 'Item return processed successfully.', type: 'success' });
            setReturningItem(null);
            setReturnQty(1);

            // Refresh
            openOrderDetail(selectedOrder);
            fetchOrders();

        } catch (err) {
            console.error('Return Error:', err);
            setNotification({ message: 'Failed to process return', type: 'error' });
        } finally {
            setLoading(false);
            setTimeout(() => setNotification(null), 3000);
        }
    };

    const handleCancelOrder = async () => {
        if (!selectedOrder || !cancelReason.trim()) return;

        setLoading(true);
        try {
            // Restore stock
            const { data: items } = await supabase
                .from('order_items')
                .select('*')
                .eq('order_id', selectedOrder.id);

            if (items) {
                for (const item of items) {
                    if (item.variant_id) {
                        const { data: variant } = await supabase
                            .from('product_variants')
                            .select('stock')
                            .eq('id', item.variant_id)
                            .single();
                        if (variant) {
                            await supabase
                                .from('product_variants')
                                .update({ stock: variant.stock + item.quantity })
                                .eq('id', item.variant_id);
                        }
                    } else {
                        const { data: product } = await supabase
                            .from('products')
                            .select('stock')
                            .eq('id', item.product_id)
                            .single();
                        if (product) {
                            await supabase
                                .from('products')
                                .update({ stock: product.stock + item.quantity })
                                .eq('id', item.product_id);
                        }
                    }
                }
            }

            // Update order status with cancel reason
            await supabase
                .from('orders')
                .update({
                    status: 'CANCELLED',
                    admin_notes: `Order cancelled by admin on ${new Date().toLocaleString()}. Reason: ${cancelReason}`
                })
                .eq('id', selectedOrder.id);

            // Add to activity log
            await supabase.from('order_status_logs').insert({
                order_id: selectedOrder.id,
                status: 'CANCELLED',
                notes: `Order cancelled. Reason: ${cancelReason}`,
                created_at: new Date().toISOString()
            });

            // Always create a refund entry for cancellations so admin can review
            const { error: refundError } = await supabase.from('refunds').insert({
                order_id: selectedOrder.id,
                amount: selectedOrder.total_amount || 0,
                reason: `Order Cancelled: ${cancelReason}`,
                status: 'REQUESTED'
            });

            if (refundError) {
                console.error('Refund tracking error:', refundError);
                setNotification({ message: `Order cancelled, but refund track failed: ${refundError.message}`, type: 'warning' });
            } else {
                setNotification({ message: 'Order cancelled and successfully sent to Refunds', type: 'success' });
            }

            setShowCancelModal(false);
            setCancelReason('');
            fetchOrders();

            // Refresh selected order
            const { data: updatedOrder } = await supabase.from('orders').select('*').eq('id', selectedOrder.id).single();
            setSelectedOrder(updatedOrder);

        } catch (err) {
            console.error('Cancel Error:', err);
            setNotification({ message: 'Failed to cancel order', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleResendEmail = async (targetEmail = null) => {
        if (!selectedOrder) return;

        // If targetEmail is not provided and billing/shipping emails are different, show selection
        if (!targetEmail) {
            const bEmail = selectedOrder.billing_email || (typeof selectedOrder.billing_address === 'object' ? selectedOrder.billing_address?.email : null) || selectedOrder.customer_email;
            const sEmail = selectedOrder.shipping_email || (typeof selectedOrder.shipping_address === 'object' ? selectedOrder.shipping_address?.email : null);

            if (bEmail && sEmail && bEmail !== sEmail) {
                setNotificationSelection({ type: 'email', billing: bEmail, shipping: sEmail, orderId: selectedOrder.id });
                setShowResendEmailModal(false);
                return;
            }
            targetEmail = bEmail || sEmail;
        }

        if (!targetEmail) {
            setNotification({ message: 'No email address found for this order.', type: 'error' });
            return;
        }

        setLoading(true);
        setShowResendEmailModal(false);
        setNotificationSelection(null);
        try {
            const res = await fetch('/api/admin/send-order-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: selectedOrder.id, sendEmail: true, targetEmail: targetEmail })
            });

            if (res.ok) {
                setNotification({ message: `Order confirmation email resent to ${targetEmail}`, type: 'success' });
            } else {
                const data = await res.json();
                setNotification({ message: `Failed: ${data.message || data.error}`, type: 'error' });
            }
        } catch (err) {
            console.error('Resend Email Error:', err);
            setNotification({ message: 'Failed to resend email', type: 'error' });
        } finally {
            setLoading(false);
            setTimeout(() => setNotification(null), 3000);
        }
    };

    const handleResendWhatsApp = async (targetPhone = null) => {
        if (!selectedOrder) return;

        if (!targetPhone) {
            const bPhone = selectedOrder.billing_phone || (typeof selectedOrder.billing_address === 'object' ? selectedOrder.billing_address?.phone : null) || selectedOrder.customer_phone;
            const sPhone = selectedOrder.shipping_phone || (typeof selectedOrder.shipping_address === 'object' ? selectedOrder.shipping_address?.phone : null);

            if (bPhone && sPhone && bPhone !== sPhone) {
                setNotificationSelection({ type: 'whatsapp', billing: bPhone, shipping: sPhone, orderId: selectedOrder.id });
                setShowResendWhatsAppModal(false);
                return;
            }
            targetPhone = bPhone || sPhone;
        }

        if (!targetPhone) {
            setNotification({ message: 'No phone number found for this order.', type: 'error' });
            return;
        }

        setLoading(true);
        setShowResendWhatsAppModal(false);
        setNotificationSelection(null);
        try {
            const res = await fetch('/api/admin/send-order-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: selectedOrder.id, sendWhatsApp: true, targetPhone: targetPhone })
            });

            if (res.ok) {
                setNotification({ message: `WhatsApp notification resent to ${targetPhone}`, type: 'success' });
            } else {
                const data = await res.json();
                setNotification({ message: `Failed: ${data.message || data.error}`, type: 'error' });
            }
        } catch (err) {
            console.error('Resend WhatsApp Error:', err);
            setNotification({ message: 'Failed to resend WhatsApp', type: 'error' });
        } finally {
            setLoading(false);
            setTimeout(() => setNotification(null), 3000);
        }
    };

    const handleSendManualNotifications = async () => {
        if (!selectedOrder) return;
        setLoading(true);
        try {
            const finalPhone = notificationPhone.trim();
            const finalEmail = notificationEmail.trim();

            if (sendWhatsAppChecked && !finalPhone) {
                setNotification({ message: 'No phone number selected for WhatsApp.', type: 'error' });
                setLoading(false);
                return;
            }
            if (sendEmailChecked && !finalEmail) {
                setNotification({ message: 'No email address selected for Email.', type: 'error' });
                setLoading(false);
                return;
            }

            const res = await fetch('/api/admin/send-order-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: selectedOrder.id,
                    sendWhatsApp: sendWhatsAppChecked,
                    sendEmail: sendEmailChecked,
                    targetPhone: sendWhatsAppChecked ? finalPhone : undefined,
                    targetEmail: sendEmailChecked ? finalEmail : undefined
                })
            });

            if (res.ok) {
                const sentList = [];
                if (sendWhatsAppChecked) sentList.push('WhatsApp');
                if (sendEmailChecked) sentList.push('Email');
                
                let toastMsg = 'Notifications sent successfully';
                if (sentList.length === 2) {
                    toastMsg = 'Notification sent to WhatsApp and Email';
                } else if (sentList.length === 1) {
                    toastMsg = `Notification sent to ${sentList[0]}`;
                }
                
                setNotification({ message: toastMsg, type: 'success' });
                setShowSendNotificationModal(false);
            } else {
                const data = await res.json();
                setNotification({ message: `Failed: ${data.message || data.error}`, type: 'error' });
            }
        } catch (err) {
            console.error('Send Notifications Error:', err);
            setNotification({ message: 'Failed to send notifications', type: 'error' });
        } finally {
            setLoading(false);
            setTimeout(() => setNotification(null), 3000);
        }
    };



    const saveOrderEdits = async () => {
        try {
            setLoading(true);
            const subtotal = orderItems.reduce((sum, item) => sum + (item.quantity * item.price_at_time), 0);

            // Construct structured shipping and billing address objects
            const shipObj = {
                name: selectedOrder.shipping_name || selectedOrder.customer_name || '',
                phone: selectedOrder.shipping_phone || selectedOrder.customer_phone || '',
                address: selectedOrder.shipping_address_line || '',
                city: selectedOrder.shipping_city || '',
                pincode: selectedOrder.shipping_pincode || '',
                state: selectedOrder.shipping_state || 'Tamil Nadu'
            };

            const billObj = {
                name: selectedOrder.billing_name || selectedOrder.customer_name || '',
                phone: selectedOrder.billing_phone || selectedOrder.customer_phone || '',
                address: selectedOrder.billing_address_line || '',
                city: selectedOrder.billing_city || '',
                pincode: selectedOrder.billing_pincode || '',
                state: selectedOrder.billing_state || selectedOrder.shipping_state || 'Tamil Nadu'
            };

            const formattedShipStr = [shipObj.name, shipObj.phone, shipObj.address, shipObj.city, shipObj.state, shipObj.pincode].filter(Boolean).join(', ');
            const formattedBillStr = [billObj.name, billObj.phone, billObj.address, billObj.city, billObj.state, billObj.pincode].filter(Boolean).join(', ');

            // Calculate taxes based on selectedOrder's state
            const state = selectedOrder.shipping_state || 'Tamil Nadu';
            const gstRate = 0.05; // 5%
            const tax = subtotal * gstRate;
            const shipping = selectedOrder.shipping_cost || 100;
            const total = subtotal + tax + shipping;

            let taxDetails = {};
            if (state === 'Tamil Nadu') {
                taxDetails = { cgst: tax / 2, sgst: tax / 2, igst: 0 };
            } else {
                taxDetails = { cgst: 0, sgst: 0, igst: tax };
            }

            // 1. Update Order record (items + customer info)
            const { error: orderError } = await supabase.from('orders').update({
                customer_name: shipObj.name || selectedOrder.customer_name,
                customer_phone: shipObj.phone || selectedOrder.customer_phone,
                customer_email: selectedOrder.customer_email,
                billing_email: selectedOrder.customer_email,
                shipping_email: selectedOrder.customer_email,
                delivery_address: formattedShipStr || formattedBillStr,
                billing_address: billObj,
                shipping_address: shipObj,
                shipping_state: shipObj.state,
                subtotal,
                tax_amount: tax,
                total_amount: total,
                ...taxDetails
            }).eq('id', selectedOrder.id);

            if (orderError) throw orderError;

            // 2. Refresh Items (simplest: delete all and re-insert)
            await supabase.from('order_items').delete().eq('order_id', selectedOrder.id);
            const { error: itemsError } = await supabase.from('order_items').insert(
                orderItems.map(item => ({
                    order_id: selectedOrder.id,
                    product_id: item.product_id,
                    product_name: item.product_name,
                    quantity: item.quantity,
                    price_at_time: item.price_at_time,
                    variant_id: item.variant_id,
                    variant_name: item.variant_name
                }))
            );

            if (itemsError) throw itemsError;

            setNotification({ message: 'Order items updated and totals recalculated', type: 'success' });
            setIsEditingItems(false);
            fetchOrders();
            // Refresh local selectedOrder
            const { data: updatedOrder } = await supabase.from('orders').select('*').eq('id', selectedOrder.id).single();
            setSelectedOrder(updatedOrder);

        } catch (error) {
            console.error(error);
            setNotification({ message: 'Failed to save edits', type: 'error' });
        } finally {
            setLoading(false);
            setTimeout(() => setNotification(null), 3000);
        }
    };



    const totalOrderPages = Math.ceil(totalCount / ORDERS_PER_PAGE);
    const orderCounts = statusCounts;



    return (
        <>
            <div className="animate-enter">

                {false ? (

                    <div style={{ padding: '6rem 2rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>

                        <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 1.5rem' }} />

                        <p>Loading orders collection...</p>

                    </div>

                ) : (

                    <>
                    <div className="no-print">
                        {/*  MAIN LIST VIEW  */}
                        {(!selectedOrder || isCourierFromTable) && !isAddingOrder && (
                            <div className="orders-list-section">
                                {/* Header */}
                                <div className="admin-header-row">
                                    <div>
                                        <h1 style={{ marginBottom: '0.5rem' }}>Orders</h1>
                                        <p>Manage and track all customer orders • {orders.length} total</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <button onClick={() => setIsAddingOrder(true)} className="btn btn-primary" style={{ background: 'hsl(var(--primary))', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                                            <Plus size={16} /> Add Manual Order
                                        </button>
                                        <button onClick={fetchOrders} className="btn btn-secondary">
                                            <RefreshCw size={16} /> Refresh
                                        </button>
                                    </div>
                                </div>

                                {/* Unified View Controls & Filters Row */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1.5rem', flexWrap: 'wrap', background: '#ffffff', padding: '1.25rem', borderRadius: '16px', border: '1px solid hsl(var(--border-subtle))' }}>
                                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                        {/* Status Filter */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'hsl(var(--text-muted))' }}>Status:</label>
                                            <select
                                                value={statusFilter}
                                                onChange={(e) => setStatusFilter(e.target.value)}
                                                style={{ padding: '0.6rem 2.2rem 0.6rem 1rem', borderRadius: '10px', border: '1px solid hsl(var(--border-subtle))', backgroundColor: 'hsl(var(--bg-app))', color: 'hsl(var(--text-main))', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', outline: 'none' }}
                                            >
                                                {Object.entries(orderCounts).map(([status, count]) => (
                                                    <option key={status} value={status}>
                                                        {status === 'ALL' ? 'All Orders' : status.replace(/_/g, ' ')} ({count})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div style={{ width: '1px', height: '24px', background: 'hsl(var(--border-subtle))' }} />

                                        {/* Channel / Source Filter */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'hsl(var(--text-muted))', letterSpacing: '0.05em' }}>Channel:</label>
                                            <select
                                                value={sourceFilter}
                                                onChange={(e) => setSourceFilter(e.target.value)}
                                                style={{ padding: '0.6rem 2.2rem 0.6rem 1rem', borderRadius: '10px', border: '1px solid hsl(var(--border-subtle))', backgroundColor: 'hsl(var(--bg-app))', color: 'hsl(var(--text-main))', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', outline: 'none' }}
                                            >
                                                {SOURCE_FILTERS.map(src => (
                                                    <option key={src} value={src}>
                                                        {src === 'ALL' ? 'All' : src === 'WEBSITE' ? 'Website (Web)' : src === 'MANUAL' ? 'Manual' : 'WhatsApp'}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                     {/* Link to Dedicated Orders Analysis Page */}
                                     <Link
                                         href="/admin/orders/analysis"
                                         className="btn btn-secondary"
                                         style={{
                                             padding: '0.6rem 1.25rem', borderRadius: '10px',
                                             fontSize: '0.85rem', fontWeight: 700,
                                             display: 'flex', alignItems: 'center', gap: '8px',
                                             textDecoration: 'none'
                                         }}
                                     >
                                         <TrendingUp size={16} color="hsl(var(--primary))" /> Order Analysis
                                     </Link>
                                 </div>
                                </div>

                                 {/* Search + Table Card */}

                                        <div className="card" style={{ padding: 0 }}>

                                            {/* Search Bar */}

                                            <div className="admin-search-container">

                                                <div className="admin-search-input-wrapper" style={{ position: 'relative' }}>

                                                    <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />

                                                    <input

                                                        type="text"

                                                        placeholder="Search by Order ID, Name or Phone..."

                                                        value={searchTerm}

                                                        onChange={(e) => { setSearchTerm(e.target.value); }}

                                                        style={{

                                                            width: '100%', padding: searchTerm ? '0.75rem 2.5rem 0.75rem 2.75rem' : '0.75rem 1rem 0.75rem 2.75rem',

                                                            background: '#f1f5f9',

                                                            border: '1px solid hsl(var(--border-subtle))',

                                                            borderRadius: 'var(--radius-sm)',

                                                            fontSize: '0.9rem', outline: 'none', transition: 'border 0.2s',

                                                            color: 'hsl(var(--text-main))', fontFamily: 'inherit'

                                                        }}

                                                    />

                                                    {searchTerm && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setSearchTerm('')}
                                                            style={{
                                                                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                                                background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px'
                                                            }}
                                                            title="Clear search"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    )}

                                                </div>

                                            </div>



                                            {/* Table */}

                                            {loading ? (

                                                <div style={{ padding: '4rem', textAlign: 'center', color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>

                                                    <Loader2 size={24} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> Loading...

                                                </div>

                                            ) : (
                                                <div style={{ overflowX: 'auto', width: '100%' }}>
                                                    <table style={{ margin: 0, width: '100%' }}>

                                                        <thead>
                                                            <tr>

                                                                <th>Invoice No</th>
                                                                <th style={{ width: '40px', textAlign: 'center' }}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={orders.length > 0 && selectedOrderIds.length === orders.length}
                                                                        onChange={toggleSelectAll}
                                                                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                                                    />
                                                                </th>
                                                                <th>Customer</th>
                                                                
                                                                <th style={{ textAlign: 'center' }}>Source</th>
                                                                <th style={{ textAlign: 'right' }}>Amount</th>

                                                                <th style={{ textAlign: 'center' }}>Payment</th>

                                                                <th style={{ textAlign: 'center' }}>Status</th>

                                                                <th style={{ textAlign: 'center' }}>Logistics</th>

                                                                <th style={{ textAlign: 'right', minWidth: '150px' }}>Actions</th>

                                                            </tr>

                                                        </thead>

                                                        <tbody>

                                                            {orders.length === 0 ? (
                                                                <tr><td colSpan={9} style={{ padding: '4rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>No orders found matching your criteria.</td></tr>
                                                            ) : (
                                                                orders.map(order => {
                                                                    const src = order.source || (order.id?.startsWith('WEB-') ? 'WEBSITE' : order.id?.startsWith('MAN-') ? 'MANUAL' : 'WHATSAPP');
                                                                    const isExpanded = selectedOrder?.id === order.id;

                                                                    return (
                                                                        <React.Fragment key={order.id}>
                                                                            <tr
                                                                                onClick={() => openOrderDetail(order)}
                                                                                style={{
                                                                                    cursor: 'pointer',
                                                                                    background: selectedOrder?.id === order.id ? 'hsl(var(--primary) / 0.05)' :
                                                                                        selectedOrderIds.includes(order.id) ? 'hsl(var(--primary) / 0.02)' : 'transparent',
                                                                                    transition: 'background 0.2s'
                                                                                }}
                                                                            >
                                                                                <td style={{ fontWeight: 600, color: selectedOrder?.id === order.id ? 'hsl(var(--primary))' : 'inherit' }}>{formatOrderInvoice(order)}</td>
                                                                                <td style={{ textAlign: 'center' }} onClick={(e) => { e.stopPropagation(); toggleSelectItem(order.id); }}>
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={selectedOrderIds.includes(order.id)}
                                                                                        onChange={() => { }}
                                                                                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                                                                    />
                                                                                </td>
                                                                                <td>
                                                                                    <div style={{ fontWeight: 500, color: 'hsl(var(--text-main))' }}>{order.customer_name || 'Guest'}</div>
                                                                                    <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>{formatDisplayPhoneNumber(order.customer_phone)}</div>
                                                                                </td>

                                                                                <td style={{ textAlign: 'center' }}>
                                                                                    <span style={{
                                                                                        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                                                                                        padding: '0.2rem 0.65rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700,
                                                                                        background: src === 'WEBSITE' ? 'hsl(195 85% 40% / 0.15)' : src === 'MANUAL' ? 'hsl(38 92% 50% / 0.15)' : 'rgba(37,211,102,0.12)',
                                                                                        color: src === 'WEBSITE' ? 'hsl(195 85% 55%)' : src === 'MANUAL' ? 'hsl(38 92% 50%)' : 'hsl(var(--primary))',
                                                                                        border: src === 'WEBSITE' ? '1px solid hsl(195 85% 40% / 0.3)' : src === 'MANUAL' ? '1px solid hsl(38 92% 50% / 0.3)' : '1px solid rgba(37,211,102,0.3)'
                                                                                    }}>
                                                                                        {src === 'WEBSITE' ? 'Web' : src === 'MANUAL' ? 'Manual' : 'WhatsApp'}
                                                                                    </span>
                                                                                </td>
                                                                                <td style={{ textAlign: 'right', fontWeight: 600, color: 'hsl(var(--text-main))' }}>₹{(order.total_amount || 0).toLocaleString()}</td>
                                                                                <td style={{ textAlign: 'center', fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>{order.payment_method || '—'}</td>
                                                                                <td style={{ textAlign: 'center' }}>
                                                                                    <span className={`badge ${getStatusReference(order.status)}`}>{order.status}</span>
                                                                                </td>
                                                                                <td style={{ textAlign: 'center' }}>
                                                                                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', flexWrap: 'nowrap', alignItems: 'center' }}>
                                                                                        {(() => {
                                                                                            const statusUpper = (order.status || '').toUpperCase();
                                                                                            if (['CANCELLED', 'REFUNDED', 'REFUND_REQUESTED'].includes(statusUpper)) {
                                                                                                return <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>—</span>;
                                                                                            }
                                                                                            const courierInfo = parseCourierDetails(order);
                                                                                            if (courierInfo.name || courierInfo.trackingNumber) {
                                                                                                return (
                                                                                                    <button
                                                                                                        onClick={(e) => {
                                                                                                            e.stopPropagation();
                                                                                                            openCourierModal(order, true);
                                                                                                        }}
                                                                                                        className="btn btn-secondary"
                                                                                                        style={{
                                                                                                            padding: '0.35rem 0.65rem',
                                                                                                            color: 'hsl(var(--primary))',
                                                                                                            background: 'hsl(var(--primary) / 0.08)',
                                                                                                            borderColor: 'hsl(var(--primary) / 0.25)',
                                                                                                            fontSize: '0.75rem',
                                                                                                            fontWeight: 700,
                                                                                                            display: 'inline-flex',
                                                                                                            alignItems: 'center',
                                                                                                            gap: '5px',
                                                                                                            borderRadius: '6px',
                                                                                                            whiteSpace: 'nowrap'
                                                                                                        }}
                                                                                                        title="Click to view/edit courier info"
                                                                                                    >
                                                                                                        <Truck size={14} color="hsl(var(--primary))" /> {courierInfo.name || 'Courier Info'}
                                                                                                    </button>
                                                                                                );
                                                                                            }
                                                                                            return (
                                                                                                <button
                                                                                                    onClick={(e) => {
                                                                                                        e.stopPropagation();
                                                                                                        openCourierModal(order, true);
                                                                                                    }}
                                                                                                    className="btn btn-secondary"
                                                                                                    style={{
                                                                                                        padding: '0.35rem 0.5rem',
                                                                                                        color: 'hsl(var(--success))',
                                                                                                        borderColor: 'hsl(var(--success) / 0.3)',
                                                                                                        fontSize: '0.72rem',
                                                                                                        fontWeight: 700,
                                                                                                        display: 'inline-flex',
                                                                                                        alignItems: 'center',
                                                                                                        gap: '4px',
                                                                                                        borderRadius: '6px',
                                                                                                        whiteSpace: 'nowrap'
                                                                                                    }}
                                                                                                >
                                                                                                    <Truck size={14} /> + Courier
                                                                                                </button>
                                                                                            );
                                                                                        })()}

                                                                                        {(() => {
                                                                                            const statusUpper = (order.status || '').toUpperCase();
                                                                                            if (['CANCELLED', 'REFUNDED', 'REFUND_REQUESTED'].includes(statusUpper)) {
                                                                                                return null;
                                                                                            }
                                                                                            const courierInfo = parseCourierDetails(order);
                                                                                            if ((courierInfo.name || courierInfo.trackingNumber) && order.status !== 'CANCELLED') {
                                                                                                return (
                                                                                                    <button
                                                                                                        onClick={(e) => {
                                                                                                            e.stopPropagation();
                                                                                                            setSelectedOrder(order);
                                                                                                            setIsCourierFromTable(true);
                                                                                                            const phoneToUse = order.customer_phone || (typeof order.billing_address === 'object' ? order.billing_address?.phone : null) || '';
                                                                                                            const bEmail = order.billing_email || (typeof order.billing_address === 'object' ? order.billing_address?.email : null) || order.customer_email || '';
                                                                                                            const sEmail = order.shipping_email || (typeof order.shipping_address === 'object' ? order.shipping_address?.email : null) || '';
                                                                                                            const emailToUse = bEmail || sEmail;
                                                                                                            
                                                                                                            setNotificationPhone(formatDisplayPhoneNumber(phoneToUse));
                                                                                                            setNotificationEmail(emailToUse);
                                                                                                            setSendWhatsAppChecked(true);
                                                                                                            setSendEmailChecked(true);
                                                                                                            setShowSendNotificationModal(true);
                                                                                                        }}
                                                                                                        className="btn btn-secondary"
                                                                                                        style={{
                                                                                                            padding: '0.35rem 0.5rem',
                                                                                                            color: 'hsl(var(--primary))',
                                                                                                            background: 'hsl(var(--primary) / 0.1)',
                                                                                                            fontSize: '0.72rem',
                                                                                                            fontWeight: 700,
                                                                                                            display: 'inline-flex',
                                                                                                            alignItems: 'center',
                                                                                                            gap: '4px',
                                                                                                            borderRadius: '6px',
                                                                                                            whiteSpace: 'nowrap'
                                                                                                        }}
                                                                                                        title="Send shipping notification to customer"
                                                                                                    >
                                                                                                        <Send size={14} /> Send Info
                                                                                                    </button>
                                                                                                );
                                                                                            }
                                                                                            return null;
                                                                                        })()}
                                                                                    </div>
                                                                                 </td>
                                                                                <td style={{ textAlign: 'right' }}>
                                                                                     <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                                                                                         <button onClick={async (e) => { 
                                                                                             e.stopPropagation(); 
                                                                                             setInfoModalOrder({ ...order, items: null });
                                                                                             const { data: rawItems } = await supabase.from('order_items').select('*').eq('order_id', order.id);
                                                                                             const enriched = await enrichOrderItems(rawItems);
                                                                                             setInfoModalOrder(prev => prev && prev.id === order.id ? { ...prev, items: enriched } : prev);
                                                                                         }} className="btn btn-secondary" style={{ padding: '0.35rem 0.5rem', color: '#0ea5e9', fontSize: '0.72rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                                                                                             <Info size={14} /> View Info
                                                                                         </button>
                                                                                         <button onClick={(e) => { e.stopPropagation(); handleBulkDelete([order.id]); }} className="btn btn-secondary" style={{ padding: '0.4rem', color: 'hsl(var(--danger))', borderColor: 'hsl(var(--danger) / 0.3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }} title="Delete Order">
                                                                                             <Trash2 size={14} />
                                                                                         </button>
                                                                                     </div>
                                                                                 </td>
                                                                            </tr>
                                                                        </React.Fragment>
                                                                    );
                                                                })
                                                            )}

                                                        </tbody>

                                                    </table>
                                                </div>
                                            )}

                                            {/*  Table Pagination  */}
                                            {totalOrderPages > 1 && (
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '1.5rem 1.25rem', borderTop: '1px solid hsl(var(--border-subtle))', flexWrap: 'wrap' }}>
                                                    <button onClick={() => setOrdersPage(p => Math.max(1, p - 1))} disabled={ordersPage === 1} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', opacity: ordersPage === 1 ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '10px' }}>
                                                        <ChevronLeft size={16} /> Previous
                                                    </button>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                                                        {(() => {
                                                            const pages = [];
                                                            const range = 1;
                                                            pages.push(1);
                                                            if (ordersPage > range + 2) pages.push('...');
                                                            for (let i = Math.max(2, ordersPage - range); i <= Math.min(totalOrderPages - 1, ordersPage + range); i++) { pages.push(i); }
                                                            if (ordersPage < totalOrderPages - range - 1) pages.push('...');
                                                            if (totalOrderPages > 1) pages.push(totalOrderPages);
                                                            return pages.map((page, i) => (
                                                                page === '...' ? (
                                                                    <span key={`dots-${i}`} style={{ color: 'hsl(var(--text-muted))', padding: '0 0.5rem', fontWeight: 600 }}>...</span>
                                                                ) : (
                                                                    <button key={page} onClick={() => setOrdersPage(page)} className="btn" style={{ minWidth: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0', fontSize: '0.9rem', fontWeight: 700, borderRadius: '10px', background: ordersPage === page ? 'hsl(var(--primary))' : '#ffffff', color: ordersPage === page ? 'white' : 'hsl(var(--text-main))', border: ordersPage === page ? 'none' : '1px solid hsl(var(--border-subtle))', cursor: 'pointer', transition: 'all 0.2s' }}>{page}</button>
                                                                )
                                                            ));
                                                        })()}
                                                    </div>
                                                    <button onClick={() => setOrdersPage(p => Math.min(totalOrderPages, p + 1))} disabled={ordersPage === totalOrderPages} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', opacity: ordersPage === totalOrderPages ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '10px' }}>
                                                        Next <ChevronRight size={16} />
                                                    </button>
                                                </div>
                                            )}

                                        </div>
                                    </div>
                                )}
                        {/*  ORDER DETAILS PAGE  */}
                        {selectedOrder && !isCourierFromTable && (
                            <div className="animate-enter" style={{ paddingBottom: '4rem' }}>
                                <div className="card shadow-premium" style={{
                                    width: '100%', maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', border: '1px solid hsl(var(--border-subtle))', borderRadius: '24px', background: '#ffffff', overflow: 'hidden'
                                }}>
                                    <div style={{ padding: '1.5rem 2rem', background: '#ffffff', borderBottom: '1px solid hsl(var(--border-subtle))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Order Details {formatOrderInvoice(selectedOrder)}</h2>
                                            <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '4px', flexWrap: 'wrap' }}>
                                                <span>Placed on {toIST(selectedOrder.created_at)}</span>
                                                {(() => {
                                                    const src = selectedOrder.source || (selectedOrder.id?.startsWith('WEB-') ? 'WEBSITE' : selectedOrder.id?.startsWith('MAN-') ? 'MANUAL' : 'WHATSAPP');
                                                    const badgeConfig = {
                                                        WEBSITE: { label: 'Website Order', bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' },
                                                        MANUAL: { label: 'Manual Order', bg: '#f3e8ff', border: '#e9d5ff', color: '#6b21a8' },
                                                        WHATSAPP: { label: 'WhatsApp Order', bg: '#ecfdf5', border: '#a7f3d0', color: '#047857' }
                                                    };
                                                    const config = badgeConfig[src] || badgeConfig.WHATSAPP;
                                                    return (
                                                        <span style={{
                                                            padding: '0.2rem 0.65rem',
                                                            borderRadius: '6px',
                                                            fontSize: '0.72rem',
                                                            fontWeight: 800,
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.04em',
                                                            background: config.bg,
                                                            border: `1px solid ${config.border}`,
                                                            color: config.color,
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}>
                                                            {config.label}
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                            <button onClick={() => { setSelectedOrder(null); setOrderItems([]); setIsEditingItems(false); }} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>← Back to Orders</button>
                                            {!isEditingItems ? (
                                                <button onClick={() => { prepareOrderForEditing(selectedOrder); setIsEditingItems(true); }} className="btn btn-primary" style={{ fontSize: '0.85rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
                                                    Edit Order
                                                </button>
                                            ) : (
                                                <>
                                                    <button onClick={() => { setIsEditingItems(false); openOrderDetail(selectedOrder); }} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>Cancel</button>
                                                    <button onClick={saveOrderEdits} disabled={loading} className="btn btn-primary" style={{ fontSize: '0.85rem', background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                                                        {loading ? <Loader2 size={14} className="animate-spin" /> : 'Save Changes'}
                                                    </button>
                                                </>
                                            )}
                                            <button onClick={async () => {
                                                const buf = await generateInvoicePDF({ ...selectedOrder, order_items: orderItems });
                                                const blob = new Blob([buf], { type: 'application/pdf' });
                                                const url = URL.createObjectURL(blob);
                                                window.open(url, '_blank');
                                            }} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
                                                <ExternalLink size={14} /> View Invoice
                                            </button>
                                            <button onClick={async () => {
                                                const buf = await generateInvoicePDF({ ...selectedOrder, order_items: orderItems });
                                                const blob = new Blob([buf], { type: 'application/pdf' });
                                                const url = URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url;
                                                a.download = `Invoice_${selectedOrder.id}.pdf`;
                                                a.click();
                                            }} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
                                                <Download size={14} /> Download
                                            </button>
                                        </div>
                                    </div>

                                    <div style={{ 
                                        flex: 1, 
                                        padding: '2rem', 
                                        display: 'grid', 
                                        gridTemplateColumns: isEditingItems ? '1fr' : '1fr 360px', 
                                        gridTemplateRows: isEditingItems ? 'auto auto auto' : 'auto 1fr',
                                        gap: '2rem',
                                        gridTemplateAreas: isEditingItems 
                                            ? '"info" "items" "others"' 
                                            : '"items info" "items others"'
                                    }}>

                                        {/* Left: Items */}
                                        <div style={{ gridArea: 'items' }}>
                                            <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'hsl(var(--text-muted))', marginBottom: '1.5rem' }}>Order Items</h3>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                {orderItems.filter(item => (item.returned_quantity || 0) < item.quantity).map((item, idx) => (
                                                    <div key={idx} style={{ display: 'flex', gap: '1.5rem', background: '#ffffff', padding: '1rem', borderRadius: '12px', border: `1px solid ${isEditingItems ? 'hsl(var(--primary) / 0.4)' : 'hsl(var(--border-subtle))'}` }}>
                                                        <div style={{ width: '100px', height: '130px', borderRadius: '8px', overflow: 'hidden', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', flexShrink: 0 }}>
                                                            <img 
                                                                src={getItemImageUrl(item) || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80'} 
                                                                alt={item.product_name || 'Product'} 
                                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                                                onError={(e) => {
                                                                    e.target.onerror = null;
                                                                    e.target.src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80';
                                                                }}
                                                            />
                                                        </div>
                                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                            <div style={{ fontWeight: 800, fontSize: '1rem', color: 'hsl(var(--text-main))' }}>{item.product_name}</div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                                <span style={{ fontSize: '0.82rem', color: 'hsl(var(--primary))', fontWeight: 600 }}>{item.variant_name || 'Standard Unit'}</span>
                                                                {(item.products?.sku || item.products?.product_no || item.product_id) && (
                                                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '2px 7px', borderRadius: '5px' }}>
                                                                        SKU: {item.products?.sku || item.products?.product_no || item.product_id}
                                                                    </span>
                                                                )}
                                                                {item.products?.category && (
                                                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))', padding: '2px 7px', borderRadius: '5px' }}>
                                                                        {item.products.category}
                                                                    </span>
                                                                )}
                                                                {item.products?.product_group && (
                                                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '2px 7px', borderRadius: '5px' }}>
                                                                        Group: {item.products.product_group}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {isEditingItems ? (
                                                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: 'auto', flexWrap: 'wrap' }}>
                                                                    <div>
                                                                        <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', marginBottom: '3px' }}>Qty</div>
                                                                        <input type="number" min="1" value={item.quantity}
                                                                            onChange={e => handleUpdateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                                                                            style={{ width: '70px', padding: '0.4rem 0.6rem', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', borderRadius: '6px', color: 'hsl(var(--text-main))', textAlign: 'center', fontSize: '0.9rem' }} />
                                                                    </div>
                                                                    <div>
                                                                        <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', marginBottom: '3px' }}>Price (₹)</div>
                                                                        <input type="number" min="0" value={item.price_at_time}
                                                                            onChange={e => handleUpdateItem(idx, 'price_at_time', parseFloat(e.target.value) || 0)}
                                                                            style={{ width: '110px', padding: '0.4rem 0.6rem', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', borderRadius: '6px', color: 'hsl(var(--text-main))', textAlign: 'center', fontSize: '0.9rem' }} />
                                                                    </div>
                                                                    <div style={{ marginLeft: 'auto', fontWeight: 800, fontSize: '1.1rem', color: 'hsl(var(--success))' }}>₹{((item.quantity * item.price_at_time) || 0).toLocaleString()}</div>
                                                                    <button onClick={() => handleRemoveItem(idx)} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: '6px', padding: '0.4rem 0.6rem', cursor: 'pointer' }}>
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                        <div style={{ fontSize: '0.9rem', color: 'hsl(var(--text-muted))' }}>{item.quantity} x ₹{(item.price_at_time || 0).toLocaleString()}</div>
                                                                        {item.returned_quantity > 0 && (
                                                                            <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>({item.returned_quantity} already returned)</div>
                                                                        )}
                                                                    </div>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                                        <div style={{ fontWeight: 800, fontSize: '1.25rem', color: 'hsl(var(--success))' }}>₹{(((item.quantity - (item.returned_quantity || 0)) * item.price_at_time) || 0).toLocaleString()}</div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                                {orderItems.filter(item => (item.returned_quantity || 0) >= item.quantity).length > 0 && (
                                                    <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                                                        <h4 style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Successfully Returned Items</h4>
                                                        {orderItems.filter(item => (item.returned_quantity || 0) >= item.quantity).map((item, idx) => (
                                                            <div key={idx} style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                                                <span>{item.product_name} x {item.quantity}</span>
                                                                <span style={{ fontWeight: 700 }}>FULL RETURN</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {selectedOrder.tracking_number && (
                                                <div style={{ marginTop: '2.5rem', padding: '1.5rem', background: 'hsl(var(--primary) / 0.05)', borderRadius: '15px', border: '1px dashed hsl(var(--primary) / 0.3)' }}>
                                                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'hsl(var(--primary))', marginBottom: '1rem' }}>
                                                        <Truck size={18} /> Shipping & Tracking Information
                                                    </h4>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                                        <div>
                                                            <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '4px' }}>Courier Partner</div>
                                                            <div style={{ fontWeight: 700 }}>{selectedOrder.courier_name}</div>
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '4px' }}>Tracking Number</div>
                                                            <div style={{ fontWeight: 700, fontFamily: 'var(--font-roboto)', letterSpacing: '1px' }}>{selectedOrder.tracking_number}</div>
                                                        </div>
                                                    </div>
                                                    {selectedOrder.tracking_url && (
                                                        <a href={selectedOrder.tracking_url} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ marginTop: '1rem', width: '100%', fontSize: '0.8rem' }}>
                                                            <ExternalLink size={14} /> Track Package Real-time
                                                        </a>
                                                    )}
                                                </div>
                                            )}

                                            {/* Order Activity Log - Hidden during Edit */}
                                            {!isEditingItems && (
                                                <div className="card-sub" style={{ marginTop: '2.5rem', padding: '1.25rem', background: '#ffffff', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))' }}>
                                                    <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'hsl(var(--text-muted))', marginBottom: '1rem' }}>Order Activity Log</h4>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                        {orderActivityLogs.length === 0 ? (
                                                            <div style={{ textAlign: 'center', padding: '1rem', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>
                                                                No activity recorded yet
                                                            </div>
                                                        ) : (
                                                            orderActivityLogs.map((log, idx) => {
                                                                const colors = {
                                                                    PLACED: { bg: 'hsl(210, 100%, 92%)', color: 'hsl(210, 100%, 35%)', border: 'hsl(210, 100%, 45%)', cardBg: 'hsl(45, 20%, 96%)' },
                                                                    PAID: { bg: 'hsl(150, 60%, 90%)', color: 'hsl(150, 80%, 25%)', border: 'hsl(150, 70%, 40%)', cardBg: 'hsl(90, 20%, 95%)' },
                                                                    DELIVERED: { bg: 'hsl(100, 60%, 90%)', color: 'hsl(100, 70%, 25%)', border: 'hsl(100, 60%, 40%)', cardBg: 'hsl(90, 20%, 95%)' },
                                                                    PACKING: { bg: 'hsl(40, 100%, 90%)', color: 'hsl(40, 100%, 35%)', border: 'hsl(40, 100%, 45%)', cardBg: '#fffdf5' },
                                                                    SHIPPED: { bg: 'hsl(200, 100%, 92%)', color: 'hsl(200, 100%, 40%)', border: 'hsl(200, 100%, 45%)', cardBg: '#f5fbff' },
                                                                    CANCELLED: { bg: 'hsl(0, 100%, 95%)', color: 'hsl(0, 100%, 40%)', border: 'hsl(0, 100%, 45%)', cardBg: '#fef5f5' }
                                                                };
                                                                const c = colors[log.status] || { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', cardBg: '#f8fafc' };

                                                                return (
                                                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: c.bg, color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem', flexShrink: 0 }}>{idx + 1}</div>
                                                                        <div style={{ flex: 1, padding: '0.85rem 1.25rem', background: c.cardBg, borderRadius: '8px', borderLeft: `4px solid ${c.border}`, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'hsl(var(--text-main))' }}>{log.status}</span><span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', fontWeight: 500 }}>{toIST(log.created_at, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}</span></div>
                                                                            {log.notes && <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-main))', fontWeight: 500, opacity: 0.85 }}>{log.notes}</div>}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Top: Customer Info */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', gridArea: 'info' }}>
                                            {isEditingItems ? (
                                                <>
                                                    {/* Card 1: Shipping Details */}
                                                    <div>
                                                        <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'hsl(var(--text-muted))', marginBottom: '0.5rem', fontWeight: 700 }}>Shipping Details</h4>
                                                        <div className="card-sub" style={{ padding: '1.25rem', background: '#ffffff', borderRadius: '12px', border: '1px solid hsl(var(--primary) / 0.4)' }}>
                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                                                                <div>
                                                                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>FULL NAME</label>
                                                                    <input
                                                                        placeholder="Full Name"
                                                                        value={selectedOrder.shipping_name ?? (selectedOrder.customer_name || '')}
                                                                        onChange={e => setSelectedOrder({ ...selectedOrder, shipping_name: e.target.value, customer_name: e.target.value })}
                                                                        style={{ width: '100%', padding: '0.65rem 0.85rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: 'hsl(var(--text-main))', fontSize: '0.85rem', outline: 'none' }}
                                                                        onFocus={e => e.target.style.borderColor = 'hsl(var(--primary))'}
                                                                        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>PHONE</label>
                                                                    <input
                                                                        placeholder="Phone Number"
                                                                        value={selectedOrder.shipping_phone ?? (selectedOrder.customer_phone || '')}
                                                                        onChange={e => setSelectedOrder({ ...selectedOrder, shipping_phone: e.target.value, customer_phone: e.target.value })}
                                                                        style={{ width: '100%', padding: '0.65rem 0.85rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: 'hsl(var(--text-main))', fontSize: '0.85rem', outline: 'none' }}
                                                                        onFocus={e => e.target.style.borderColor = 'hsl(var(--primary))'}
                                                                        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>CUSTOMER EMAIL</label>
                                                                    <input
                                                                        placeholder="Customer Email"
                                                                        value={selectedOrder.customer_email || ''}
                                                                        onChange={e => setSelectedOrder({ ...selectedOrder, customer_email: e.target.value })}
                                                                        style={{ width: '100%', padding: '0.65rem 0.85rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: 'hsl(var(--text-main))', fontSize: '0.85rem', outline: 'none' }}
                                                                        onFocus={e => e.target.style.borderColor = 'hsl(var(--primary))'}
                                                                        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>PINCODE</label>
                                                                    <input
                                                                        placeholder="Pincode"
                                                                        value={selectedOrder.shipping_pincode || ''}
                                                                        onChange={e => setSelectedOrder({ ...selectedOrder, shipping_pincode: e.target.value })}
                                                                        style={{ width: '100%', padding: '0.65rem 0.85rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: 'hsl(var(--text-main))', fontSize: '0.85rem', outline: 'none' }}
                                                                        onFocus={e => e.target.style.borderColor = 'hsl(var(--primary))'}
                                                                        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                                                                    />
                                                                </div>
                                                                <div style={{ gridColumn: 'span 2' }}>
                                                                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>ADDRESS LINE</label>
                                                                    <textarea
                                                                        rows={2}
                                                                        placeholder="Flat, Street, Area"
                                                                        value={selectedOrder.shipping_address_line || ''}
                                                                        onChange={e => setSelectedOrder({ ...selectedOrder, shipping_address_line: e.target.value })}
                                                                        style={{ width: '100%', padding: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: 'hsl(var(--text-main))', fontSize: '0.85rem', resize: 'vertical', minHeight: '60px', outline: 'none' }}
                                                                        onFocus={e => e.target.style.borderColor = 'hsl(var(--primary))'}
                                                                        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>CITY</label>
                                                                    <input
                                                                        placeholder="City"
                                                                        value={selectedOrder.shipping_city || ''}
                                                                        onChange={e => setSelectedOrder({ ...selectedOrder, shipping_city: e.target.value })}
                                                                        style={{ width: '100%', padding: '0.65rem 0.85rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: 'hsl(var(--text-main))', fontSize: '0.85rem', outline: 'none' }}
                                                                        onFocus={e => e.target.style.borderColor = 'hsl(var(--primary))'}
                                                                        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>STATE</label>
                                                                    <select
                                                                        value={selectedOrder.shipping_state || 'Tamil Nadu'}
                                                                        onChange={e => setSelectedOrder({ ...selectedOrder, shipping_state: e.target.value })}
                                                                        style={{ width: '100%', padding: '0.65rem 0.85rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: 'hsl(var(--text-main))', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
                                                                        onFocus={e => e.target.style.borderColor = 'hsl(var(--primary))'}
                                                                        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                                                                    >
                                                                        {['Tamil Nadu', 'Kerala', 'Karnataka', 'Andhra Pradesh', 'Telangana', 'Maharashtra', 'Delhi', 'Gujarat', 'Other'].map(s => <option key={s} value={s}>{s}</option>)}
                                                                    </select>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Card 2: Billing Details */}
                                                    <div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                            <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'hsl(var(--text-muted))', margin: 0, fontWeight: 700 }}>Billing Details</h4>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedOrder(prev => {
                                                                        if (!prev) return prev;
                                                                        const currentShip = parseStructuredAddress(
                                                                            prev.shipping_address || prev.delivery_address, 
                                                                            prev.customer_name, 
                                                                            prev.customer_phone
                                                                        );
                                                                        const sName = prev.shipping_name || currentShip.name || prev.customer_name || '';
                                                                        const sPhone = prev.shipping_phone || currentShip.phone || prev.customer_phone || '';
                                                                        const sPincode = prev.shipping_pincode || currentShip.pincode || '';
                                                                        const sAddressLine = prev.shipping_address_line || currentShip.address_line || '';
                                                                        const sCity = prev.shipping_city || currentShip.city || '';
                                                                        const sState = prev.shipping_state || currentShip.state || 'Tamil Nadu';

                                                                        return {
                                                                            ...prev,
                                                                            shipping_name: sName,
                                                                            shipping_phone: sPhone,
                                                                            shipping_pincode: sPincode,
                                                                            shipping_address_line: sAddressLine,
                                                                            shipping_city: sCity,
                                                                            shipping_state: sState,

                                                                            billing_name: sName,
                                                                            billing_phone: sPhone,
                                                                            billing_pincode: sPincode,
                                                                            billing_address_line: sAddressLine,
                                                                            billing_city: sCity,
                                                                            billing_state: sState
                                                                        };
                                                                    });
                                                                }}
                                                                style={{ padding: '3px 8px', fontSize: '0.7rem', color: 'hsl(var(--primary))', background: 'hsl(var(--primary) / 0.08)', border: '1px solid hsl(var(--primary) / 0.2)', borderRadius: '5px', cursor: 'pointer', fontWeight: 700 }}
                                                            >
                                                                Same as Shipping Address
                                                            </button>
                                                        </div>
                                                        <div className="card-sub" style={{ padding: '1.25rem', background: '#ffffff', borderRadius: '12px', border: '1px solid hsl(var(--primary) / 0.4)' }}>
                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                                                                <div>
                                                                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>FULL NAME</label>
                                                                    <input
                                                                        placeholder="Full Name"
                                                                        value={selectedOrder.billing_name ?? (selectedOrder.customer_name || '')}
                                                                        onChange={e => setSelectedOrder({ ...selectedOrder, billing_name: e.target.value })}
                                                                        style={{ width: '100%', padding: '0.65rem 0.85rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: 'hsl(var(--text-main))', fontSize: '0.85rem', outline: 'none' }}
                                                                        onFocus={e => e.target.style.borderColor = 'hsl(var(--primary))'}
                                                                        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>PHONE</label>
                                                                    <input
                                                                        placeholder="Phone Number"
                                                                        value={selectedOrder.billing_phone ?? (selectedOrder.customer_phone || '')}
                                                                        onChange={e => setSelectedOrder({ ...selectedOrder, billing_phone: e.target.value })}
                                                                        style={{ width: '100%', padding: '0.65rem 0.85rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: 'hsl(var(--text-main))', fontSize: '0.85rem', outline: 'none' }}
                                                                        onFocus={e => e.target.style.borderColor = 'hsl(var(--primary))'}
                                                                        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>PINCODE</label>
                                                                    <input
                                                                        placeholder="Pincode"
                                                                        value={selectedOrder.billing_pincode || ''}
                                                                        onChange={e => setSelectedOrder({ ...selectedOrder, billing_pincode: e.target.value })}
                                                                        style={{ width: '100%', padding: '0.65rem 0.85rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: 'hsl(var(--text-main))', fontSize: '0.85rem', outline: 'none' }}
                                                                        onFocus={e => e.target.style.borderColor = 'hsl(var(--primary))'}
                                                                        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>CITY</label>
                                                                    <input
                                                                        placeholder="City"
                                                                        value={selectedOrder.billing_city || ''}
                                                                        onChange={e => setSelectedOrder({ ...selectedOrder, billing_city: e.target.value })}
                                                                        style={{ width: '100%', padding: '0.65rem 0.85rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: 'hsl(var(--text-main))', fontSize: '0.85rem', outline: 'none' }}
                                                                        onFocus={e => e.target.style.borderColor = 'hsl(var(--primary))'}
                                                                        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                                                                    />
                                                                </div>
                                                                <div style={{ gridColumn: 'span 2' }}>
                                                                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>ADDRESS LINE</label>
                                                                    <textarea
                                                                        rows={2}
                                                                        placeholder="Flat, Street, Area"
                                                                        value={selectedOrder.billing_address_line || ''}
                                                                        onChange={e => setSelectedOrder({ ...selectedOrder, billing_address_line: e.target.value })}
                                                                        style={{ width: '100%', padding: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: 'hsl(var(--text-main))', fontSize: '0.85rem', resize: 'vertical', minHeight: '60px', outline: 'none' }}
                                                                        onFocus={e => e.target.style.borderColor = 'hsl(var(--primary))'}
                                                                        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                                                                    />
                                                                </div>
                                                                <div style={{ gridColumn: 'span 2' }}>
                                                                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>STATE</label>
                                                                    <select
                                                                        value={selectedOrder.billing_state || 'Tamil Nadu'}
                                                                        onChange={e => setSelectedOrder({ ...selectedOrder, billing_state: e.target.value })}
                                                                        style={{ width: '100%', padding: '0.65rem 0.85rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: 'hsl(var(--text-main))', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
                                                                        onFocus={e => e.target.style.borderColor = 'hsl(var(--primary))'}
                                                                        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                                                                    >
                                                                        {['Tamil Nadu', 'Kerala', 'Karnataka', 'Andhra Pradesh', 'Telangana', 'Maharashtra', 'Delhi', 'Gujarat', 'Other'].map(s => <option key={s} value={s}>{s}</option>)}
                                                                    </select>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'hsl(var(--text-muted))', marginBottom: '-0.5rem', fontWeight: 700 }}>Customer Info</h4>
                                                    <div className="card-sub" style={{ padding: '1.25rem', background: '#ffffff', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))' }}>
                                                        <div style={{ fontWeight: 800, fontSize: '1rem', color: 'hsl(var(--text-main))' }}>{selectedOrder.customer_name}</div>
                                                        <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', marginTop: '2px', fontWeight: 500 }}>{formatDisplayPhoneNumber(selectedOrder.customer_phone)}</div>
                                                        {selectedOrder.customer_email && (
                                                            <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', wordBreak: 'break-word', marginTop: '2px' }}>{selectedOrder.customer_email}</div>
                                                        )}

                                                        <div style={{ marginTop: '1.25rem' }}>
                                                            <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 700, letterSpacing: '0.5px' }}>Billing Address</div>
                                                            <div style={{ fontSize: '0.85rem', lineHeight: 1.5, color: 'hsl(var(--text-main))' }}>
                                                                {(() => {
                                                                    let addr = selectedOrder.billing_address || selectedOrder.delivery_address || 'N/A';
                                                                    if (typeof addr === 'string' && addr.trim().startsWith('{')) { try { addr = JSON.parse(addr); } catch(e){} }
                                                                    if (typeof addr === 'object' && addr !== null) {
                                                                        return (
                                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                                                <div style={{ fontWeight: 600 }}>{addr.name || selectedOrder.customer_name}</div>
                                                                                <div style={{ color: 'hsl(var(--text-muted))' }}>{formatDisplayPhoneNumber(addr.mobile || addr.phone || selectedOrder.customer_phone)}</div>
                                                                                {(addr.email || selectedOrder.billing_email) && <div style={{ color: 'hsl(var(--text-muted))', wordBreak: 'break-word' }}>{addr.email || selectedOrder.billing_email}</div>}
                                                                                <div style={{ marginTop: '4px' }}>{[addr.address, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ')}</div>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    return <div style={{ whiteSpace: 'pre-line' }}>{String(addr)}</div>;
                                                                })()}
                                                            </div>
                                                        </div>

                                                        <div style={{ marginTop: '1.25rem' }}>
                                                            <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 700, letterSpacing: '0.5px' }}>Shipping Address</div>
                                                            <div style={{ fontSize: '0.85rem', lineHeight: 1.5, color: 'hsl(var(--text-main))' }}>
                                                                {(() => {
                                                                    let addr = selectedOrder.shipping_address || selectedOrder.delivery_address || 'Same as billing';
                                                                    if (typeof addr === 'string' && addr.trim().startsWith('{')) { try { addr = JSON.parse(addr); } catch(e){} }
                                                                    if (typeof addr === 'object' && addr !== null) {
                                                                        return (
                                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                                                <div style={{ fontWeight: 600 }}>{addr.name || selectedOrder.customer_name}</div>
                                                                                <div style={{ color: 'hsl(var(--text-muted))' }}>{formatDisplayPhoneNumber(addr.mobile || addr.phone || selectedOrder.customer_phone)}</div>
                                                                                {(addr.email || selectedOrder.shipping_email) && <div style={{ color: 'hsl(var(--text-muted))', wordBreak: 'break-word' }}>{addr.email || selectedOrder.shipping_email}</div>}
                                                                                <div style={{ marginTop: '4px' }}>{[addr.address, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ')}</div>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    return <div style={{ whiteSpace: 'pre-line' }}>{String(addr)}</div>;
                                                                })()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Bottom: Summary & Others */}
                                        <div style={{ 
                                            display: isEditingItems ? 'grid' : 'flex', 
                                            flexDirection: 'column', 
                                            gridTemplateColumns: isEditingItems ? '1fr 1fr' : 'auto',
                                            gap: '1.5rem', 
                                            gridArea: 'others' 
                                        }}>
                                            <div className="card-sub" style={{ padding: '1.25rem', background: '#ffffff', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))', order: isEditingItems ? 2 : 1 }}>
                                                <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'hsl(var(--text-muted))', marginBottom: '1rem' }}>Order Summary</h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem', color: 'hsl(var(--text-main))' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <span>Subtotal:</span>
                                                        <span style={{ fontWeight: 600 }}>₹{(selectedOrder.subtotal || (selectedOrder.total_amount - (selectedOrder.tax_amount || 0) - (selectedOrder.shipping_cost || 0))).toLocaleString()}</span>
                                                    </div>

                                                    {selectedOrder.cgst > 0 && (
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'hsl(var(--text-muted))' }}>
                                                            <span>CGST (2.5%):</span>
                                                            <span>₹{parseFloat(selectedOrder.cgst).toLocaleString()}</span>
                                                        </div>
                                                    )}
                                                    {selectedOrder.sgst > 0 && (
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'hsl(var(--text-muted))' }}>
                                                            <span>SGST (2.5%):</span>
                                                            <span>₹{parseFloat(selectedOrder.sgst).toLocaleString()}</span>
                                                        </div>
                                                    )}
                                                    {selectedOrder.igst > 0 && (
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'hsl(var(--text-muted))' }}>
                                                            <span>IGST (5%):</span>
                                                            <span>₹{parseFloat(selectedOrder.igst).toLocaleString()}</span>
                                                        </div>
                                                    )}
                                                    {(!selectedOrder.cgst && !selectedOrder.sgst && !selectedOrder.igst && selectedOrder.tax_amount > 0) && (
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'hsl(var(--text-muted))' }}>
                                                            <span>Tax (Aggregate):</span>
                                                            <span>₹{parseFloat(selectedOrder.tax_amount).toLocaleString()}</span>
                                                        </div>
                                                    )}

                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: 'hsl(var(--text-muted))' }}>
                                                        <span>Shipping:</span>
                                                        <span>₹{(selectedOrder.shipping_cost || 0).toLocaleString()}</span>
                                                    </div>
                                                    <div style={{ height: '1px', background: 'hsl(var(--border-subtle))', margin: '0.5rem 0' }} />
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800, color: 'hsl(var(--primary))' }}>
                                                        <span>Total:</span>
                                                        <span>₹{(selectedOrder.total_amount || 0).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Source & Channel Info Card */}
                                            <div className="card-sub" style={{ padding: '1.25rem', background: '#ffffff', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))', order: isEditingItems ? 3 : 1 }}>
                                                <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'hsl(var(--text-muted))', marginBottom: '1rem', fontWeight: 700 }}>Source & Channel Info</h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ color: 'hsl(var(--text-muted))' }}>Order Source:</span>
                                                        {(() => {
                                                            const src = selectedOrder.source || (selectedOrder.id?.startsWith('WEB-') ? 'WEBSITE' : selectedOrder.id?.startsWith('MAN-') ? 'MANUAL' : 'WHATSAPP');
                                                            return (
                                                                <span style={{ fontWeight: 800, color: src === 'WEBSITE' ? '#1d4ed8' : src === 'MANUAL' ? '#6b21a8' : '#047857' }}>
                                                                    {src === 'WEBSITE' ? 'Website Store' : src === 'MANUAL' ? 'Admin Manual Order' : 'WhatsApp Bot'}
                                                                </span>
                                                            );
                                                        })()}
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ color: 'hsl(var(--text-muted))' }}>Payment Channel:</span>
                                                        <span style={{ fontWeight: 700, color: 'hsl(var(--text-main))' }}>
                                                            {selectedOrder.payment_method || (selectedOrder.id?.startsWith('WEB-') ? 'Online Payment / COD' : 'Cash / Direct Transfer')}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ color: 'hsl(var(--text-muted))' }}>Order Type:</span>
                                                        <span style={{ fontWeight: 600, color: 'hsl(var(--text-muted))' }}>
                                                            {selectedOrder.id?.startsWith('WEB-') ? 'Web Cart Purchase' : selectedOrder.id?.startsWith('MAN-') ? 'Admin Panel Invoice' : 'WhatsApp Checkout'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="card-sub" style={{ padding: '1.25rem', background: '#ffffff', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))', order: isEditingItems ? 1 : 2 }}>
                                                <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'hsl(var(--text-muted))', marginBottom: '1rem' }}>Actions</h4>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
                                                    <select
                                                        value={selectedOrder.status}
                                                        onChange={(e) => {
                                                            const newStatus = e.target.value;

                                                            // Close all other inline action forms
                                                            setShowResendEmailModal(false);
                                                            setShowResendWhatsAppModal(false);
                                                            setShowShippingForm(false);
                                                            setStatusConfirmModal(null);
                                                            // showCancelModal is an overlay, but good to reset if changing status

                                                            if (newStatus === 'SHIPPED') {
                                                                openCourierModal(selectedOrder, false);
                                                            } else if (newStatus === 'CANCELLED') {
                                                                setShowCancelModal(true);
                                                            } else if (['PAID', 'PACKING', 'DELIVERED'].includes(newStatus)) {
                                                                setStatusConfirmModal({
                                                                    status: newStatus,
                                                                    title: `Confirm ${newStatus}`,
                                                                    message: `Change order status to ${newStatus}? This will automatically notify all relevant contacts via WhatsApp and Email.`,
                                                                });
                                                            } else {
                                                                updateOrderStatus(selectedOrder.id, newStatus);
                                                            }
                                                        }}
                                                        style={{ padding: '0.75rem', borderRadius: '8px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))', cursor: 'pointer' }}
                                                    >
                                                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>

                                                    {/* Status Confirmation Modal */}
                                                    {statusConfirmModal && (
                                                        <div className="animate-enter" style={{ marginTop: '0.75rem', padding: '1rem', background: '#f0f9ff', borderRadius: '10px', border: '1px solid hsl(var(--primary) / 0.3)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--primary))', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <AlertCircle size={14} /> {statusConfirmModal.title}
                                                            </div>
                                                            <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', margin: 0 }}>
                                                                {statusConfirmModal.message}
                                                            </p>
                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                                                <button onClick={() => setStatusConfirmModal(null)} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>Cancel</button>
                                                                <button
                                                                    onClick={() => {
                                                                        updateOrderStatus(selectedOrder.id, statusConfirmModal.status);
                                                                        setStatusConfirmModal(null);
                                                                    }}
                                                                    className="btn btn-primary"
                                                                    style={{ fontSize: '0.8rem' }}
                                                                >Confirm</button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Cancel Order Modal */}
                                                    {showCancelModal && (
                                                        <div className="animate-enter" style={{ marginTop: '0.75rem', padding: '1rem', background: '#fef2f2', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <XCircle size={14} /> Cancel Order
                                                            </div>
                                                            <textarea
                                                                placeholder="Enter cancellation reason..."
                                                                value={cancelReason}
                                                                onChange={e => setCancelReason(e.target.value)}
                                                                style={{ width: '100%', padding: '0.65rem', background: '#ffffff', border: '1px solid hsl(var(--border-subtle))', borderRadius: '8px', color: 'hsl(var(--text-main))', fontSize: '0.85rem', minHeight: '80px' }}
                                                            />
                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                                                <button onClick={() => { setShowCancelModal(false); setCancelReason(''); }} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>Cancel</button>
                                                                <button
                                                                    onClick={handleCancelOrder}
                                                                    disabled={!cancelReason.trim()}
                                                                    className="btn btn-primary"
                                                                    style={{ fontSize: '0.8rem', background: '#ef4444' }}
                                                                >Confirm Cancel</button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Shipping Actions Block */}
                                                    {['PLACED', 'PAID', 'PACKING', 'SHIPPED'].includes(selectedOrder.status) && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                                                            <button onClick={() => openCourierModal(selectedOrder, false)} className="btn btn-primary" style={{ width: '100%', background: '#0f172a' }}>
                                                                <Truck size={16} /> {selectedOrder.courier_name ? 'Update Courier' : 'Select Courier'}
                                                            </button>
                                                            
                                                            {selectedOrder.courier_name && (
                                                                <button
                                                                    onClick={() => {
                                                                        const bPhone = selectedOrder.billing_phone || (typeof selectedOrder.billing_address === 'object' ? selectedOrder.billing_address?.phone : null) || selectedOrder.customer_phone || '';
                                                                        const sPhone = selectedOrder.shipping_phone || (typeof selectedOrder.shipping_address === 'object' ? selectedOrder.shipping_address?.phone : null) || '';
                                                                        const phoneToUse = bPhone || sPhone;

                                                                        const bEmail = selectedOrder.billing_email || (typeof selectedOrder.billing_address === 'object' ? selectedOrder.billing_address?.email : null) || selectedOrder.customer_email || '';
                                                                        const sEmail = selectedOrder.shipping_email || (typeof selectedOrder.shipping_address === 'object' ? selectedOrder.shipping_address?.email : null) || '';
                                                                        const emailToUse = bEmail || sEmail;

                                                                        setNotificationPhone(formatDisplayPhoneNumber(phoneToUse));
                                                                        setNotificationEmail(emailToUse);
                                                                        setSendWhatsAppChecked(true);
                                                                        setSendEmailChecked(true);
                                                                        setShowSendNotificationModal(true);

                                                                        setShowResendWhatsAppModal(false);
                                                                        setShowResendEmailModal(false);
                                                                        setStatusConfirmModal(null);
                                                                        setShowShippingForm(false);
                                                                        setNotificationSelection(null);
                                                                    }}
                                                                    disabled={loading}
                                                                    className="btn btn-primary"
                                                                    style={{ width: '100%', background: 'linear-gradient(135deg, #10b981, #059669)' }}
                                                                >
                                                                    {loading && notification?.type === 'info' ? <Loader2 size={16} className="animate-spin" /> : <><Send size={16} /> Send Info</>}
                                                                </button>
                                                            )
                                                            }

                                                            {selectedOrder.tracking_url && (
                                                                <a
                                                                    href={selectedOrder.tracking_url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="btn btn-secondary"
                                                                    style={{ width: '100%', background: '#f0f9ff', color: 'hsl(var(--primary))', border: '1px solid hsl(var(--primary) / 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none' }}
                                                                >
                                                                    <ExternalLink size={16} /> Track Package Real-time
                                                                </a>
                                                            )}
                                                        </div>
                                                    )}

                                                    <button
                                                        onClick={() => handleBulkDelete([selectedOrder.id])}
                                                        className="btn"
                                                        style={{
                                                            width: '100%',
                                                            marginTop: '0.5rem',
                                                            background: 'hsl(var(--danger) / 0.1)',
                                                            color: '#ef4444',
                                                            border: '1px solid rgba(239,68,68,0.2)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '8px'
                                                        }}
                                                    >
                                                        <Trash2 size={15} /> Delete Order
                                                    </button>
                                                    
                                                    {!selectedOrder.courier_name && (
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                                                            <button
                                                                onClick={() => {
                                                                    const bPhone = selectedOrder.billing_phone || (typeof selectedOrder.billing_address === 'object' ? selectedOrder.billing_address?.phone : null) || selectedOrder.customer_phone || '';
                                                                    const sPhone = selectedOrder.shipping_phone || (typeof selectedOrder.shipping_address === 'object' ? selectedOrder.shipping_address?.phone : null) || '';
                                                                    const phoneToUse = bPhone || sPhone;
                                                                    const bEmail = selectedOrder.billing_email || (typeof selectedOrder.billing_address === 'object' ? selectedOrder.billing_address?.email : null) || selectedOrder.customer_email || '';
                                                                    const sEmail = selectedOrder.shipping_email || (typeof selectedOrder.shipping_address === 'object' ? selectedOrder.shipping_address?.email : null) || '';
                                                                    const emailToUse = bEmail || sEmail;
                                                                    setNotificationPhone(formatDisplayPhoneNumber(phoneToUse));
                                                                    setNotificationEmail(emailToUse);
                                                                    setSendWhatsAppChecked(true);
                                                                    setSendEmailChecked(true);
                                                                    setShowSendNotificationModal(true);
                                                                    setShowResendWhatsAppModal(false);
                                                                    setShowResendEmailModal(false);
                                                                    setStatusConfirmModal(null);
                                                                    setShowShippingForm(false);
                                                                    setNotificationSelection(null);
                                                                }}
                                                                className="btn btn-secondary"
                                                                style={{ width: '100%', gap: '8px', background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))', border: '1px solid hsl(var(--primary) / 0.2)' }}
                                                            >
                                                                <Send size={16} /> Send Info
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* Notification Selection Modal (Multi-contact) */}
                                                    {notificationSelection && (
                                                        <div className="animate-enter" style={{ marginTop: '0.75rem', padding: '1rem', background: '#fff', borderRadius: '10px', border: '1px solid hsl(var(--primary) / 0.3)', display: 'flex', flexDirection: 'column', gap: '0.75rem', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                                                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--primary))', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                {notificationSelection.type === 'email' ? <Mail size={14} /> : <MessageCircle size={14} />}
                                                                Select {notificationSelection.type === 'email' ? 'Email' : 'Phone'}
                                                            </div>
                                                            <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', margin: 0 }}>
                                                                Multiple {notificationSelection.type}s found. Please select which one to use:
                                                            </p>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                                <button
                                                                    onClick={() => notificationSelection.type === 'email' ? handleResendEmail(notificationSelection.billing) : handleResendWhatsApp(notificationSelection.billing)}
                                                                    className="btn btn-secondary"
                                                                    style={{ fontSize: '0.8rem', justifyContent: 'flex-start', padding: '0.6rem 1rem', wordBreak: 'break-all', height: 'auto', textAlign: 'left' }}
                                                                >
                                                                    <strong>Billing:</strong> {notificationSelection.billing}
                                                                </button>
                                                                <button
                                                                    onClick={() => notificationSelection.type === 'email' ? handleResendEmail(notificationSelection.shipping) : handleResendWhatsApp(notificationSelection.shipping)}
                                                                    className="btn btn-secondary"
                                                                    style={{ fontSize: '0.8rem', justifyContent: 'flex-start', padding: '0.6rem 1rem', wordBreak: 'break-all', height: 'auto', textAlign: 'left' }}
                                                                >
                                                                    <strong>Shipping:</strong> {notificationSelection.shipping}
                                                                </button>
                                                                <button onClick={() => setNotificationSelection(null)} className="btn" style={{ fontSize: '0.8rem', background: '#f1f5f9', color: 'hsl(var(--text-muted))', marginTop: '0.25rem' }}>
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Transaction ID & Payment Info */}
                                            {(selectedOrder.transaction_id || selectedOrder.payment_gateway) && (
                                                 <div className="card-sub" style={{ padding: '1.25rem', background: '#ffffff', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))' }}>
                                                     <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'hsl(var(--text-muted))', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><CreditCard size={14} /> Payment Info</h4>
                                                     {selectedOrder.transaction_id && (
                                                         <div style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                                                             <span style={{ color: 'hsl(var(--text-muted))' }}>Transaction ID:</span>
                                                             <span style={{ fontFamily: 'var(--font-roboto)', marginLeft: '0.5rem' }}>{selectedOrder.transaction_id}</span>
                                                         </div>
                                                     )}
                                                     {selectedOrder.payment_gateway && (
                                                         <div style={{ fontSize: '0.85rem' }}>
                                                             <span style={{ color: 'hsl(var(--text-muted))' }}>Gateway:</span>
                                                             <span style={{ marginLeft: '0.5rem', textTransform: 'uppercase' }}>{selectedOrder.payment_gateway}</span>
                                                         </div>
                                                     )}
                                                 </div>
                                             )}

                                             {/* Admin Notes Display */}
                                             {selectedOrder.admin_notes && (
                                                 <div className="card-sub" style={{ padding: '1.25rem', background: '#fef2f2', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                                     <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#ef4444', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><ShieldAlert size={14} /> Admin Notes</h4>
                                                     <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-main))', margin: 0 }}>{selectedOrder.admin_notes}</p>
                                                 </div>
                                             )}

                                             {/* Customer Notes */}
                                             {selectedOrder.customer_notes && (
                                                 <div className="card-sub" style={{ padding: '1.25rem', background: '#f0f9ff', borderRadius: '12px', border: '1px solid hsl(var(--primary) / 0.2)' }}>
                                                     <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'hsl(var(--primary))', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><FileText size={14} /> Customer Notes</h4>
                                                     <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-main))', margin: 0 }}>{selectedOrder.customer_notes}</p>
                                                 </div>
                                             )}



                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/*  ADD MANUAL ORDER PAGE  */}
                        {isAddingOrder && (
                            <div className="animate-enter" style={{ paddingBottom: '4rem' }}>
                                <div className="card shadow-premium" style={{
                                    width: '100%', maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', border: '1px solid hsl(var(--border-subtle))', borderRadius: '24px', background: '#ffffff'
                                }}>
                                    <div style={{ padding: '1.5rem 2rem', background: '#ffffff', borderBottom: '1px solid hsl(var(--border-subtle))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <Package size={24} color="hsl(var(--primary))" /> Manual Order Creation
                                        </h2>
                                        <button onClick={() => setIsAddingOrder(false)} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>← Back to Orders</button>
                                    </div>

                                    <div style={{ flex: 1, overflow: 'auto', padding: '2rem' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                                            <div style={{ gridColumn: 'span 2', borderBottom: '1px solid hsl(var(--border-subtle))', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                                                <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'hsl(var(--primary))' }}>Billing Details</h3>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Customer Name *</label>
                                                <input type="text" placeholder="John Doe" value={newOrder.customer_name} onChange={e => setNewOrder({ ...newOrder, customer_name: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))' }} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Billing Email *</label>
                                                <input type="email" placeholder="billing@email.com" value={newOrder.billing_email || ''} onChange={e => setNewOrder({ ...newOrder, billing_email: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))' }} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Billing Phone *</label>
                                                <input type="tel" placeholder="91..." value={newOrder.billing_phone} onChange={e => setNewOrder({ ...newOrder, billing_phone: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))' }} />
                                            </div>
                                            <div style={{ gridColumn: 'span 2' }}>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Billing Address *</label>
                                                <textarea rows={1} placeholder="Full billing address..." value={newOrder.billing_address} onChange={e => setNewOrder({ ...newOrder, billing_address: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))', resize: 'none' }} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Billing City *</label>
                                                <input type="text" placeholder="City" value={newOrder.billing_city} onChange={e => setNewOrder({ ...newOrder, billing_city: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))' }} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Billing Pincode *</label>
                                                <input type="text" placeholder="600001" value={newOrder.billing_pincode} onChange={e => setNewOrder({ ...newOrder, billing_pincode: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))' }} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Billing State</label>
                                                <select value={newOrder.billing_state} onChange={e => setNewOrder({ ...newOrder, billing_state: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))', cursor: 'pointer' }}>
                                                    {["Tamil Nadu", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi"].map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </div>

                                            <div style={{ gridColumn: 'span 2', marginTop: '1rem', borderTop: '1px solid hsl(var(--border-subtle))', paddingTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'hsl(var(--primary))' }}>Shipping Details</h3>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                                                    <input type="checkbox" checked={newOrder.same_as_billing} onChange={e => setNewOrder({ ...newOrder, same_as_billing: e.target.checked })} />
                                                    Same as Billing
                                                </label>
                                            </div>

                                            {!newOrder.same_as_billing && (
                                                <>
                                                    <div style={{ gridColumn: 'span 2' }}>
                                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Shipping Address *</label>
                                                        <textarea rows={1} placeholder="Full shipping address..." value={newOrder.shipping_address} onChange={e => setNewOrder({ ...newOrder, shipping_address: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))', resize: 'none' }} />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Shipping City *</label>
                                                        <input type="text" placeholder="City" value={newOrder.shipping_city} onChange={e => setNewOrder({ ...newOrder, shipping_city: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))' }} />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Shipping Pincode *</label>
                                                        <input type="text" placeholder="600001" value={newOrder.shipping_pincode} onChange={e => setNewOrder({ ...newOrder, shipping_pincode: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))' }} />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Shipping State</label>
                                                        <select value={newOrder.shipping_state} onChange={e => setNewOrder({ ...newOrder, shipping_state: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))', cursor: 'pointer' }}>
                                                            {["Tamil Nadu", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi"].map(s => <option key={s} value={s}>{s}</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Shipping Phone</label>
                                                        <input type="tel" placeholder="91..." value={newOrder.shipping_phone} onChange={e => setNewOrder({ ...newOrder, shipping_phone: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))' }} />
                                                    </div>
                                                </>
                                            )}

                                            <div style={{ gridColumn: 'span 2', marginTop: '1rem', borderTop: '1px solid hsl(var(--border-subtle))', paddingTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 1rem 0', color: 'hsl(var(--primary))' }}>Order Options</h3>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Send Notifications</label>
                                                <select value={newOrder.send_notifications || 'both'} onChange={e => setNewOrder({ ...newOrder, send_notifications: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))', cursor: 'pointer' }}>
                                                    <option value="both">WhatsApp & Email</option>
                                                    <option value="whatsapp">Only WhatsApp</option>
                                                    <option value="email">Only Email</option>
                                                    <option value="none">No Notifications</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Payment Method</label>
                                                <select value={newOrder.payment_method} onChange={e => setNewOrder({ ...newOrder, payment_method: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))', cursor: 'pointer' }}>
                                                    <option value="UPI">UPI / Online</option>
                                                    <option value="COD">Cash on Delivery</option>
                                                </select>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                                                <input 
                                                    type="checkbox" 
                                                    id="is_replacement"
                                                    checked={newOrder.is_replacement} 
                                                    onChange={e => setNewOrder({ ...newOrder, is_replacement: e.target.checked })} 
                                                />
                                                <label htmlFor="is_replacement" style={{ fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>Replacement Order (Zero Billing)</label>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Manual Shipping Rate (Optional)</label>
                                                <input 
                                                    type="number" 
                                                    placeholder="Calculate Automatically" 
                                                    value={newOrder.manual_shipping_cost} 
                                                    onChange={e => setNewOrder({ ...newOrder, manual_shipping_cost: e.target.value })} 
                                                    style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))' }} 
                                                />
                                            </div>
                                        </div>

                                        {/* Item Selection */}
                                        <div style={{ marginBottom: '2rem' }}>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '1rem', display: 'block' }}>Add Products</label>
                                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                                                <div style={{ flex: 1, position: 'relative' }}>
                                                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'gray' }} />
                                                    <input
                                                        type="text"
                                                        placeholder="Search product..."
                                                        value={productSearch}
                                                        onChange={e => setProductSearch(e.target.value)}
                                                        style={{ width: '100%', padding: '0.85rem 0.85rem 0.85rem 2.5rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))' }}
                                                    />
                                                    {productSearch && (
                                                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#ffffff', border: '1px solid hsl(var(--border-subtle))', borderRadius: '10px', marginTop: '5px', zIndex: 10, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
                                                            {allProducts.filter(p =>
                                                                p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                                                                (p.product_catalog_image_id && p.product_catalog_image_id.toLowerCase().includes(productSearch.toLowerCase()))
                                                            ).map(p => (
                                                                <div key={p.id} onClick={() => {
                                                                    const exists = newOrder.items.find(i => i.product_id === p.id);
                                                                    if (exists) {
                                                                        setNewOrder({ ...newOrder, items: newOrder.items.map(i => i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i) });
                                                                    } else {
                                                                        setNewOrder({ ...newOrder, items: [...newOrder.items, { product_id: p.id, product_name: p.name, quantity: 1, price: p.price }] });
                                                                    }
                                                                    setProductSearch('');
                                                                }} style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between' }}>
                                                                    <span style={{ color: 'hsl(var(--text-main))' }}>{p.name}</span>
                                                                    <span style={{ fontWeight: 700, color: 'hsl(var(--primary))' }}>₹{p.price.toLocaleString()}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                {newOrder.items.map((item, idx) => (
                                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid hsl(var(--border-subtle))' }}>
                                                        <div style={{ flex: 1, fontWeight: 700 }}>{item.product_name}</div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <input type="number" min="1" value={item.quantity} onChange={e => {
                                                                const val = parseInt(e.target.value);
                                                                setNewOrder({ ...newOrder, items: newOrder.items.map((it, i) => i === idx ? { ...it, quantity: val } : it) });
                                                            }} style={{ width: '60px', padding: '0.5rem', borderRadius: '5px', background: '#f1f5f9', border: '1px solid gray', color: 'hsl(var(--text-main))', textAlign: 'center' }} />
                                                        </div>
                                                        <div style={{ width: '100px', textAlign: 'right', fontWeight: 800 }}>₹{(item.price * item.quantity).toLocaleString()}</div>
                                                        <button onClick={() => setNewOrder({ ...newOrder, items: newOrder.items.filter((_, i) => i !== idx) })} style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                                    </div>
                                                ))}
                                                {newOrder.items.length === 0 && <div style={{ textAlign: 'center', padding: '2rem', border: '1px dashed hsl(var(--border-subtle))', borderRadius: '12px', color: 'gray' }}>No items added. Search above to add products.</div>}
                                            </div>
                                        </div>

                                        {/* Summary & Save */}
                                        <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '15px', border: '1px solid hsl(var(--primary) / 0.2)' }}>
                                            {(() => {
                                                const subtotal = newOrder.is_replacement ? 0 : newOrder.items.reduce((s, i) => s + (i.price * i.quantity), 0);
                                                
                                                const shipping = (() => {
                                                    if (newOrder.manual_shipping_cost !== '') return parseFloat(newOrder.manual_shipping_cost) || 0;
                                                    if (newOrder.is_replacement) return 0;
                                                    if (subtotal === 0) return 0;
                                                    const state = newOrder.same_as_billing ? newOrder.billing_state : newOrder.shipping_state;
                                                    // Find zone for this state
                                                    const mapping = shippingMappings.find(m => m.state_name === state);
                                                    const zoneId = mapping ? mapping.zone_id : (shippingZones.find(z => z.name.toLowerCase().includes('default'))?.id || shippingZones[0]?.id);
                                                    const zone = shippingZones.find(z => z.id === zoneId);
                                                    
                                                    if (!zone) return 100; // ultimate fallback
                                                    if (subtotal >= zone.free_threshold) return 0;
                                                    return zone.rate || 0;
                                                })();

                                                const effectiveState = newOrder.same_as_billing ? newOrder.billing_state : newOrder.shipping_state;
                                                let cgst = 0, sgst = 0, igst = 0;
                                                if (effectiveState === 'Tamil Nadu') {
                                                    cgst = Math.round(subtotal * 0.025);
                                                    sgst = Math.round(subtotal * 0.025);
                                                } else {
                                                    igst = Math.round(subtotal * 0.05);
                                                }
                                                const tax = cgst + sgst + igst;
                                                const total = subtotal + tax + shipping;

                                                return (
                                                    <>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'gray' }}><span>Subtotal:</span><span>₹{subtotal.toLocaleString()}</span></div>
                                                            {cgst > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'gray' }}><span>CGST (2.5%):</span><span>₹{cgst.toLocaleString()}</span></div>}
                                                            {sgst > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'gray' }}><span>SGST (2.5%):</span><span>₹{sgst.toLocaleString()}</span></div>}
                                                            {igst > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'gray' }}><span>IGST (5%):</span><span>₹{igst.toLocaleString()}</span></div>}
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'gray' }}><span>Shipping:</span><span>₹{shipping.toLocaleString()}</span></div>
                                                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '0.5rem 0' }} />
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.5rem', fontWeight: 900, color: 'hsl(var(--primary))' }}><span>Total:</span><span>₹{total.toLocaleString()}</span></div>
                                                        </div>
                                                        <button
                                                            onClick={async () => {
                                                                if (!newOrder.customer_name || !newOrder.billing_phone || newOrder.items.length === 0) {
                                                                    setNotification({ message: 'Please fill all customer details and add at least one item.', type: 'error' });
                                                                    return;
                                                                }
                                                                setNotification({ message: 'Order creating...', type: 'info' });
                                                                setIsCreatingOrder(true);
                                                                try {
                                                                    const { orderId, invoiceNo } = await getNextOrderAndInvoiceId('MAN', supabase);

                                                                    //  NORMALISE PHONE & SYNC CUSTOMER 
                                                                    const cleanPhone = newOrder.billing_phone.replace(/\D/g, '');
                                                                    const normalizedPhone = cleanPhone.startsWith('91') ? cleanPhone : (cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone);

                                                                    const { data: existingCusts, error: lookupError } = await supabase.from('customers').select('id, name').eq('phone', normalizedPhone);

                                                                    if (!existingCusts || existingCusts.length === 0) {
                                                                        const { error: custErr } = await supabase.from('customers').insert({
                                                                            phone: normalizedPhone,
                                                                            name: newOrder.customer_name || 'Website User',
                                                                            address: newOrder.billing_address,
                                                                            city: newOrder.billing_city,
                                                                            state: newOrder.billing_state,
                                                                            role: 'user'
                                                                        });
                                                                        if (custErr) console.error('Failed to auto-create customer profile:', custErr);
                                                                    } else {
                                                                        // Update existing customer with new latest details
                                                                        await supabase.from('customers').update({
                                                                            name: newOrder.customer_name || existingCusts[0].name,
                                                                            address: newOrder.billing_address || existingCusts[0].address,
                                                                            city: newOrder.billing_city || existingCusts[0].city,
                                                                            state: newOrder.billing_state || existingCusts[0].state
                                                                        }).eq('id', existingCusts[0].id);
                                                                    }

                                                                    const { error: ordErr } = await supabase.from('orders').insert({
                                                                        id: orderId,
                                                                        customer_name: newOrder.customer_name,
                                                                        customer_email: newOrder.billing_email || null,
                                                                        customer_phone: normalizedPhone,
                                                                        billing_email: newOrder.billing_email || null,
                                                                        shipping_email: newOrder.same_as_billing ? (newOrder.billing_email || null) : (newOrder.shipping_email || null),
                                                                        billing_phone: normalizedPhone,
                                                                        shipping_phone: newOrder.same_as_billing ? normalizedPhone : (newOrder.shipping_phone ? (newOrder.shipping_phone.startsWith('91') ? newOrder.shipping_phone : `91${newOrder.shipping_phone}`) : normalizedPhone),
                                                                        delivery_address: newOrder.same_as_billing
                                                                            ? `${newOrder.billing_address}, ${newOrder.billing_city} - ${newOrder.billing_pincode} (${newOrder.billing_state})`
                                                                            : `${newOrder.shipping_address}, ${newOrder.shipping_city} - ${newOrder.shipping_pincode} (${newOrder.shipping_state})`,
                                                                        billing_address: {
                                                                            name: newOrder.customer_name,
                                                                            phone: normalizedPhone,
                                                                            email: newOrder.billing_email || null,
                                                                            address: newOrder.billing_address,
                                                                            city: newOrder.billing_city,
                                                                            pincode: newOrder.billing_pincode,
                                                                            state: newOrder.billing_state
                                                                        },
                                                                        shipping_address: newOrder.same_as_billing ? {
                                                                            name: newOrder.customer_name,
                                                                            phone: normalizedPhone,
                                                                            email: newOrder.billing_email || null,
                                                                            address: newOrder.billing_address,
                                                                            city: newOrder.billing_city,
                                                                            pincode: newOrder.billing_pincode,
                                                                            state: newOrder.billing_state
                                                                        } : {
                                                                            name: newOrder.customer_name, // fallback or add shipping_name field
                                                                            phone: newOrder.shipping_phone || normalizedPhone,
                                                                            email: newOrder.shipping_email || newOrder.billing_email || null,
                                                                            address: newOrder.shipping_address,
                                                                            city: newOrder.shipping_city,
                                                                            pincode: newOrder.shipping_pincode,
                                                                            state: newOrder.shipping_state
                                                                        },
                                                                        shipping_state: newOrder.same_as_billing ? newOrder.billing_state : newOrder.shipping_state,
                                                                        total_amount: total,
                                                                        tax_amount: tax,
                                                                        cgst: cgst,
                                                                        sgst: sgst,
                                                                        igst: igst,
                                                                        shipping_cost: shipping,
                                                                        status: 'PLACED',
                                                                        source: 'MANUAL',
                                                                        payment_method: newOrder.payment_method
                                                                    });
                                                                    if (ordErr) throw ordErr;
                                                                    const { error: itemErr } = await supabase.from('order_items').insert(newOrder.items.map(it => ({
                                                                        order_id: orderId,
                                                                        product_id: it.product_id,
                                                                        product_name: it.product_name,
                                                                        quantity: it.quantity,
                                                                        price_at_time: it.price
                                                                    })));
                                                                    if (itemErr) throw itemErr;

                                                                    // Add initial PLACED log entry
                                                                    await supabase.from('order_status_logs').insert({
                                                                        order_id: orderId,
                                                                        status: 'PLACED',
                                                                        notes: 'Order placed',
                                                                        created_at: new Date().toISOString()
                                                                    });

                                                                    //  DEDUCT STOCK & LOG HISTORY 
                                                                    for (const item of newOrder.items) {
                                                                        const { data: prod } = await supabase.from('products').select('stock').eq('id', item.product_id).single();
                                                                        if (prod) {
                                                                            const newStock = Math.max(0, prod.stock - item.quantity);
                                                                            await supabase.from('products').update({ stock: newStock }).eq('id', item.product_id);

                                                                            await supabase.from('product_history').insert({
                                                                                product_id: item.product_id,
                                                                                change_type: 'SALE',
                                                                                quantity_change: -item.quantity,
                                                                                new_stock: newStock,
                                                                                reason: `Admin Manual Order #${orderId}`
                                                                            });

                                                                            await supabase.rpc('increment_total_sold', { prod_id: item.product_id, qty: item.quantity });
                                                                        }
                                                                    }

                                                                    //  SEND NOTIFICATIONS 
                                                                    if (newOrder.send_notifications !== 'none') {
                                                                        try {
                                                                            const response = await fetch('/api/admin/send-order-notification', {
                                                                                method: 'POST',
                                                                                headers: { 'Content-Type': 'application/json' },
                                                                                body: JSON.stringify({
                                                                                    orderId: orderId,
                                                                                    sendWhatsApp: newOrder.send_notifications === 'both' || newOrder.send_notifications === 'whatsapp',
                                                                                    sendEmail: newOrder.send_notifications === 'both' || newOrder.send_notifications === 'email'
                                                                                })
                                                                            });

                                                                            if (response.ok) {
                                                                                const result = await response.json();
                                                                                console.log(result.message);
                                                                            } else {
                                                                                console.error('Failed to send notifications');
                                                                            }
                                                                        } catch (notifErr) {
                                                                            console.error('Error sending notifications:', notifErr);
                                                                        }
                                                                    }

                                                                    setNotification({ message: 'Manual Order Created Successfully! Stock updated.', type: 'success' });
                                                                    setIsAddingOrder(false);
                                                                    setNewOrder({
                                                                        customer_name: '',
                                                                        billing_email: '',
                                                                        billing_phone: '',
                                                                        billing_address: '',
                                                                        billing_city: '',
                                                                        billing_pincode: '',
                                                                        billing_state: 'Tamil Nadu',
                                                                        shipping_email: '',
                                                                        shipping_phone: '',
                                                                        shipping_address: '',
                                                                        shipping_city: '',
                                                                        shipping_pincode: '',
                                                                        shipping_state: 'Tamil Nadu',
                                                                        same_as_billing: true,
                                                                        payment_method: 'UPI',
                                                                        send_notifications: 'both',
                                                                        items: [],
                                                                        is_replacement: false,
                                                                        manual_shipping_cost: ''
                                                                    });
                                                                    fetchOrders();
                                                                } catch (err) {
                                                                    console.error('Manual Order Error:', err);
                                                                    setNotification({ message: `Failed to create order: ${err.message || 'Unknown error'}`, type: 'error' });
                                                                } finally {
                                                                    setIsCreatingOrder(false);
                                                                    setTimeout(() => setNotification(null), 3000);
                                                                }
                                                            }}
                                                            disabled={isCreatingOrder}
                                                            style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-dark)))', color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: '1.1rem', boxShadow: '0 10px 20px hsl(var(--primary) / 0.2)' }}
                                                        >
                                                            {isCreatingOrder ? <><Loader2 className="animate-spin" /> Placing Order...</> : 'Confirm & Place Order'}
                                                        </button>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
            </div>

            {/* Notification */}

            {notification && (
                <div style={{
                    position: 'fixed', top: '2rem', right: '2rem', zIndex: 200000,
                    padding: '1rem 2.5rem', borderRadius: '15px',
                    background: (notification.type === 'success' || notification.type === 'info') ? 'hsl(142, 70%, 45%)' : 'hsl(0, 84%, 60%)',
                    color: 'white', fontWeight: 600, boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                    display: 'flex', alignItems: 'center', gap: '10px',
                    animation: 'slideDown 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                }}>
                    <div className="animate-spin-slow">
                        {notification.type === 'info' && <Loader2 size={16} />}
                        {notification.type === 'success' && <CheckCircle size={16} />}
                        {notification.type === 'error' && <AlertCircle size={16} />}
                    </div>
                    {notification.message}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {confirmDelete && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, animation: 'fadeIn 0.2s ease' }}>
                    <div className="card shadow-premium" style={{ maxWidth: '400px', width: '90%', padding: '2.5rem 2rem', textAlign: 'center', animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)', background: '#fff', border: '1px solid hsl(var(--border-subtle))', borderRadius: '24px' }}>
                        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 10px 20px rgba(239,68,68,0.1)' }}>
                            <Trash2 size={36} />
                        </div>
                        <h3 style={{ marginBottom: '0.75rem', fontWeight: 800, fontSize: '1.5rem', color: 'hsl(var(--text-main))' }}>Confirm Delete?</h3>
                        <p style={{ color: 'hsl(var(--text-muted))', marginBottom: '2.5rem', lineHeight: 1.6, fontSize: '0.95rem' }}>
                            This action will permanently remove {confirmDelete.ids.length > 1 ? `${confirmDelete.ids.length} order records` : 'the order record'} and restore any associated stock. This cannot be undone.
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <button onClick={() => setConfirmDelete(null)} className="btn btn-secondary" style={{ padding: '0.75rem', borderRadius: '12px' }}>Keep Order</button>
                            <button onClick={handleDeleteOrderConfirmed} className="btn" style={{ background: '#ef4444', color: 'white', padding: '0.75rem', borderRadius: '12px', fontWeight: 700 }}>Delete Now</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Action Bar */}
            {selectedOrderIds.length > 0 && (
                <div className="animate-pop" style={{
                    position: 'fixed',
                    bottom: '2rem',
                    width: '60%',
                    left: 'calc(var(--sidebar-width, 280px) + (100% - var(--sidebar-width, 280px)) / 2)',
                    transform: 'translateX(-50%)',
                    background: '#1a1d21',
                    padding: '1rem 2rem',
                    borderRadius: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2rem',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                    zIndex: 1000,
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'white' }}>
                        {selectedOrderIds.length} Orders Selected
                    </div>
                    <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.2)' }} />
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button onClick={async () => {
                            setPrintMode('address');
                            setLoading(true);
                            try {
                                const { data, error } = await supabase
                                    .from('orders')
                                    .select('*')
                                    .in('id', selectedOrderIds);
                                if (error) throw error;
                                setPrintingOrders(data || []);
                                setIsPrintingLabels(true);
                            } catch (err) {
                                setNotification({ type: 'error', message: 'Failed to load orders for print' });
                            } finally {
                                setLoading(false);
                            }
                        }} style={{
                            background: 'rgba(99,102,241,0.2)',
                            border: '1px solid rgba(99,102,241,0.5)',
                            color: '#818cf8',
                            padding: '0.5rem 1.25rem',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s'
                        }}>
                            <Download size={16} /> Print Address Labels
                        </button>
                        <button onClick={async () => {
                            setPrintMode('id');
                            setLoading(true);
                            try {
                                const { data, error } = await supabase
                                    .from('orders')
                                    .select('*')
                                    .in('id', selectedOrderIds);
                                if (error) throw error;
                                setPrintingOrders(data || []);
                                setIsPrintingLabels(true);
                            } catch (err) {
                                setNotification({ type: 'error', message: 'Failed to load orders for print' });
                            } finally {
                                setLoading(false);
                            }
                        }} style={{
                            background: 'rgba(16,185,129,0.2)',
                            border: '1px solid rgba(16,185,129,0.5)',
                            color: '#10b981',
                            padding: '0.5rem 1.25rem',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s'
                        }}>
                            <Download size={16} /> Print ID Labels
                        </button>
                        <button onClick={handleBulkDelete} style={{
                            background: 'rgba(239,68,68,0.2)',
                            border: '1px solid rgba(239,68,68,0.5)',
                            color: '#f87171',
                            padding: '0.5rem 1.25rem',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s'
                        }}>
                            <Trash2 size={16} /> Delete Selected
                        </button>
                        <button onClick={() => setSelectedOrderIds([])} style={{
                            background: 'transparent',
                            border: '1px solid rgba(255,255,255,0.3)',
                            color: 'white',
                            padding: '0.5rem 1.25rem',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}
            {isPrintingLabels && (
                <div className="print-preview-modal" style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'white', overflow: 'auto' }}>
                    <div className="no-print" style={{ position: 'sticky', top: 0, padding: '1rem 2rem', background: '#f8fafc', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
                        <h2 style={{ margin: 0 }}>Print Preview ({printingOrders.length} labels)</h2>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button onClick={() => setIsPrintingLabels(false)} className="btn btn-secondary">Close Preview</button>
                            <button onClick={() => window.print()} className="btn btn-primary">Proceed to Print</button>
                        </div>
                    </div>
                    <OrderLabelPrint orders={printingOrders} mode={printMode} />
                </div>
            )}

            {/* Item Return Modal */}
            {returningItem && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div className="card shadow-premium" style={{ maxWidth: '400px', width: '90%', padding: '2rem', background: '#fff', borderRadius: '24px' }}>
                        <h3 style={{ marginBottom: '1rem', fontWeight: 800 }}>Return Item</h3>
                        <p style={{ fontSize: '0.9rem', color: 'hsl(var(--text-muted))', marginBottom: '1.5rem' }}>
                            How many units of <strong>{returningItem.product_name}</strong> are being returned?
                        </p>
                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase' }}>Return Quantity</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                                <button
                                    onClick={() => setReturnQty(q => Math.max(1, q - 1))}
                                    style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid #ddd', background: '#f9fafb', fontSize: '1.25rem', cursor: 'pointer' }}
                                >-</button>
                                <div style={{ fontSize: '1.25rem', fontWeight: 700, flex: 1, textAlign: 'center' }}>{returnQty}</div>
                                <button
                                    onClick={() => setReturnQty(q => Math.min(returningItem.quantity - (returningItem.returned_quantity || 0), q + 1))}
                                    style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid #ddd', background: '#f9fafb', fontSize: '1.25rem', cursor: 'pointer' }}
                                >+</button>
                            </div>
                            <div style={{ fontSize: '0.7rem', textAlign: 'center', marginTop: '0.5rem', color: 'hsl(var(--text-muted))' }}>
                                Max returnable: {returningItem.quantity - (returningItem.returned_quantity || 0)}
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <button onClick={() => setReturningItem(null)} className="btn btn-secondary" style={{ borderRadius: '12px' }}>Cancel</button>
                            <button onClick={handleReturnItem} className="btn" style={{ background: '#ef4444', color: 'white', fontWeight: 700, borderRadius: '12px' }}>Confirm Return</button>
                        </div>
                    </div>
                </div>
            )}


            {showShippingForm && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px' }}>
                    <div className="card animate-pop" style={{ width: '100%', maxWidth: '480px', background: 'white', padding: '2rem', borderRadius: '28px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900 }}>Select Courier Partner</h3>
                            <button onClick={() => { setShowShippingForm(false); if (isCourierFromTable) { setSelectedOrder(null); } setIsCourierFromTable(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))' }}>Choose Partner <span style={{ color: 'hsl(var(--danger))' }}>*</span></label>
                                <select
                                    value={selectedCourierId}
                                    required
                                    onChange={(e) => {
                                        const cid = e.target.value;
                                        setSelectedCourierId(cid);
                                        setCourierModalError('');
                                        const courier = couriers.find(c => c.id === cid);
                                        if (courier) {
                                            const awb = shippingForm.tracking_number || '';
                                            setShippingForm({
                                                ...shippingForm,
                                                courier_name: courier.name,
                                                courier_phone: courier.phone || '',
                                                courier_email: courier.email || '',
                                                tracking_url: courier.tracking_url_template ? courier.tracking_url_template.replace(/\{[^}]+\}/g, awb) : ''
                                            });
                                        }
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        background: '#f8fafc',
                                        border: (courierModalError && (!selectedCourierId || !shippingForm.courier_name?.trim())) ? '1px solid #ef4444' : '1px solid hsl(var(--border-subtle))',
                                        borderRadius: '12px',
                                        color: 'hsl(var(--text-main))',
                                        fontSize: '0.9rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="">-- Select Courier --</option>
                                    {couriers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    <option value="CUSTOM">Custom Courier</option>
                                </select>
                                {courierModalError && (!selectedCourierId || !shippingForm.courier_name?.trim()) && (
                                    <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600, marginTop: '2px' }}>Please select a courier partner</span>
                                )}
                            </div>

                            {selectedCourierId === 'CUSTOM' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))' }}>Courier Name <span style={{ color: 'hsl(var(--danger))' }}>*</span></label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Local Express"
                                        required
                                        value={shippingForm.courier_name}
                                        onChange={e => {
                                            setShippingForm({ ...shippingForm, courier_name: e.target.value });
                                            setCourierModalError('');
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            background: '#f8fafc',
                                            border: (courierModalError && !shippingForm.courier_name?.trim()) ? '1px solid #ef4444' : '1px solid hsl(var(--border-subtle))',
                                            borderRadius: '12px',
                                            color: 'hsl(var(--text-main))',
                                            fontSize: '0.9rem'
                                        }}
                                    />
                                    {courierModalError && !shippingForm.courier_name?.trim() && (
                                        <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600, marginTop: '2px' }}>Courier name is required</span>
                                    )}
                                </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))' }}>AWB / Tracking ID <span style={{ color: 'hsl(var(--danger))' }}>*</span></label>
                                <input
                                    type="text"
                                    placeholder="Enter ID"
                                    required
                                    value={shippingForm.tracking_number}
                                    onChange={e => {
                                        const awb = e.target.value;
                                        setCourierModalError('');
                                        const courier = couriers.find(c => c.id === selectedCourierId);
                                        setShippingForm({
                                            ...shippingForm,
                                            tracking_number: awb,
                                            tracking_url: courier && courier.tracking_url_template ? courier.tracking_url_template.replace(/\{[^}]+\}/g, awb) : shippingForm.tracking_url
                                        });
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        background: '#f8fafc',
                                        border: (courierModalError && !shippingForm.tracking_number?.trim()) ? '1px solid #ef4444' : '1px solid hsl(var(--border-subtle))',
                                        borderRadius: '12px',
                                        color: 'hsl(var(--text-main))',
                                        fontSize: '0.9rem'
                                    }}
                                />
                                {courierModalError && !shippingForm.tracking_number?.trim() && (
                                    <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600, marginTop: '2px' }}>AWB / Tracking ID is required</span>
                                )}
                            </div>

                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                            <button onClick={() => { setShowShippingForm(false); if (isCourierFromTable) { setSelectedOrder(null); } setIsCourierFromTable(false); setCourierModalError(''); }} className="btn btn-secondary" style={{ padding: '0.8rem' }}>
                                {isCourierSaved ? 'Close' : 'Cancel'}
                            </button>
                            {!isCourierSaved ? (
                                <button
                                    onClick={async () => {
                                        if (!selectedOrder) return;

                                        // Validation: Check Partner selection & AWB/Tracking ID
                                        if (!selectedCourierId || !shippingForm.courier_name?.trim()) {
                                            setCourierModalError('Please choose a courier partner.');
                                            setNotification({ message: 'Please select a courier partner first.', type: 'error' });
                                            return;
                                        }

                                        if (!shippingForm.tracking_number || !shippingForm.tracking_number.trim()) {
                                            setCourierModalError('AWB / Tracking ID is required.');
                                            setNotification({ message: 'AWB / Tracking ID is required. Please fill in the Tracking ID.', type: 'error' });
                                            return;
                                        }

                                        setCourierModalError('');
                                        setSavingCourier(true);

                                        // Loading Toast Notification
                                        setNotification({ message: 'Saving courier details & updating order status...', type: 'info' });

                                        try {
                                            const token = localStorage.getItem('cast_prince_admin') || '';
                                            const response = await fetch('/api/orders/update-status', {
                                                method: 'POST',
                                                headers: {
                                                    'Content-Type': 'application/json',
                                                    'Authorization': `Bearer ${token}`
                                                },
                                                body: JSON.stringify({
                                                    orderId: selectedOrder.id,
                                                    status: 'SHIPPED',
                                                    courierName: shippingForm.courier_name.trim(),
                                                    trackingNumber: shippingForm.tracking_number.trim(),
                                                    trackingUrl: shippingForm.tracking_url,
                                                    notes: `Shipped via ${shippingForm.courier_name.trim()}`
                                                })
                                            });

                                            if (!response.ok) {
                                                const errData = await response.json();
                                                throw new Error(errData.error || 'Failed to update status');
                                            }

                                            setSelectedOrder(prev => ({
                                                ...prev,
                                                courier_name: shippingForm.courier_name.trim(),
                                                tracking_number: shippingForm.tracking_number.trim(),
                                                tracking_url: shippingForm.tracking_url,
                                                status: 'SHIPPED'
                                            }));

                                            // Success Toast Notification
                                            setNotification({ message: 'Tracking ID saved & Order status updated to SHIPPED successfully!', type: 'success' });
                                            setIsCourierSaved(true);
                                            fetchOrders();
                                        } catch (err) {
                                            console.error('Courier save error:', err);
                                            setNotification({ message: `Save failed: ${err.message || 'Unknown error'}`, type: 'error' });
                                        } finally {
                                            setSavingCourier(false);
                                            setTimeout(() => setNotification(null), 4000);
                                        }
                                    }}
                                    disabled={savingCourier}
                                    className="btn btn-primary"
                                    style={{ padding: '0.8rem', background: 'hsl(var(--success))', border: 'none' }}
                                >
                                    {savingCourier ? <Loader2 size={16} className="animate-spin" /> : 'Save Courier Info'}
                                </button>
                            ) : (
                                <button
                                    onClick={() => {
                                        setShowShippingForm(false);
                                        const phoneToUse = selectedOrder.customer_phone || (typeof selectedOrder.billing_address === 'object' ? selectedOrder.billing_address?.phone : null) || '';
                                        const bEmail = selectedOrder.billing_email || (typeof selectedOrder.billing_address === 'object' ? selectedOrder.billing_address?.email : null) || selectedOrder.customer_email || '';
                                        const sEmail = selectedOrder.shipping_email || (typeof selectedOrder.shipping_address === 'object' ? selectedOrder.shipping_address?.email : null) || '';
                                        const emailToUse = bEmail || sEmail;
                                        
                                        setNotificationPhone(formatDisplayPhoneNumber(phoneToUse));
                                        setNotificationEmail(emailToUse);
                                        setSendWhatsAppChecked(true);
                                        setSendEmailChecked(true);
                                        setShowSendNotificationModal(true);
                                    }}
                                    className="btn btn-primary animate-pop"
                                    style={{ padding: '0.8rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                >
                                    <Send size={16} /> Send Info
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showSendNotificationModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px' }}>
                    <div className="card animate-pop" style={{ width: '100%', maxWidth: '480px', background: 'white', padding: '2rem', borderRadius: '28px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Send size={20} style={{ color: 'hsl(var(--primary))' }} /> Send Notification
                            </h3>
                            <button onClick={() => { setShowSendNotificationModal(false); if (isCourierFromTable) { setSelectedOrder(null); } setIsCourierFromTable(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* WhatsApp Checkbox & input */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, color: 'hsl(var(--text-main))' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={sendWhatsAppChecked} 
                                        onChange={(e) => setSendWhatsAppChecked(e.target.checked)} 
                                        style={{ width: '18px', height: '18px', accentColor: '#10b981', cursor: 'pointer' }}
                                    />
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <MessageCircle size={16} style={{ color: '#10b981' }} /> WhatsApp
                                    </span>
                                </label>
                                {sendWhatsAppChecked && (
                                    <input 
                                        type="text" 
                                        value={notificationPhone} 
                                        onChange={(e) => setNotificationPhone(e.target.value)} 
                                        placeholder="WhatsApp Phone Number"
                                        style={{ 
                                            width: '100%', 
                                            padding: '0.75rem', 
                                            background: '#f8fafc', 
                                            border: '1px solid hsl(var(--border-subtle))', 
                                            borderRadius: '12px', 
                                            fontSize: '0.9rem',
                                            color: 'hsl(var(--text-main))',
                                            outline: 'none'
                                        }}
                                    />
                                )}
                            </div>

                            {/* Email Checkbox & input */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, color: 'hsl(var(--text-main))' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={sendEmailChecked} 
                                        onChange={(e) => setSendEmailChecked(e.target.checked)} 
                                        style={{ width: '18px', height: '18px', accentColor: 'hsl(var(--primary))', cursor: 'pointer' }}
                                    />
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Mail size={16} style={{ color: 'hsl(var(--primary))' }} /> Email
                                    </span>
                                </label>
                                {sendEmailChecked && (
                                    <input 
                                        type="text" 
                                        value={notificationEmail} 
                                        onChange={(e) => setNotificationEmail(e.target.value)} 
                                        placeholder="Email Address"
                                        style={{ 
                                            width: '100%', 
                                            padding: '0.75rem', 
                                            background: '#f8fafc', 
                                            border: '1px solid hsl(var(--border-subtle))', 
                                            borderRadius: '12px', 
                                            fontSize: '0.9rem',
                                            color: 'hsl(var(--text-main))',
                                            outline: 'none'
                                        }}
                                    />
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                            <button onClick={() => { setShowSendNotificationModal(false); if (isCourierFromTable) { setSelectedOrder(null); } setIsCourierFromTable(false); }} className="btn btn-secondary" style={{ padding: '0.8rem' }}>Cancel</button>
                            <button
                                onClick={async () => {
                                    await handleSendManualNotifications();
                                    if (isCourierFromTable) {
                                        setSelectedOrder(null);
                                    }
                                    setIsCourierFromTable(false);
                                }}
                                className="btn btn-primary"
                                disabled={loading || (!sendWhatsAppChecked && !sendEmailChecked)}
                                style={{ padding: '0.8rem', background: 'hsl(var(--primary))', border: 'none' }}
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Send'}
                            </button>
                        </div>
                    </div>
                </div>
            )}


            <style jsx>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes expand { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 2000px; } }
                .animate-expand { animation: expand 0.4s ease-out; overflow: hidden; }
                .card-sub { box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
                .btn-wa-link { 
                    display: inline-flex; align-items: center; gap: 0.5rem; 
                    padding: 0.6rem 1rem; background: hsl(var(--primary))15; color: hsl(var(--primary)); 
                    border: 1px solid hsl(var(--primary))30; border-radius: 8px; font-weight: 700; 
                    font-size: 0.85rem; text-decoration: none; transition: 0.2s;
                }
                .btn-wa-link:hover { background: hsl(var(--primary))25; transform: translateY(-1px); }
                .badge-btn { 
                    padding: 0.4rem 0.8rem; border-radius: 99px; font-size: 0.75rem; 
                    font-weight: 700; cursor: pointer; border: none; transition: 0.2s;
                    margin-right: 0.5rem; margin-bottom: 0.5rem;
                }
                .badge-inactive { background: hsl(var(--bg-app)); color: hsl(var(--text-muted)); border: 1px solid hsl(var(--border-subtle)); }
                .btn-save-sm { 
                    width: 100%; margin-top: 1rem; padding: 0.6rem; 
                    background: hsl(var(--primary)); color: white; border: none; 
                    border-radius: 8px; font-weight: 700; cursor: pointer;
                }
                @media (max-width: 768px) {
                    .admin-header-row { flex-direction: column; align-items: stretch !important; gap: 1rem; }
                    .admin-filter-row { overflow-x: auto; white-space: nowrap; padding-bottom: 0.5rem; }
                    .admin-filter-row::-webkit-scrollbar { display: none; }
                    .card { overflow: visible !important; }
                    table { min-width: 800px; }
                }
                @media print {
                    .no-print { display: none !important; }
                    html, body { 
                        margin: 0 !important; 
                        padding: 0 !important; 
                        background: white !important;
                        height: auto !important;
                        overflow: visible !important;
                    }
                    .print-preview-modal { 
                        position: static !important; 
                        display: block !important;
                        width: 100% !important;
                        height: auto !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        overflow: visible !important;
                    }
                    /* Ensure parents don't constrain or add space */
                    .admin-layout, .main-content, .animate-enter, .admin-layout > div {
                        display: block !important;
                        height: auto !important;
                        min-height: 0 !important;
                        overflow: visible !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        position: static !important;
                    }
                }
            `}</style>

            {/* Quick Order Info Modal Portal */}
            {infoModalOrder && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 }}>
                    <div className="animate-enter card shadow-premium" style={{ padding: '0', maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: '16px' }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid hsl(var(--border-subtle))', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Order {formatOrderInvoice(infoModalOrder)}</h3>
                                <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>Placed on {toIST(infoModalOrder.created_at)}</div>
                            </div>
                            <button onClick={() => setInfoModalOrder(null)} className="btn btn-secondary" style={{ padding: '0.5rem' }}><X size={18} /></button>
                        </div>
                        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1.25rem' }}>
                                <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))' }}>
                                    <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.75rem', fontWeight: 700, letterSpacing: '0.5px' }}>Customer Overview</div>
                                    <div style={{ fontWeight: 700, fontSize: '1rem', wordBreak: 'break-word', color: 'hsl(var(--text-main))' }}>{infoModalOrder.customer_name || 'Guest'}</div>
                                    <div style={{ fontSize: '0.85rem', marginTop: '6px', fontWeight: 500 }}>{formatDisplayPhoneNumber(infoModalOrder.customer_phone)}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', wordBreak: 'break-all', marginTop: '2px' }}>{infoModalOrder.customer_email || 'No email provided'}</div>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.2rem', fontWeight: 700, letterSpacing: '0.5px' }}>Order Status</div>
                                    <div><span className={`badge ${getStatusReference(infoModalOrder.status)}`} style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>{infoModalOrder.status}</span></div>
                                    <div style={{ marginTop: '0.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', fontWeight: 500 }}>Total Price :</div>
                                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'hsl(var(--success))' }}>₹{(infoModalOrder.total_amount || 0).toLocaleString('en-IN')}</div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', fontWeight: 500 }}>Payment Method :</div>
                                        <div style={{ fontWeight: 700, color: 'hsl(var(--text-main))', fontSize: '0.85rem' }}>{infoModalOrder.payment_method || '—'}</div>
                                    </div>
                                </div>
                            </div>
                            
                            {infoModalOrder.items ? (
                                <div>
                                    <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 700, letterSpacing: '0.5px' }}>Order Items</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {infoModalOrder.items.map((item, idx) => (
                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))' }}>
                                                <img 
                                                    src={getItemImageUrl(item)} 
                                                    alt={item.product_name || 'Product'} 
                                                    style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '8px', border: '1px solid hsl(var(--border-subtle))', flexShrink: 0 }} 
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=100&q=80';
                                                    }}
                                                />
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: '0.9rem', fontWeight: 700, wordBreak: 'break-word', color: 'hsl(var(--text-main))', lineHeight: '1.2' }}>{item.product_name}</div>
                                                    {item.variant_name && <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginTop: '4px' }}>{item.variant_name}</div>}
                                                </div>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 800, flexShrink: 0, whiteSpace: 'nowrap', color: 'hsl(var(--success))' }}>{item.quantity} x ₹{Number(item.price_at_time || item.price || 0).toLocaleString('en-IN')}</div>
                                            </div>
                                        ))}
                                        {infoModalOrder.items.length === 0 && <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', textAlign: 'center', padding: '1rem' }}>No items found.</div>}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '2rem' }}><Loader2 size={24} className="animate-spin" style={{ color: 'hsl(var(--text-muted))', margin: '0 auto' }} /></div>
                            )}

                            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))' }}>
                                <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.75rem', fontWeight: 700, letterSpacing: '0.5px' }}>Shipping Address</div>
                                <div style={{ fontSize: '0.9rem', wordBreak: 'break-word', color: 'hsl(var(--text-main))' }}>
                                    {(() => {
                                        let addr = infoModalOrder.shipping_address || infoModalOrder.delivery_address;
                                        if (typeof addr === 'string' && addr.trim().startsWith('{')) {
                                            try { addr = JSON.parse(addr); } catch(e) {}
                                        }
                                        if (typeof addr === 'object' && addr !== null) {
                                            return (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <div style={{ fontWeight: 700 }}>{addr.name || infoModalOrder.customer_name}</div>
                                                    {(addr.mobile || addr.phone) && <div style={{ fontSize: '0.85rem' }}>Mobile: {formatDisplayPhoneNumber(addr.mobile || addr.phone)}</div>}
                                                    {addr.email && <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', wordBreak: 'break-all' }}>{addr.email}</div>}
                                                    <div style={{ marginTop: '0.5rem', lineHeight: '1.5', color: 'hsl(var(--text-main))' }}>
                                                        {[addr.address, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ')}
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return <div style={{ whiteSpace: 'pre-line', lineHeight: '1.5' }}>{String(addr || 'Same as billing')}</div>;
                                    })()}
                                </div>
                            </div>

                            {(() => {
                                const courierInfo = parseCourierDetails(infoModalOrder);
                                if (!courierInfo.name && !courierInfo.trackingNumber) return null;
                                return (
                                    <div>
                                        <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 700, letterSpacing: '0.5px' }}>Logistics Details</div>
                                        <div style={{ fontSize: '0.85rem', background: 'hsl(var(--primary) / 0.05)', padding: '1rem', borderRadius: '12px', border: '1px dashed hsl(var(--primary) / 0.3)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                                <div style={{ fontWeight: 700, color: 'hsl(var(--primary))', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Truck size={16} /> Courier: {courierInfo.name || 'Dispatched'}
                                                </div>
                                                {courierInfo.trackingUrl && (
                                                    <a
                                                        href={courierInfo.trackingUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        style={{
                                                            fontSize: '0.75rem',
                                                            fontWeight: 700,
                                                            color: '#ffffff',
                                                            background: 'hsl(var(--primary))',
                                                            padding: '4px 10px',
                                                            borderRadius: '6px',
                                                            textDecoration: 'none',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}
                                                    >
                                                        <ExternalLink size={12} /> Track Package
                                                    </a>
                                                )}
                                            </div>
                                            {courierInfo.trackingNumber && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                    <span style={{ color: 'hsl(var(--text-muted))', fontWeight: 600 }}>AWB Track ID:</span> 
                                                    <span style={{ fontFamily: 'var(--font-roboto)', fontWeight: 800, background: 'hsl(var(--text-main))', color: 'white', padding: '3px 8px', borderRadius: '4px', letterSpacing: '1px', fontSize: '0.85rem' }}>
                                                        {courierInfo.trackingNumber}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

