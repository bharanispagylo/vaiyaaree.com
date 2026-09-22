import { parseDateToUTC } from './dateUtils';

/**
 * Checks if a discount rule is currently active based on its start and end dates.
 */
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
 * Checks if a cart meets the eligibility conditions for a specific discount rule.
 */
export function isRuleEligibleForCart(rule, cart, subtotal, customer = null) {
    if (!rule || !Array.isArray(cart) || cart.length === 0 || subtotal <= 0) return false;

    const isActive = rule.is_active === 1 || rule.is_active === true || rule.is_active === '1';
    if (!isActive) return false;

    const dateCheck = isRuleActiveByDate(rule.start_date, rule.end_date);
    if (!dateCheck.active) return false;

    const rawBasis = String(rule.calculation_basis || '').toUpperCase();
    const isCartTarget = rule.target_type === 'CART_COUNT' || rule.target_type === 'CART_VALUE';
    const isProductTarget = rule.target_type === 'SPECIFIC_PRODUCTS' || rule.target_type === 'SPECIFIC_CATEGORIES';

    let calculationBasis = 'PRODUCT';
    if (isProductTarget) {
        calculationBasis = 'PRODUCT';
    } else if (rawBasis === 'CART' || isCartTarget) {
        calculationBasis = 'CART';
    } else {
        calculationBasis = 'PRODUCT';
    }

    // Customer restriction
    if (rule.target_type === 'SPECIFIC_CUSTOMERS') {
        const allowedCusts = Array.isArray(rule.customer_ids) ? rule.customer_ids.map(String) : [];
        if (allowedCusts.length > 0 && (!customer?.id || !allowedCusts.includes(String(customer.id).trim()))) {
            return false;
        }
    }

    if (calculationBasis === 'CART') {
        const rawThresholdType = String(
            rule.threshold_type || 
            (rule.target_type === 'CART_COUNT' ? 'COUNT' : (rule.target_type === 'CART_VALUE' ? 'VALUE' : 'COUNT'))
        ).toUpperCase();
        const isCountTrigger = rawThresholdType === 'COUNT' || rawThresholdType.includes('COUNT') || rawThresholdType.includes('QTY');

        if (isCountTrigger) {
            const minCount = (rule.threshold_count !== null && rule.threshold_count !== undefined && !isNaN(Number(rule.threshold_count)))
                ? parseInt(rule.threshold_count, 10)
                : (rule.minimum_cart_products ? parseInt(rule.minimum_cart_products, 10) : 1);
            const totalCartQty = cart.reduce((sum, item) => sum + parseInt(item.qty || 1, 10), 0);
            if (totalCartQty < minCount) return false;
        } else {
            const minValue = (rule.threshold_value !== null && rule.threshold_value !== undefined && !isNaN(Number(rule.threshold_value)))
                ? parseFloat(rule.threshold_value)
                : (rule.minimum_cart_amount ? parseFloat(rule.minimum_cart_amount) : 0);
            if (subtotal < minValue) return false;
        }
        return true;
    } else {
        // PRODUCT basis
        const minCart = parseFloat(rule.minimum_cart_amount || 0);
        if (minCart > 0 && subtotal < minCart) return false;

        let eligibleCartItems = cart;
        if (rule.target_type === 'SPECIFIC_PRODUCTS') {
            const allowedProds = new Set((rule.product_ids || []).map(p => String(typeof p === 'object' ? (p.product_id || p.id) : p).trim()));
            eligibleCartItems = cart.filter(i => {
                const id1 = String(i.id || '').trim();
                const id2 = String(i.product_id || '').trim();
                return (id1 && allowedProds.has(id1)) || (id2 && allowedProds.has(id2));
            });
        } else if (rule.target_type === 'SPECIFIC_CATEGORIES') {
            const norm = s => String(s || '').toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
            const allowedCats = new Set((rule.categories || []).map(c => norm(typeof c === 'object' ? (c.category || c.name || '') : c)));
            eligibleCartItems = cart.filter(i => {
                if (!i.category) return false;
                const catNorm = norm(i.category);
                return allowedCats.has(catNorm) || Array.from(allowedCats).some(allowed => catNorm.includes(allowed) || allowed.includes(catNorm));
            });
        }

        const eligibleQuantity = eligibleCartItems.reduce((sum, item) => sum + parseInt(item.qty || 1, 10), 0);
        const targetSubtotal = eligibleCartItems.reduce((s, i) => s + (parseFloat(i.price || 0) * parseInt(i.qty || 1, 10)), 0);

        if (targetSubtotal <= 0) return false;

        const minProdsEnabled = rule.minimum_cart_products_enabled === 1 || rule.minimum_cart_products_enabled === true;
        const minProdsReq = rule.minimum_cart_products ? parseInt(rule.minimum_cart_products, 10) : 0;
        if (minProdsEnabled && minProdsReq > 0 && eligibleQuantity < minProdsReq) {
            return false;
        }

        return true;
    }
}

/**
 * Calculates discounts synchronously in-memory using activeDiscountRules.
 * Executes instantly (< 1ms) so the Slide Cart, Cart page, and Checkout page
 * display discounts immediately without any asynchronous delay or flickering.
 */
export function calculateDiscountsClientSync({
    cartItems = [],
    activeDiscountRules = [],
    appliedCouponCode = null,
    customer = null,
    shippingCost = 0,
    allowAutoCoupon = true
}) {
    const cart = Array.isArray(cartItems) ? cartItems : [];
    const subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.price || 0) * parseInt(item.qty || 1, 10)), 0);

    const emptyResult = {
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
        appliedCouponCode: null,
        autoCoupon: null
    };

    if (cart.length === 0 || subtotal <= 0) {
        return emptyResult;
    }

    const rules = Array.isArray(activeDiscountRules) ? activeDiscountRules : [];
    const activeRules = rules.filter(r => {
        const isActive = r.is_active === 1 || r.is_active === true || r.is_active === '1';
        if (!isActive) return false;
        const dateCheck = isRuleActiveByDate(r.start_date, r.end_date);
        return dateCheck.active;
    });

    let normalizedCoupon = (appliedCouponCode || '').trim().toUpperCase();
    let autoSelectedRule = null;

    // Auto-select best eligible promotional offer if no coupon code was manually entered
    if (!normalizedCoupon && allowAutoCoupon) {
        const eligibleCouponRules = activeRules.filter(r => {
            const hasCode = Boolean(r.coupon_code && r.coupon_code.trim());
            return hasCode && isRuleEligibleForCart(r, cart, subtotal, customer);
        });

        if (eligibleCouponRules.length > 0) {
            // Find the eligible coupon rule that provides the maximum benefit
            let bestRule = null;
            let bestEstimatedSavings = -1;

            for (const cRule of eligibleCouponRules) {
                const basis = (cRule.target_type === 'SPECIFIC_PRODUCTS' || cRule.target_type === 'SPECIFIC_CATEGORIES')
                    ? 'PRODUCT'
                    : ((cRule.calculation_basis || 'PRODUCT').toUpperCase());
                const effType = basis === 'CART'
                    ? (cRule.cart_discount_type || cRule.discount_type || 'PERCENTAGE')
                    : (cRule.product_discount_type || cRule.discount_type || 'PERCENTAGE');
                const rawVal = basis === 'CART'
                    ? (cRule.cart_discount_value ?? cRule.discount_value ?? 0)
                    : (cRule.product_discount_value ?? cRule.discount_value ?? 0);
                const val = parseFloat(rawVal || 0);

                let estSavings = 0;
                if (effType === 'FREE_SHIPPING') {
                    estSavings = Math.max(50, parseFloat(shippingCost || 0));
                } else if (effType === 'PERCENTAGE') {
                    estSavings = (val / 100) * subtotal;
                } else {
                    estSavings = Math.min(val, subtotal);
                }

                if (estSavings > bestEstimatedSavings) {
                    bestEstimatedSavings = estSavings;
                    bestRule = cRule;
                }
            }

            if (bestRule && bestEstimatedSavings > 0) {
                normalizedCoupon = bestRule.coupon_code.trim().toUpperCase();
                autoSelectedRule = bestRule;
            }
        }
    }

    // Sort rules: prioritized coupon rule first, then by priority desc
    const sortedRules = [...activeRules].sort((a, b) => {
        const aIsCoupon = Boolean(normalizedCoupon && a.coupon_code && a.coupon_code.trim().toUpperCase() === normalizedCoupon);
        const bIsCoupon = Boolean(normalizedCoupon && b.coupon_code && b.coupon_code.trim().toUpperCase() === normalizedCoupon);
        if (aIsCoupon && !bIsCoupon) return -1;
        if (!aIsCoupon && bIsCoupon) return 1;
        return (b.priority || 0) - (a.priority || 0);
    });

    let productDiscount = 0;
    let cartDiscount = 0;
    let couponDiscount = 0;
    let shippingDiscount = 0;
    const appliedRules = [];
    const itemProductDiscounts = new Array(cart.length).fill(0);

    let nonStackableProductApplied = false;
    let nonStackableCartApplied = false;
    let nonStackableCouponApplied = false;

    for (const rule of sortedRules) {
        const rawBasis = String(rule.calculation_basis || '').toUpperCase();
        const isCartTarget = rule.target_type === 'CART_COUNT' || rule.target_type === 'CART_VALUE';
        const isProductTarget = rule.target_type === 'SPECIFIC_PRODUCTS' || rule.target_type === 'SPECIFIC_CATEGORIES';

        let calculationBasis = 'PRODUCT';
        if (isProductTarget) {
            calculationBasis = 'PRODUCT';
        } else if (rawBasis === 'CART' || isCartTarget) {
            calculationBasis = 'CART';
        } else {
            calculationBasis = 'PRODUCT';
        }

        const hasCouponCode = Boolean(rule.coupon_code && rule.coupon_code.trim() !== '');
        const isCouponMatch = Boolean(hasCouponCode && normalizedCoupon && rule.coupon_code.trim().toUpperCase() === normalizedCoupon);
        const isCouponRule = isCouponMatch;

        if (hasCouponCode && !isCouponMatch) {
            continue;
        }

        // Stackability guard per tier
        if (isCouponRule) {
            if (nonStackableCouponApplied && (!rule.stackable || rule.stackable === 0 || rule.stackable === false)) continue;
        } else if (calculationBasis === 'CART') {
            if (nonStackableCartApplied && (!rule.stackable || rule.stackable === 0 || rule.stackable === false)) continue;
        } else {
            if (nonStackableProductApplied && (!rule.stackable || rule.stackable === 0 || rule.stackable === false)) continue;
        }

        // Customer specific check
        if (rule.target_type === 'SPECIFIC_CUSTOMERS') {
            const allowedCusts = Array.isArray(rule.customer_ids) ? rule.customer_ids.map(String) : [];
            if (allowedCusts.length > 0 && (!customer?.id || !allowedCusts.includes(String(customer.id).trim()))) continue;
        }

        let ruleDiscount = 0;
        const effDiscountType = calculationBasis === 'CART'
            ? (rule.cart_discount_type && String(rule.cart_discount_type).trim() !== '' ? rule.cart_discount_type : (rule.discount_type || 'PERCENTAGE'))
            : (rule.product_discount_type && String(rule.product_discount_type).trim() !== '' ? rule.product_discount_type : (rule.discount_type || 'PERCENTAGE'));

        const rawVal = calculationBasis === 'CART'
            ? (Number(rule.cart_discount_value) > 0 ? rule.cart_discount_value : (rule.discount_value ?? rule.cart_discount_value ?? 0))
            : (Number(rule.product_discount_value) > 0 ? rule.product_discount_value : (rule.discount_value ?? rule.product_discount_value ?? 0));
        const val = parseFloat(rawVal || 0);

        // ----------------------------------------------------
        // BRANCH 1: CART-LEVEL DISCOUNT
        // ----------------------------------------------------
        if (calculationBasis === 'CART') {
            const rawThresholdType = String(
                rule.threshold_type || 
                (rule.target_type === 'CART_COUNT' ? 'COUNT' : (rule.target_type === 'CART_VALUE' ? 'VALUE' : 'COUNT'))
            ).toUpperCase();
            const isCountTrigger = rawThresholdType === 'COUNT' || rawThresholdType.includes('COUNT') || rawThresholdType.includes('QTY');

            if (isCountTrigger) {
                const minCount = (rule.threshold_count !== null && rule.threshold_count !== undefined && !isNaN(Number(rule.threshold_count)))
                    ? parseInt(rule.threshold_count, 10)
                    : (rule.minimum_cart_products ? parseInt(rule.minimum_cart_products, 10) : 1);
                const totalCartQuantity = cart.reduce((sum, item) => sum + parseInt(item.qty || 1, 10), 0);
                if (totalCartQuantity < minCount) continue;
            } else {
                const minValue = (rule.threshold_value !== null && rule.threshold_value !== undefined && !isNaN(Number(rule.threshold_value)))
                    ? parseFloat(rule.threshold_value)
                    : (rule.minimum_cart_amount ? parseFloat(rule.minimum_cart_amount) : 0);
                if (subtotal < minValue) continue;
            }

            if (val <= 0 && effDiscountType !== 'FREE_SHIPPING') continue;

            const qualifyingSubtotal = Math.max(0, subtotal - productDiscount);
            if (qualifyingSubtotal <= 0 && effDiscountType !== 'FREE_SHIPPING') continue;

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
                    if (!rule.stackable) nonStackableCouponApplied = true;
                } else {
                    cartDiscount += ruleDiscount;
                    if (!rule.stackable) nonStackableCartApplied = true;
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

        // ----------------------------------------------------
        // BRANCH 2: PRODUCT / CATEGORY SCOPED DISCOUNT
        // ----------------------------------------------------
        const minCart = parseFloat(rule.minimum_cart_amount || 0);
        if (minCart > 0 && subtotal < minCart) continue;

        let eligibleCartItems = cart;
        if (rule.target_type === 'SPECIFIC_PRODUCTS') {
            const allowedProds = new Set((rule.product_ids || []).map(p => String(typeof p === 'object' ? (p.product_id || p.id) : p).trim()));
            eligibleCartItems = cart.filter(i => {
                const id1 = String(i.id || '').trim();
                const id2 = String(i.product_id || '').trim();
                return (id1 && allowedProds.has(id1)) || (id2 && allowedProds.has(id2));
            });
        } else if (rule.target_type === 'SPECIFIC_CATEGORIES') {
            const norm = s => String(s || '').toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
            const allowedCats = new Set((rule.categories || []).map(c => norm(typeof c === 'object' ? (c.category || c.name || '') : c)));
            eligibleCartItems = cart.filter(i => {
                if (!i.category) return false;
                const catNorm = norm(i.category);
                return allowedCats.has(catNorm) || Array.from(allowedCats).some(allowed => catNorm.includes(allowed) || allowed.includes(catNorm));
            });
        }

        const eligibleQuantity = eligibleCartItems.reduce((sum, item) => sum + parseInt(item.qty || 1, 10), 0);
        const targetSubtotal = eligibleCartItems.reduce((s, i) => s + (parseFloat(i.price || 0) * parseInt(i.qty || 1, 10)), 0);

        if (targetSubtotal <= 0) continue;

        const minProdsEnabled = rule.minimum_cart_products_enabled === 1 || rule.minimum_cart_products_enabled === true;
        const minProdsReq = rule.minimum_cart_products ? parseInt(rule.minimum_cart_products, 10) : 0;
        if (minProdsEnabled && minProdsReq > 0 && eligibleQuantity < minProdsReq) {
            continue;
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
                if (!rule.stackable) nonStackableCouponApplied = true;
            } else {
                productDiscount += ruleDiscount;
                if (!rule.stackable) nonStackableProductApplied = true;
            }

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

    const totalDiscount = Math.min(subtotal, Math.round((productDiscount + cartDiscount + couponDiscount) * 100) / 100);
    const finalShipping = Math.max(0, shippingCost - shippingDiscount);
    const taxableAmount = Math.max(0, subtotal - totalDiscount);
    const finalTotal = Math.round((taxableAmount + finalShipping) * 100) / 100;

    // Proportionally allocate discounts to cart items
    const discountedItems = cart.map((item, idx) => {
        const itemLine = Math.round(parseFloat(item.price || 0) * parseInt(item.qty || 1, 10) * 100) / 100;
        const specific = Math.max(0, Math.min(itemLine, itemProductDiscounts[idx] || 0));
        let itemDiscount = specific;
        if (totalDiscount > productDiscount && subtotal > 0) {
            const generalPool = totalDiscount - productDiscount;
            const remainingLine = Math.max(0, itemLine - specific);
            const totalRemaining = Math.max(0, subtotal - productDiscount);
            if (totalRemaining > 0) {
                itemDiscount += Math.round((remainingLine / totalRemaining) * generalPool * 100) / 100;
            }
        }
        itemDiscount = Math.min(itemLine, Math.round(itemDiscount * 100) / 100);
        return {
            ...item,
            originalSubtotal: itemLine,
            discount: itemDiscount,
            finalSubtotal: Math.max(0, Math.round((itemLine - itemDiscount) * 100) / 100)
        };
    });

    const autoCoupon = autoSelectedRule ? {
        couponCode: autoSelectedRule.coupon_code.trim().toUpperCase(),
        rule: autoSelectedRule,
        couponDiscount: couponDiscount,
        calculation: {
            subtotal,
            productDiscount,
            cartDiscount,
            couponDiscount,
            shippingDiscount,
            totalDiscount,
            shipping: finalShipping,
            taxableAmount,
            finalTotal,
            discountedItems,
            appliedRules,
            appliedCouponCode: normalizedCoupon
        }
    } : null;

    return {
        subtotal,
        productDiscount,
        cartDiscount,
        couponDiscount,
        shippingDiscount,
        totalDiscount,
        shipping: finalShipping,
        taxableAmount,
        finalTotal,
        discountedItems,
        appliedRules,
        appliedCouponCode: normalizedCoupon,
        autoCoupon
    };
}
