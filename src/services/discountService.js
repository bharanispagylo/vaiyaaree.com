import { mysqlClient } from '../lib/mysqlClient.js';

function isRuleActiveByDate(startDateStr, endDateStr) {
    const now = new Date();

    if (startDateStr) {
        const start = new Date(startDateStr);
        if (!isNaN(start.getTime())) {
            // Allow 12-hour grace tolerance for UTC vs local timezone string parsing / clock skew
            const bufferedStart = new Date(start.getTime() - 12 * 60 * 60 * 1000);
            if (now < bufferedStart) {
                return { active: false, reason: 'NOT_STARTED' };
            }
        }
    }

    if (endDateStr) {
        let end = new Date(endDateStr);
        if (!isNaN(end.getTime())) {
            if (typeof endDateStr === 'string' && !endDateStr.includes(':')) {
                end.setHours(23, 59, 59, 999);
            }
            if (now > end) {
                return { active: false, reason: 'EXPIRED' };
            }
        }
    }

    return { active: true };
}

/**
 * Calculates discounts centrally for cart items, customer, and coupon code.
 * Reused across client state, checkout preview, order placement, payment, and refund allocation.
 * 
 * @param {object} params
 * @param {Array} params.cartItems - Array of { id, price, qty, name, category, variantId }
 * @param {number} [params.subtotal] - Pre-calculated subtotal
 * @param {number} [params.shippingCost] - Pre-calculated shipping cost
 * @param {string} [params.couponCode] - Coupon code entered by customer
 * @param {object} [params.customer] - Customer object or { id, phone }
 * @returns {Promise<object>} Complete discount calculation snapshot
 */
export async function calculateDiscounts({
    cartItems = [],
    subtotal: inputSubtotal = null,
    shippingCost: inputShippingCost = 0,
    couponCode = null,
    customer = null
}) {
    // 1. Calculate raw subtotal from cart items
    const cart = Array.isArray(cartItems) ? cartItems : [];
    const subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.price || 0) * parseInt(item.qty || 1, 10)), 0);
    const shippingCost = Math.max(0, parseFloat(inputShippingCost || 0));

    let productDiscount = 0;
    let cartDiscount = 0;
    let couponDiscount = 0;
    let shippingDiscount = 0;
    const appliedRules = [];

    if (cart.length === 0 || subtotal <= 0) {
        return {
            subtotal: 0,
            productDiscount: 0,
            cartDiscount: 0,
            couponDiscount: 0,
            shippingDiscount: 0,
            totalDiscount: 0,
            shipping: shippingCost,
            taxableAmount: 0,
            finalTotal: shippingCost,
            discountedItems: [],
            appliedRules: [],
            appliedCouponCode: null
        };
    }

    try {
        const nowStr = new Date().toISOString();

        // 2. Fetch all active discount rules
        const { data: rulesData, error: rulesError } = await mysqlClient
            .from('discount_rules')
            .select('*')
            .eq('is_active', true)
            .order('priority', { ascending: false });

        if (rulesError || !rulesData || rulesData.length === 0) {
            return buildResult({ subtotal, shippingCost, cart, productDiscount: 0, cartDiscount: 0, couponDiscount: 0, shippingDiscount: 0, appliedRules: [], appliedCouponCode: null });
        }

        // Fetch targets & conditions for all active rules concurrently
        const ruleIds = rulesData.map(r => r.id);
        const [productsRes, categoriesRes, customersRes] = await Promise.all([
            mysqlClient.from('discount_rule_products').select('*').in('discount_rule_id', ruleIds),
            mysqlClient.from('discount_rule_categories').select('*').in('discount_rule_id', ruleIds),
            mysqlClient.from('discount_rule_customers').select('*').in('discount_rule_id', ruleIds)
        ]);

        const ruleProductsMap = new Map();
        (productsRes.data || []).forEach(rp => {
            if (!ruleProductsMap.has(rp.discount_rule_id)) ruleProductsMap.set(rp.discount_rule_id, new Set());
            ruleProductsMap.get(rp.discount_rule_id).add(rp.product_id);
        });

        const ruleCategoriesMap = new Map();
        (categoriesRes.data || []).forEach(rc => {
            if (!ruleCategoriesMap.has(rc.discount_rule_id)) ruleCategoriesMap.set(rc.discount_rule_id, new Set());
            ruleCategoriesMap.get(rc.discount_rule_id).add(rc.category.trim().toLowerCase());
        });

        const ruleCustomersMap = new Map();
        (customersRes.data || []).forEach(rcu => {
            if (!ruleCustomersMap.has(rcu.discount_rule_id)) ruleCustomersMap.set(rcu.discount_rule_id, new Set());
            ruleCustomersMap.get(rcu.discount_rule_id).add(rcu.customer_id);
        });

        const normalizedCoupon = (couponCode || '').trim().toUpperCase();
        let nonStackableApplied = false;

        // 3. Evaluate rules in order of priority
        for (const rule of rulesData) {
            // Check start/end dates with clock-skew tolerance
            const dateCheck = isRuleActiveByDate(rule.start_date, rule.end_date);
            if (!dateCheck.active) continue;

            // Check minimum cart subtotal
            const minCart = parseFloat(rule.minimum_cart_amount || 0);
            if (minCart > 0 && subtotal < minCart) continue;

            // Check customer specific target
            if (rule.target_type === 'SPECIFIC_CUSTOMERS') {
                const allowedCustomers = ruleCustomersMap.get(rule.id);
                if (!allowedCustomers || !customer?.id || !allowedCustomers.has(customer.id)) continue;
            }

            // Check stackability guard
            if (nonStackableApplied && (!rule.stackable || rule.stackable === 0 || rule.stackable === false)) {
                continue;
            }

            // Check if rule is a coupon rule
            const isCouponRule = Boolean(rule.coupon_code && rule.coupon_code.trim() !== '');
            if (isCouponRule) {
                if (!normalizedCoupon || rule.coupon_code.trim().toUpperCase() !== normalizedCoupon) {
                    continue; // Skip coupon rule if coupon code doesn't match
                }
            }

            // 4. Calculate discount amount for this rule
            let ruleDiscount = 0;

            // Determine eligible items in cart for this rule
            let eligibleCartItems = cart;
            if (rule.target_type === 'SPECIFIC_PRODUCTS') {
                const allowedProds = ruleProductsMap.get(rule.id) || new Set();
                eligibleCartItems = cart.filter(i => allowedProds.has(i.id));
            } else if (rule.target_type === 'SPECIFIC_CATEGORIES') {
                const allowedCats = ruleCategoriesMap.get(rule.id) || new Set();
                eligibleCartItems = cart.filter(i => i.category && allowedCats.has(i.category.trim().toLowerCase()));
            }

            const eligibleQuantity = eligibleCartItems.reduce((sum, item) => sum + parseInt(item.qty || 1, 10), 0);
            const targetSubtotal = eligibleCartItems.reduce((s, i) => s + (parseFloat(i.price || 0) * parseInt(i.qty || 1, 10)), 0);

            if (targetSubtotal <= 0) continue;

            // Check minimum cart products condition if enabled
            const minProdsEnabled = rule.minimum_cart_products_enabled === 1 || rule.minimum_cart_products_enabled === true;
            const minProdsReq = rule.minimum_cart_products ? parseInt(rule.minimum_cart_products, 10) : 0;

            if (minProdsEnabled && minProdsReq > 0) {
                if (eligibleQuantity < minProdsReq) {
                    continue; // Skip rule: Cart does not meet the minimum required eligible units (e.g. 2 < 3)
                }
            }

            const val = parseFloat(rule.discount_value || 0);
            if (rule.discount_type === 'PERCENTAGE') {
                ruleDiscount = (val / 100) * targetSubtotal;
            } else if (rule.discount_type === 'FIXED' || rule.discount_type === 'FIXED_AMOUNT') {
                ruleDiscount = Math.min(val, targetSubtotal);
            } else if (rule.discount_type === 'FREE_SHIPPING') {
                shippingDiscount = shippingCost;
                ruleDiscount = 0;
            }

            ruleDiscount = Math.round(ruleDiscount * 100) / 100;

            if (ruleDiscount > 0 || rule.discount_type === 'FREE_SHIPPING') {
                if (isCouponRule) {
                    couponDiscount += ruleDiscount;
                } else if (rule.target_type === 'SPECIFIC_PRODUCTS' || rule.target_type === 'SPECIFIC_CATEGORIES') {
                    productDiscount += ruleDiscount;
                } else {
                    cartDiscount += ruleDiscount;
                }

                appliedRules.push({
                    id: rule.id,
                    name: rule.name,
                    couponCode: rule.coupon_code || null,
                    discountType: rule.discount_type,
                    discountValue: val,
                    discountAmount: ruleDiscount,
                    isCoupon: isCouponRule
                });

                if (!rule.stackable || rule.stackable === 0 || rule.stackable === false) {
                    nonStackableApplied = true;
                }
            }
        }

        return buildResult({ subtotal, shippingCost, cart, productDiscount, cartDiscount, couponDiscount, shippingDiscount, appliedRules, appliedCouponCode: normalizedCoupon });

    } catch (err) {
        console.error('[DISCOUNT SERVICE ERROR]', err);
        return buildResult({ subtotal, shippingCost, cart, productDiscount: 0, cartDiscount: 0, couponDiscount: 0, shippingDiscount: 0, appliedRules: [], appliedCouponCode: null });
    }
}

/**
 * Validates a coupon code specifically and returns structured feedback.
 */
export async function validateCouponCode(couponCode, { subtotal = 0, cartItems = [], customer = null } = {}) {
    const code = (couponCode || '').trim().toUpperCase();
    if (!code) {
        return { valid: false, message: 'Please enter a coupon code.' };
    }

    const { data: rule, error } = await mysqlClient
        .from('discount_rules')
        .select('*')
        .eq('coupon_code', code)
        .eq('is_active', true)
        .maybeSingle();

    if (error || !rule) {
        return { valid: false, message: 'Invalid coupon code.' };
    }

    const dateCheck = isRuleActiveByDate(rule.start_date, rule.end_date);
    if (!dateCheck.active) {
        if (dateCheck.reason === 'NOT_STARTED') {
            return { valid: false, message: 'This coupon is not active yet.' };
        }
        if (dateCheck.reason === 'EXPIRED') {
            return { valid: false, message: 'This coupon code has expired.' };
        }
    }

    const minCart = parseFloat(rule.minimum_cart_amount || 0);
    if (minCart > 0 && subtotal < minCart) {
        return { valid: false, message: `Coupon requires a minimum cart subtotal of ₹${minCart.toLocaleString()}.` };
    }

    const minProdsEnabled = rule.minimum_cart_products_enabled === 1 || rule.minimum_cart_products_enabled === true;
    const minProdsReq = rule.minimum_cart_products ? parseInt(rule.minimum_cart_products, 10) : 0;
    if (minProdsEnabled && minProdsReq > 0 && Array.isArray(cartItems)) {
        let eligibleCartItems = cartItems;
        if (rule.target_type === 'SPECIFIC_PRODUCTS') {
            const { data: prods } = await mysqlClient.from('discount_rule_products').select('product_id').eq('discount_rule_id', rule.id);
            const allowedProds = new Set((prods || []).map(p => p.product_id));
            eligibleCartItems = cartItems.filter(i => allowedProds.has(i.id));
        } else if (rule.target_type === 'SPECIFIC_CATEGORIES') {
            const { data: cats } = await mysqlClient.from('discount_rule_categories').select('category').eq('discount_rule_id', rule.id);
            const allowedCats = new Set((cats || []).map(c => c.category.trim().toLowerCase()));
            eligibleCartItems = cartItems.filter(i => i.category && allowedCats.has(i.category.trim().toLowerCase()));
        }

        const eligibleQty = eligibleCartItems.reduce((sum, i) => sum + parseInt(i.qty || 1, 10), 0);
        if (eligibleQty < minProdsReq) {
            return { valid: false, message: `Coupon requires a minimum of ${minProdsReq} eligible product units in cart.` };
        }
    }

    return {
        valid: true,
        rule,
        message: `Coupon "${rule.name}" applied successfully!`
    };
}

/**
 * Helper to build result object and proportionally allocate discounts across items.
 */
function buildResult({ subtotal, shippingCost, cart, productDiscount, cartDiscount, couponDiscount, shippingDiscount, appliedRules, appliedCouponCode }) {
    const totalDiscount = Math.min(subtotal, Math.round((productDiscount + cartDiscount + couponDiscount) * 100) / 100);
    const finalShipping = Math.max(0, shippingCost - shippingDiscount);

    // Proportional item discount allocation (vital for accurate return refunds!)
    const discountedItems = cart.map(item => {
        const itemLineSubtotal = parseFloat(item.price || 0) * parseInt(item.qty || 1, 10);
        const itemShare = subtotal > 0 ? (itemLineSubtotal / subtotal) : 0;
        const itemTotalDiscount = Math.round((totalDiscount * itemShare) * 100) / 100;
        const itemEffectiveSubtotal = Math.max(0, itemLineSubtotal - itemTotalDiscount);
        const itemPaidUnitPrice = item.qty > 0 ? Math.round((itemEffectiveSubtotal / item.qty) * 100) / 100 : 0;

        return {
            ...item,
            lineSubtotal: itemLineSubtotal,
            allocatedDiscount: itemTotalDiscount,
            effectiveLineSubtotal: itemEffectiveSubtotal,
            paidUnitPrice: itemPaidUnitPrice
        };
    });

    const taxableAmount = Math.max(0, subtotal - totalDiscount);
    const finalTotal = taxableAmount + finalShipping;

    return {
        subtotal,
        productDiscount,
        cartDiscount,
        couponDiscount,
        shippingDiscount,
        totalDiscount,
        shipping: finalShipping,
        originalShipping: shippingCost,
        taxableAmount,
        finalTotal,
        discountedItems,
        appliedRules,
        appliedCouponCode: appliedCouponCode || null
    };
}
