import { NextResponse } from 'next/server';
import { mysqlClient } from '@/lib/mysqlClient';

export async function POST(request) {
    try {
        const body = await request.json();
        const { subtotal: rawSubtotal, cart, shippingCountry, shippingState, shippingCity } = body;

        let subtotal = typeof rawSubtotal === 'number' ? rawSubtotal : 0;
        if (cart && Array.isArray(cart) && cart.length > 0) {
            subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.price || 0) * (parseInt(item.qty || 1, 10))), 0);
        }

        const country = (shippingCountry || 'India').trim();
        const isInternational = country.toLowerCase() !== 'india' && country.toLowerCase() !== 'in';
        const state = (shippingState || 'Tamil Nadu').trim();
        const city = (shippingCity || '').trim().toLowerCase();

        // Helper for international zone check
        const isZoneIntl = (z) => {
            if (!z) return false;
            return z.is_international === true || z.is_international === 1 || z.is_international === '1' || String(z.is_international).toLowerCase() === 'true';
        };

        // Query database for shipping zones and mappings
        const [zonesRes, mappingsRes] = await Promise.all([
            mysqlClient.from('shipping_zones').select('*'),
            mysqlClient.from('shipping_zone_states').select('*')
        ]);

        const dbZones = zonesRes.data || [];
        const dbMappings = mappingsRes.data || [];

        let activeZone = null;

        if (dbZones.length > 0) {
            if (isInternational) {
                const intlZones = dbZones.filter(z => isZoneIntl(z));
                const intlZoneIds = new Set(intlZones.map(z => z.id));

                const countryMapping = dbMappings.find(m => 
                    intlZoneIds.has(m.zone_id) &&
                    m.state_name?.trim().toLowerCase() === country.toLowerCase()
                );

                if (countryMapping) {
                    activeZone = intlZones.find(z => z.id === countryMapping.zone_id) || null;
                }
                if (!activeZone) {
                    activeZone = intlZones[0] || null;
                }
            } else {
                const domesticZones = dbZones.filter(z => !isZoneIntl(z));
                const domesticZoneIds = new Set(domesticZones.map(z => z.id));

                const districtMapping = dbMappings.find(m => 
                    domesticZoneIds.has(m.zone_id) &&
                    m.state_name === state && 
                    m.district_name?.toLowerCase() === city
                );

                if (districtMapping) {
                    activeZone = domesticZones.find(z => z.id === districtMapping.zone_id);
                } else {
                    const stateMapping = dbMappings.find(m => domesticZoneIds.has(m.zone_id) && m.state_name === state && !m.district_name);
                    if (stateMapping) {
                        activeZone = domesticZones.find(z => z.id === stateMapping.zone_id);
                    } else {
                        activeZone = domesticZones[0] || null;
                    }
                }
            }
        }

        let shippingCost = 0;
        let shippingGroup = 'Default Shipping';
        let shippingType = isInternational ? 'INTERNATIONAL' : 'DOMESTIC';
        let shippingRate = isInternational ? 1500 : 100;
        let freeThreshold = null;

        if (activeZone) {
            shippingGroup = activeZone.name || (isInternational ? 'International Group' : 'Domestic Group');
            shippingType = isZoneIntl(activeZone) ? 'INTERNATIONAL' : 'DOMESTIC';
            shippingRate = Math.max(0, parseFloat(activeZone.rate || 0));
            const threshold = parseFloat(activeZone.free_threshold || 0);
            freeThreshold = threshold > 0 ? threshold : null;

            if (threshold > 0 && subtotal >= threshold) {
                shippingCost = 0;
            } else {
                shippingCost = shippingRate;
            }
        } else {
            shippingCost = isInternational ? 1500 : 100;
        }

        return NextResponse.json({
            success: true,
            shippingGroup,
            shippingType,
            shippingRate,
            freeThreshold,
            shippingCost,
            subtotal,
            isInternational
        }, { status: 200 });

    } catch (err) {
        console.error('[API /api/shipping/calculate Error]:', err);
        return NextResponse.json({ error: err.message || 'Failed to calculate shipping' }, { status: 500 });
    }
}
