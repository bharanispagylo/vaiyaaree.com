import { mysqlClient } from '../lib/mysqlClient.js';
import { parseDateToUTC } from '../lib/dateUtils.js';

export function isRuleActiveByDate(startDateStr, endDateStr) {
    const now = new Date();

    const isZeroOrEmpty = (val) => {
        if (!val) return true;
        if (val instanceof Date) {
            return isNaN(val.getTime()) || val.getFullYear() <= 1970;
        }
        const s = String(val).trim();
        return s === '' || s === '0' || s.startsWith('0000-00-00') || s.startsWith('1970-01-01');
    };

    if (startDateStr && !isZeroOrEmpty(startDateStr)) {
        const start = startDateStr instanceof Date ? startDateStr : parseDateToUTC(startDateStr);
        if (start && !isNaN(start.getTime()) && start.getFullYear() > 1970) {
            if (now < start) {
                return { active: false, reason: 'NOT_STARTED' };
            }
        }
    }

    if (endDateStr && !isZeroOrEmpty(endDateStr)) {
        let end = endDateStr instanceof Date ? endDateStr : parseDateToUTC(endDateStr);
        if (end && !isNaN(end.getTime()) && end.getFullYear() > 1970) {
            if (typeof endDateStr === 'string' && !endDateStr.includes(':')) {
                // If only date is provided (YYYY-MM-DD), set to end of day in IST (+ 23h 59m 59s 999ms)
                end = new Date(end.getTime() + (23 * 3600 + 59 * 60 + 59) * 1000 + 999);
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

    // Ensure all cart items have a category populated if available in products table
    const itemsNeedingCategory = cart.filter(i => !i.category && (i.id || i.product_id));
    if (itemsNeedingCategory.length > 0) {
        try {
            const prodIds = Array.from(new Set(itemsNeedingCategory.map(i => String(i.id || i.product_id).trim())));
            const { data: dbProds } = await mysqlClient.from('products').select('id, category').in('id', prodIds);
            if (dbProds && dbProds.length > 0) {
                const catMap = new Map(dbProds.map(p => [String(p.id).trim(), p.category]));
                cart.forEach(i => {
                    if (!i.category) {
                        const c = catMap.get(String(i.id || i.product_id).trim());
                        if (c) i.category = c;
                    }
                });
            }
        } catch (catErr) {
            console.warn('[calculateDiscounts] Category hydration error:', catErr);
        }
    }

    let productDiscount = 0;
    let cartDiscount = 0;
    let couponDiscount = 0;
    let shippingDiscount = 0;
    const appliedRules = [];
    const itemProductDiscounts = new Array(cart.length).fill(0);

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
        const { data: allRules, error: rulesError } = await mysqlClient
            .from('discount_rules')
            .select('*')
            .order('priority', { ascending: false });

        if (rulesError || !allRules || allRules.length === 0) {
            return buildResult({ subtotal, shippingCost, cart, productDiscount: 0, cartDiscount: 0, couponDiscount: 0, shippingDiscount: 0, appliedRules: [], appliedCouponCode: null, itemProductDiscounts });
        }

        // Strictly filter for active rules
        const rulesData = allRules.filter(r => r.is_active === 1 || r.is_active === true || r.is_active === '1');

        if (rulesData.length === 0) {
            return buildResult({ subtotal, shippingCost, cart, productDiscount: 0, cartDiscount: 0, couponDiscount: 0, shippingDiscount: 0, appliedRules: [], appliedCouponCode: null, itemProductDiscounts });
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
            ruleProductsMap.get(rp.discount_rule_id).add(String(rp.product_id).trim());
        });

        const ruleCategoriesMap = new Map();
        (categoriesRes.data || []).forEach(rc => {
            if (!ruleCategoriesMap.has(rc.discount_rule_id)) ruleCategoriesMap.set(rc.discount_rule_id, new Set());
            ruleCategoriesMap.get(rc.discount_rule_id).add(String(rc.category || '').trim().toLowerCase());
        });

        const ruleCustomersMap = new Map();
        (customersRes.data || []).forEach(rcu => {
            if (!ruleCustomersMap.has(rcu.discount_rule_id)) ruleCustomersMap.set(rcu.discount_rule_id, new Set());
            ruleCustomersMap.get(rcu.discount_rule_id).add(String(rcu.customer_id).trim());
        });

        let normalizedCoupon = (couponCode || '').trim().toUpperCase();

        // If no coupon code was explicitly passed, auto-apply the best eligible coupon offer
        if (!normalizedCoupon && couponCode !== 'NONE') {
            const activeEligibleCouponRules = rulesData.filter(r => {
                if (!r.coupon_code || !r.coupon_code.trim()) return false;
                const dateCheck = isRuleActiveByDate(r.start_date, r.end_date);
                if (!dateCheck.active) return false;

                if (r.target_type === 'SPECIFIC_CUSTOMERS') {
                    const allowedCusts = ruleCustomersMap.get(r.id);
                    if (!allowedCusts || !customer?.id || !allowedCusts.has(String(customer.id).trim())) return false;
                }

                const isCart = r.target_type === 'CART_COUNT' || r.target_type === 'CART_VALUE' || String(r.calculation_basis || '').toUpperCase() === 'CART';
                if (isCart) {
                    const rawThresholdType = String(r.threshold_type || (r.target_type === 'CART_COUNT' ? 'COUNT' : 'VALUE')).toUpperCase();
                    if (rawThresholdType.includes('COUNT') || rawThresholdType.includes('QTY')) {
                        const minCount = (r.threshold_count !== null && r.threshold_count !== undefined) ? parseInt(r.threshold_count, 10) : 1;
                        const totalQty = cart.reduce((s, i) => s + parseInt(i.qty || 1, 10), 0);
                        if (totalQty < minCount) return false;
                    } else {
                        const minValue = (r.threshold_value !== null && r.threshold_value !== undefined) ? parseFloat(r.threshold_value) : 0;
                        if (subtotal < minValue) return false;
                    }
                    return true;
                } else {
                    const minCart = parseFloat(r.minimum_cart_amount || 0);
                    if (minCart > 0 && subtotal < minCart) return false;

                    let eligibleItems = cart;
                    if (r.target_type === 'SPECIFIC_PRODUCTS') {
                        const allowedProds = ruleProductsMap.get(r.id) || new Set();
                        eligibleItems = cart.filter(i => {
                            const id1 = String(i.id || '').trim();
                            const id2 = String(i.product_id || '').trim();
                            return (id1 && allowedProds.has(id1)) || (id2 && allowedProds.has(id2));
                        });
                    } else if (r.target_type === 'SPECIFIC_CATEGORIES') {
                        const allowedCats = ruleCategoriesMap.get(r.id) || new Set();
                        const norm = s => String(s || '').toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
                        eligibleItems = cart.filter(i => {
                            if (!i.category) return false;
                            const catNorm = norm(i.category);
                            return allowedCats.has(catNorm) || Array.from(allowedCats).some(c => catNorm.includes(c) || c.includes(catNorm));
                        });
                    }
                    if (eligibleItems.length === 0) return false;

                    const minProdsReq = r.minimum_cart_products ? parseInt(r.minimum_cart_products, 10) : 0;
                    if (r.minimum_cart_products_enabled && minProdsReq > 0) {
                        const elQty = eligibleItems.reduce((s, i) => s + parseInt(i.qty || 1, 10), 0);
                        if (elQty < minProdsReq) return false;
                    }
                    return true;
                }
            });

            if (activeEligibleCouponRules.length > 0) {
                let bestRule = null;
                let bestSavings = -1;
                for (const cr of activeEligibleCouponRules) {
                    const effType = cr.cart_discount_type || cr.product_discount_type || cr.discount_type || 'PERCENTAGE';
                    const rawVal = cr.cart_discount_value ?? cr.product_discount_value ?? cr.discount_value ?? 0;
                    const val = parseFloat(rawVal || 0);
                    let savings = 0;
                    if (effType === 'FREE_SHIPPING') savings = Math.max(50, shippingCost);
                    else if (effType === 'PERCENTAGE') savings = (val / 100) * subtotal;
                    else savings = Math.min(val, subtotal);

                    if (savings > bestSavings) {
                        bestSavings = savings;
                        bestRule = cr;
                    }
                }
                if (bestRule && bestSavings > 0) {
                    normalizedCoupon = bestRule.coupon_code.trim().toUpperCase();
                }
            }
        }

        let nonStackableProductApplied = false;
        let nonStackableCartApplied = false;
        let nonStackableCouponApplied = false;

        // Prioritize explicit customer-applied coupon rule so it is evaluated first
        // and never skipped by preceding non-stackable automatic store promotions.
        const sortedRules = [...rulesData].sort((a, b) => {
            const aIsCoupon = Boolean(normalizedCoupon && a.coupon_code && a.coupon_code.trim().toUpperCase() === normalizedCoupon);
            const bIsCoupon = Boolean(normalizedCoupon && b.coupon_code && b.coupon_code.trim().toUpperCase() === normalizedCoupon);
            if (aIsCoupon && !bIsCoupon) return -1;
            if (!aIsCoupon && bIsCoupon) return 1;
            return (b.priority || 0) - (a.priority || 0);
        });

        // 3. Evaluate rules in order of priority (coupon rules first if applicable)
        for (const rule of sortedRules) {
            // Check start/end dates with clock-skew tolerance
            const dateCheck = isRuleActiveByDate(rule.start_date, rule.end_date);
            if (!dateCheck.active) continue;

            const rawBasis = String(rule.calculation_basis || '').toUpperCase();
            const isCartTarget = rule.target_type === 'CART_COUNT' || rule.target_type === 'CART_VALUE';
            const isProductTarget = rule.target_type === 'SPECIFIC_PRODUCTS' || rule.target_type === 'SPECIFIC_CATEGORIES';

            // Distinct, decoupled determination of calculation basis
            let calculationBasis = 'PRODUCT';
            if (isProductTarget) {
                calculationBasis = 'PRODUCT';
            } else if (rawBasis === 'CART' || isCartTarget) {
                calculationBasis = 'CART';
            } else {
                calculationBasis = 'PRODUCT';
            }

            // Coupon matching logic:
            // If rule has coupon code, customer must have provided matching coupon code
            const hasCouponCode = Boolean(rule.coupon_code && rule.coupon_code.trim() !== '');
            const isCouponMatch = Boolean(hasCouponCode && normalizedCoupon && rule.coupon_code.trim().toUpperCase() === normalizedCoupon);
            const isCouponRule = isCouponMatch;

            if (hasCouponCode) {
                if (!isCouponMatch) {
                    continue; // Skip rule if coupon code doesn't match
                }
            }

            // Check stackability guard per tier so product and cart rules operate independently
            if (isCouponRule) {
                if (nonStackableCouponApplied && (!rule.stackable || rule.stackable === 0 || rule.stackable === false)) {
                    continue;
                }
            } else if (calculationBasis === 'CART') {
                if (nonStackableCartApplied && (!rule.stackable || rule.stackable === 0 || rule.stackable === false)) {
                    continue;
                }
            } else {
                if (nonStackableProductApplied && (!rule.stackable || rule.stackable === 0 || rule.stackable === false)) {
                    continue;
                }
            }

            // Check customer specific target if specified
            if (rule.target_type === 'SPECIFIC_CUSTOMERS') {
                const allowedCustomers = ruleCustomersMap.get(rule.id);
                if (!allowedCustomers || !customer?.id || !allowedCustomers.has(String(customer.id).trim())) continue;
            }

            let ruleDiscount = 0;
            // Resolve effective discount type & value honoring decoupled product vs cart fields with reliable fallbacks
            const effDiscountType = calculationBasis === 'CART'
                ? (rule.cart_discount_type && String(rule.cart_discount_type).trim() !== '' ? rule.cart_discount_type : (rule.discount_type || 'PERCENTAGE'))
                : (rule.product_discount_type && String(rule.product_discount_type).trim() !== '' ? rule.product_discount_type : (rule.discount_type || 'PERCENTAGE'));

            const rawVal = calculationBasis === 'CART'
                ? (Number(rule.cart_discount_value) > 0 ? rule.cart_discount_value : (rule.discount_value !== null && rule.discount_value !== undefined && Number(rule.discount_value) > 0 ? rule.discount_value : (rule.cart_discount_value ?? rule.discount_value)))
                : (Number(rule.product_discount_value) > 0 ? rule.product_discount_value : (rule.discount_value !== null && rule.discount_value !== undefined && Number(rule.discount_value) > 0 ? rule.discount_value : (rule.product_discount_value ?? rule.discount_value)));

            const val = parseFloat(rawVal || 0);

            // ==========================================
            // BRANCH 1: CART-LEVEL CONDITIONAL DISCOUNT
            // ==========================================
            if (calculationBasis === 'CART') {
                const rawThresholdType = String(
                    rule.threshold_type || 
                    (rule.target_type === 'CART_COUNT' ? 'COUNT' : (rule.target_type === 'CART_VALUE' ? 'VALUE' : 'COUNT'))
                ).toUpperCase();

                const isCountTrigger = rawThresholdType === 'COUNT' || rawThresholdType.includes('COUNT') || rawThresholdType.includes('QTY') || rawThresholdType.includes('UNIT');

                if (isCountTrigger) {
                    const minCount = (rule.threshold_count !== null && rule.threshold_count !== undefined && !isNaN(Number(rule.threshold_count)))
                        ? parseInt(rule.threshold_count, 10)
                        : (rule.minimum_cart_products ? parseInt(rule.minimum_cart_products, 10) : 1);
                    
                    const totalCartQuantity = cart.reduce((sum, item) => sum + parseInt(item.qty || 1, 10), 0);
                    if (totalCartQuantity < minCount) {
                        continue; // Cart does not meet total quantity threshold
                    }
                } else {
                    // VALUE Trigger (Subtotal Spend)
                    const minValue = (rule.threshold_value !== null && rule.threshold_value !== undefined && !isNaN(Number(rule.threshold_value)))
                        ? parseFloat(rule.threshold_value)
                        : (rule.minimum_cart_amount ? parseFloat(rule.minimum_cart_amount) : 0);

                    if (subtotal < minValue) {
                        continue; // Cart subtotal does not meet value threshold
                    }
                }

                if (val <= 0 && effDiscountType !== 'FREE_SHIPPING') {
                    continue;
                }

                // Remaining subtotal after existing product discounts
                const qualifyingSubtotal = Math.max(0, subtotal - productDiscount);
                if (qualifyingSubtotal <= 0 && effDiscountType !== 'FREE_SHIPPING') {
                    continue;
                }

                // Cart-level discount applies to the qualifying cart subtotal
                if (effDiscountType === 'PERCENTAGE') {
                    ruleDiscount = (val / 100) * qualifyingSubtotal;
                } else if (effDiscountType === 'FIXED' || effDiscountType === 'FIXED_AMOUNT') {
                    ruleDiscount = Math.min(val, qualifyingSubtotal);
                } else if (effDiscountType === 'FREE_SHIPPING') {
                    shippingDiscount = shippingCost;
                    ruleDiscount = 0;
                }

                ruleDiscount = Math.round(ruleDiscount * 100) / 100;

                if (ruleDiscount > 0 || effDiscountType === 'FREE_SHIPPING') {
                    if (isCouponRule) {
                        couponDiscount += ruleDiscount;
                        if (!rule.stackable || rule.stackable === 0 || rule.stackable === false) {
                            nonStackableCouponApplied = true;
                        }
                    } else {
                        cartDiscount += ruleDiscount;
                        if (!rule.stackable || rule.stackable === 0 || rule.stackable === false) {
                            nonStackableCartApplied = true;
                        }
                    }

                    appliedRules.push({
                        id: rule.id,
                        name: rule.name,
                        ruleName: rule.name,
                        couponCode: rule.coupon_code ? rule.coupon_code.trim().toUpperCase() : null,
                        discountType: effDiscountType,
                        discountValue: val,
                        discountAmount: ruleDiscount,
                        isCoupon: isCouponRule,
                        calculationBasis: 'CART',
                        thresholdType: isCountTrigger ? 'COUNT' : 'VALUE'
                    });
                }

                continue;
            }

            // ==========================================
            // BRANCH 2: PRODUCT / CATEGORY SCOPED DISCOUNT
            // ==========================================
            // Check minimum cart subtotal for product offers
            const minCart = parseFloat(rule.minimum_cart_amount || 0);
            if (minCart > 0 && subtotal < minCart) continue;

            // Determine eligible items in cart for this product rule
            let eligibleCartItems = cart;
            if (rule.target_type === 'SPECIFIC_PRODUCTS') {
                const allowedProds = ruleProductsMap.get(rule.id) || new Set();
                eligibleCartItems = cart.filter(i => {
                    const id1 = String(i.id || '').trim();
                    const id2 = String(i.product_id || '').trim();
                    return (id1 && allowedProds.has(id1)) || (id2 && allowedProds.has(id2));
                });
            } else if (rule.target_type === 'SPECIFIC_CATEGORIES') {
                const allowedCats = ruleCategoriesMap.get(rule.id) || new Set();
                const norm = s => String(s || '').toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
                const normalizedAllowed = new Set(Array.from(allowedCats).map(c => norm(c)));
                eligibleCartItems = cart.filter(i => {
                    if (!i.category) return false;
                    const catNorm = norm(i.category);
                    return normalizedAllowed.has(catNorm) || Array.from(normalizedAllowed).some(allowed => catNorm.includes(allowed) || allowed.includes(catNorm));
                });
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

            if (effDiscountType === 'PERCENTAGE') {
                ruleDiscount = (val / 100) * targetSubtotal;
            } else if (effDiscountType === 'FIXED' || effDiscountType === 'FIXED_AMOUNT') {
                ruleDiscount = Math.min(val, targetSubtotal);
            } else if (effDiscountType === 'FREE_SHIPPING') {
                shippingDiscount = shippingCost;
                ruleDiscount = 0;
            }

            ruleDiscount = Math.round(ruleDiscount * 100) / 100;

            if (ruleDiscount > 0 || effDiscountType === 'FREE_SHIPPING') {
                if (isCouponRule) {
                    couponDiscount += ruleDiscount;
                    if (!rule.stackable || rule.stackable === 0 || rule.stackable === false) {
                        nonStackableCouponApplied = true;
                    }
                } else {
                    // Storewide (ALL_PRODUCTS), Category, and Saree specific discounts under PRODUCT basis all add to productDiscount
                    productDiscount += ruleDiscount;
                    if (!rule.stackable || rule.stackable === 0 || rule.stackable === false) {
                        nonStackableProductApplied = true;
                    }
                }

                // Specifically allocate this rule discount across eligible items
                if (ruleDiscount > 0) {
                    let allocatedSum = 0;
                    eligibleCartItems.forEach((elItem, elIdx) => {
                        const origIdx = cart.findIndex(c => c === elItem || (c.id && c.id === elItem.id && (!c.variantId || c.variantId === elItem.variantId)));
                        if (origIdx !== -1) {
                            const itemLine = parseFloat(elItem.price || 0) * parseInt(elItem.qty || 1, 10);
                            let itemPart = 0;
                            if (elIdx === eligibleCartItems.length - 1) {
                                itemPart = Math.round((ruleDiscount - allocatedSum) * 100) / 100;
                            } else {
                                itemPart = Math.round((ruleDiscount * (itemLine / targetSubtotal)) * 100) / 100;
                                allocatedSum += itemPart;
                            }
                            itemProductDiscounts[origIdx] = Math.round(((itemProductDiscounts[origIdx] || 0) + itemPart) * 100) / 100;
                        }
                    });
                }

                appliedRules.push({
                    id: rule.id,
                    name: rule.name,
                    ruleName: rule.name,
                    couponCode: rule.coupon_code ? rule.coupon_code.trim().toUpperCase() : null,
                    discountType: effDiscountType,
                    discountValue: val,
                    discountAmount: ruleDiscount,
                    isCoupon: isCouponRule,
                    calculationBasis: 'PRODUCT'
                });
            }
        }

        return buildResult({ subtotal, shippingCost, cart, productDiscount, cartDiscount, couponDiscount, shippingDiscount, appliedRules, appliedCouponCode: normalizedCoupon, itemProductDiscounts });

    } catch (err) {
        console.error('[DISCOUNT SERVICE ERROR]', err);
        return buildResult({ subtotal, shippingCost, cart, productDiscount: 0, cartDiscount: 0, couponDiscount: 0, shippingDiscount: 0, appliedRules: [], appliedCouponCode: null, itemProductDiscounts: [] });
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

    const { data: rules, error } = await mysqlClient
        .from('discount_rules')
        .select('*')
        .eq('coupon_code', code);

    if (error || !rules || rules.length === 0) {
        return { valid: false, message: 'Invalid coupon code.' };
    }

    const rule = rules.find(r => r.is_active === 1 || r.is_active === true || r.is_active === '1');

    if (!rule) {
        return { valid: false, message: 'This coupon is currently inactive or disabled.' };
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

    const calculationBasis = (rule.calculation_basis || 'PRODUCT').toUpperCase();

    if (calculationBasis === 'CART') {
        const thresholdType = (
            rule.threshold_type || 
            (rule.target_type === 'CART_COUNT' ? 'COUNT' : (rule.target_type === 'CART_VALUE' ? 'VALUE' : 'COUNT'))
        ).toUpperCase();

        if (thresholdType === 'COUNT') {
            const minCount = (rule.threshold_count !== null && rule.threshold_count !== undefined)
                ? parseInt(rule.threshold_count, 10)
                : (rule.minimum_cart_products ? parseInt(rule.minimum_cart_products, 10) : 1);
            
            const totalCartQty = Array.isArray(cartItems) ? cartItems.reduce((sum, i) => sum + parseInt(i.qty || 1, 10), 0) : 0;
            if (totalCartQty < minCount) {
                return { valid: false, message: `Coupon requires a minimum of ${minCount} total items in cart.` };
            }
        } else if (thresholdType === 'VALUE') {
            const minValue = (rule.threshold_value !== null && rule.threshold_value !== undefined)
                ? parseFloat(rule.threshold_value)
                : parseFloat(rule.minimum_cart_amount || 0);

            if (subtotal < minValue) {
                return { valid: false, message: `Coupon requires a minimum cart subtotal of ₹${minValue.toLocaleString()}.` };
            }
        }
    } else {
        const minCart = parseFloat(rule.minimum_cart_amount || 0);
        if (minCart > 0 && subtotal < minCart) {
            return { valid: false, message: `Coupon requires a minimum cart subtotal of ₹${minCart.toLocaleString()}.` };
        }

        const minProdsEnabled = rule.minimum_cart_products_enabled === 1 || rule.minimum_cart_products_enabled === true;
        const minProdsReq = rule.minimum_cart_products ? parseInt(rule.minimum_cart_products, 10) : 0;

        if (rule.target_type === 'SPECIFIC_PRODUCTS') {
            const { data: prods } = await mysqlClient.from('discount_rule_products').select('product_id').eq('discount_rule_id', rule.id);
            const allowedProds = new Set((prods || []).map(p => String(p.product_id).trim()));
            const eligibleCartItems = (cartItems || []).filter(i => {
                const id1 = String(i.id || '').trim();
                const id2 = String(i.product_id || '').trim();
                return (id1 && allowedProds.has(id1)) || (id2 && allowedProds.has(id2));
            });

            if (eligibleCartItems.length === 0) {
                return { valid: false, message: 'This coupon is valid only for specific selected sarees which are not in your cart.' };
            }

            if (minProdsEnabled && minProdsReq > 0) {
                const eligibleQty = eligibleCartItems.reduce((sum, i) => sum + parseInt(i.qty || 1, 10), 0);
                if (eligibleQty < minProdsReq) {
                    return { valid: false, message: `Coupon requires a minimum of ${minProdsReq} eligible sarees in cart.` };
                }
            }
        } else if (rule.target_type === 'SPECIFIC_CATEGORIES') {
            const { data: cats } = await mysqlClient.from('discount_rule_categories').select('category').eq('discount_rule_id', rule.id);
            const norm = s => String(s || '').toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
            const allowedCats = new Set((cats || []).map(c => norm(c.category)));

            // Ensure categories on cart items if missing
            const missingCatItems = (cartItems || []).filter(i => !i.category && (i.id || i.product_id));
            if (missingCatItems.length > 0) {
                try {
                    const ids = missingCatItems.map(i => String(i.id || i.product_id).trim());
                    const { data: dbP } = await mysqlClient.from('products').select('id, category').in('id', ids);
                    if (dbP && dbP.length > 0) {
                        const cMap = new Map(dbP.map(p => [String(p.id).trim(), p.category]));
                        cartItems.forEach(i => {
                            if (!i.category) {
                                const c = cMap.get(String(i.id || i.product_id).trim());
                                if (c) i.category = c;
                            }
                        });
                    }
                } catch (e) {}
            }

            const eligibleCartItems = (cartItems || []).filter(i => {
                if (!i.category) return false;
                const cNorm = norm(i.category);
                return allowedCats.has(cNorm) || Array.from(allowedCats).some(a => cNorm.includes(a) || a.includes(cNorm));
            });

            if (eligibleCartItems.length === 0) {
                return { valid: false, message: 'This coupon is valid only for selected saree categories which are not in your cart.' };
            }

            if (minProdsEnabled && minProdsReq > 0) {
                const eligibleQty = eligibleCartItems.reduce((sum, i) => sum + parseInt(i.qty || 1, 10), 0);
                if (eligibleQty < minProdsReq) {
                    return { valid: false, message: `Coupon requires a minimum of ${minProdsReq} sarees from eligible categories in cart.` };
                }
            }
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
function buildResult({
    subtotal,
    shippingCost,
    cart,
    productDiscount,
    cartDiscount,
    couponDiscount,
    shippingDiscount,
    appliedRules,
    appliedCouponCode,
    itemProductDiscounts = []
}) {
    const totalDiscount = Math.min(subtotal, Math.round((productDiscount + cartDiscount + couponDiscount) * 100) / 100);
    const finalShipping = Math.max(0, shippingCost - shippingDiscount);

    // 1. Initial allocation from specific product discounts (ensuring cap at line subtotal)
    const specificAllocations = cart.map((item, idx) => {
        const lineSubtotal = Math.round(parseFloat(item.price || 0) * parseInt(item.qty || 1, 10) * 100) / 100;
        const specific = Math.max(0, Math.min(lineSubtotal, itemProductDiscounts[idx] || 0));
        return {
            lineSubtotal,
            specific,
            remaining: Math.max(0, Math.round((lineSubtotal - specific) * 100) / 100)
        };
    });

    const totalSpecificAllocated = Math.round(specificAllocations.reduce((sum, a) => sum + a.specific, 0) * 100) / 100;
    const remainingDiscountToAllocate = Math.max(0, Math.round((totalDiscount - totalSpecificAllocated) * 100) / 100);
    const totalRemainingSubtotal = Math.round(specificAllocations.reduce((sum, a) => sum + a.remaining, 0) * 100) / 100;

    // 2. Allocate general cart/coupon discounts across items with remaining value
    let generalAllocatedSum = 0;
    const itemsWithRemaining = specificAllocations.filter(a => a.remaining > 0);

    const finalAllocated = specificAllocations.map(a => {
        if (remainingDiscountToAllocate > 0 && totalRemainingSubtotal > 0 && a.remaining > 0) {
            const isLastRemaining = itemsWithRemaining.length > 0 && a === itemsWithRemaining[itemsWithRemaining.length - 1];
            let generalShare = 0;
            if (isLastRemaining) {
                generalShare = Math.round((remainingDiscountToAllocate - generalAllocatedSum) * 100) / 100;
            } else {
                generalShare = Math.round(((a.remaining / totalRemainingSubtotal) * remainingDiscountToAllocate) * 100) / 100;
                generalAllocatedSum = Math.round((generalAllocatedSum + generalShare) * 100) / 100;
            }
            return Math.min(a.lineSubtotal, Math.round((a.specific + generalShare) * 100) / 100);
        }
        return a.specific;
    });

    // 3. Reconcile any rounding drift so sum(finalAllocated) === totalDiscount exactly
    const currentSum = Math.round(finalAllocated.reduce((sum, d) => sum + d, 0) * 100) / 100;
    const diff = Math.round((totalDiscount - currentSum) * 100) / 100;
    if (diff !== 0 && finalAllocated.length > 0) {
        let adjusted = false;
        for (let i = 0; i < finalAllocated.length; i++) {
            const newDiscount = Math.round((finalAllocated[i] + diff) * 100) / 100;
            if (newDiscount >= 0 && newDiscount <= specificAllocations[i].lineSubtotal) {
                finalAllocated[i] = newDiscount;
                adjusted = true;
                break;
            }
        }
        if (!adjusted) {
            finalAllocated[0] = Math.max(0, Math.min(specificAllocations[0].lineSubtotal, Math.round((finalAllocated[0] + diff) * 100) / 100));
        }
    }

    const discountedItems = cart.map((item, idx) => {
        const itemLineSubtotal = specificAllocations[idx].lineSubtotal;
        const itemTotalDiscount = Math.round(finalAllocated[idx] * 100) / 100;
        const itemEffectiveSubtotal = Math.max(0, Math.round((itemLineSubtotal - itemTotalDiscount) * 100) / 100);
        const itemPaidUnitPrice = item.qty > 0 ? Math.round((itemEffectiveSubtotal / item.qty) * 100) / 100 : 0;

        return {
            ...item,
            lineSubtotal: itemLineSubtotal,
            allocatedDiscount: itemTotalDiscount,
            effectiveLineSubtotal: itemEffectiveSubtotal,
            paidUnitPrice: itemPaidUnitPrice
        };
    });

    const taxableAmount = Math.max(0, Math.round((subtotal - totalDiscount) * 100) / 100);
    const finalTotal = Math.round((taxableAmount + finalShipping) * 100) / 100;

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
