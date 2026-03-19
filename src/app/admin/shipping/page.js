'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
    Truck, Save, Plus, Trash2, Globe, MapPin,
    AlertCircle, CheckCircle2, Loader2, Info,
    Search, LayoutGrid, List, ChevronRight,
    Tag, Map as MapIcon, ChevronDown, PlusCircle,
    X, IndianRupee
} from 'lucide-react';

export default function ShippingAdminPage() {
    const [zones, setZones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [selectedZone, setSelectedZone] = useState(null);
    const [hasMounted, setHasMounted] = useState(false);
    const [stateSearch, setStateSearch] = useState('');

    const [mappings, setMappings] = useState([]); // Array of {zone_id, state_name, district_name}

    const allStates = useMemo(() => [
        "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
        "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
        "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
        "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
        "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
        "Uttarakhand", "West Bengal", "Delhi", "Chandigarh", "Puducherry",
        "Jammu and Kashmir", "Ladakh"
    ].sort(), []);

    useEffect(() => {
        setHasMounted(true);
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [zonesRes, mappingRes] = await Promise.all([
                supabase.from('shipping_zones').select('*').order('is_international', { ascending: true }).order('name', { ascending: true }),
                supabase.from('shipping_zone_states').select('*')
            ]);

            if (zonesRes.data) {
                setZones(zonesRes.data);
                if (!selectedZone && zonesRes.data.length > 0) setSelectedZone(zonesRes.data[0]);
            }
            if (mappingRes.data) setMappings(mappingRes.data);

        } catch (err) {
            console.error('Fetch error:', err);
            setError('Failed to load shipping data.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateZone = (id, field, value) => {
        setZones(prev => prev.map(z => z.id === id ? { ...z, [field]: value } : z));
        if (selectedZone?.id === id) {
            setSelectedZone(prev => ({ ...prev, [field]: value }));
        }
    };

    const saveChanges = async () => {
        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            for (const zone of zones) {
                const { error: updateError } = await supabase
                    .from('shipping_zones')
                    .update({
                        name: zone.name,
                        rate: parseFloat(zone.rate),
                        free_threshold: parseFloat(zone.free_threshold),
                        is_international: zone.is_international
                    })
                    .eq('id', zone.id);
                if (updateError) throw updateError;
            }

            const zoneIds = zones.map(z => z.id);
            if (zoneIds.length > 0) {
                await supabase.from('shipping_zone_states').delete().in('zone_id', zoneIds);
                if (mappings.length > 0) {
                    const { error: insError } = await supabase.from('shipping_zone_states').insert(mappings.map(m => ({
                        zone_id: m.zone_id,
                        state_name: m.state_name,
                        district_name: m.district_name || null
                    })));
                    if (insError) throw insError;
                }
            }

            setSuccess('✨ Shipping ecosystem synchronized!');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            console.error('Save error:', err);
            setError(err.message || 'Failed to save changes.');
        } finally {
            setSaving(false);
        }
    };

    const addZone = async () => {
        setSaving(true);
        try {
            const { data, error } = await supabase
                .from('shipping_zones')
                .insert([{ name: 'New Price Group', rate: 100, free_threshold: 5000, is_international: false }])
                .select()
                .single();

            if (error) throw error;
            setZones([...zones, data]);
            setSelectedZone(data);
            setSuccess('Price group created!');
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const deleteZone = async (id) => {
        if (!confirm('Permanently delete this zone?')) return;
        setSaving(true);
        try {
            await supabase.from('shipping_zones').delete().eq('id', id);
            const remaining = zones.filter(z => z.id !== id);
            setZones(remaining);
            setMappings(mappings.filter(m => m.zone_id !== id));
            if (selectedZone?.id === id) setSelectedZone(remaining[0] || null);
            setSuccess('Zone removed.');
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const addLocation = (state) => {
        if (!selectedZone) return;
        const exists = mappings.find(m => m.zone_id === selectedZone.id && m.state_name === state && !m.district_name);
        if (exists) return;

        const filtered = mappings.filter(m => !(m.state_name === state && !m.district_name));
        setMappings([...filtered, { zone_id: selectedZone.id, state_name: state, district_name: null }]);
    };

    const removeMapping = (idx) => {
        setMappings(prev => prev.filter((_, i) => i !== idx));
    };

    const filteredStates = allStates.filter(s => s.toLowerCase().includes(stateSearch.toLowerCase()));

    if (!hasMounted) return null;

    return (
        <div className="shipping-layout">
            <header className="premium-header">
                <div>
                    <div className="breadcrumb">Logistics / Settings</div>
                    <h1>Shipping & Logistics</h1>
                    <p>Manage delivery price groups and regional coverage.</p>
                </div>
                <button onClick={saveChanges} disabled={saving} className="btn-primary-glow">
                    {saving ? <Loader2 className="spin" /> : <Save size={18} />}
                    <span>Save Network Configuration</span>
                </button>
            </header>

            {error && <div className="premium-toast error"><AlertCircle /> {error}</div>}
            {success && <div className="premium-toast success"><CheckCircle2 /> {success}</div>}

            <div className="shipping-grid">
                {/* Zones Sidebar */}
                <div className="zones-stack">
                    <div className="stack-header">
                        <h3>Price Groups</h3>
                        <button onClick={addZone} className="btn-icon-plus"><Plus size={16} /></button>
                    </div>

                    <div className="zones-list">
                        {zones.map(zone => (
                            <div
                                key={zone.id}
                                className={`zone-card ${selectedZone?.id === zone.id ? 'active' : ''}`}
                                onClick={() => setSelectedZone(zone)}
                            >
                                <div className="zone-icon">
                                    {zone.is_international ? <Globe size={18} /> : <MapPin size={18} />}
                                </div>
                                <div className="zone-info">
                                    <div className="title">{zone.name}</div>
                                    <div className="meta">₹{zone.rate} • {zone.is_international ? 'Global' : `${mappings.filter(m => m.zone_id === zone.id).length} regions`}</div>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); deleteZone(zone.id); }} className="btn-delete"><Trash2 size={14} /></button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Configuration Area */}
                <div className="config-area">
                    {selectedZone ? (
                        <div className="glass-panel animate-enter">
                            <div className="panel-header">
                                <h2>Configure {selectedZone.name}</h2>
                                <p>Set rates and assign geographical regions to this group.</p>
                            </div>

                            <div className="settings-row">
                                <div className="setting-input">
                                    <label>Price Group Title</label>
                                    <input
                                        type="text"
                                        value={selectedZone.name}
                                        onChange={e => handleUpdateZone(selectedZone.id, 'name', e.target.value)}
                                        placeholder="e.g. South India Express"
                                    />
                                </div>
                                <div className="setting-input">
                                    <label>Shipping Rate</label>
                                    <div className="input-prefix">
                                        <IndianRupee size={14} />
                                        <input
                                            type="number"
                                            value={selectedZone.rate}
                                            onChange={e => handleUpdateZone(selectedZone.id, 'rate', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="setting-input">
                                    <label>Free Threshold</label>
                                    <div className="input-prefix">
                                        <IndianRupee size={14} />
                                        <input
                                            type="number"
                                            value={selectedZone.free_threshold}
                                            onChange={e => handleUpdateZone(selectedZone.id, 'free_threshold', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="type-toggle">
                                <button className={!selectedZone.is_international ? 'active' : ''} onClick={() => handleUpdateZone(selectedZone.id, 'is_international', false)}>Domestic</button>
                                <button className={selectedZone.is_international ? 'active' : ''} onClick={() => handleUpdateZone(selectedZone.id, 'is_international', true)}>International</button>
                            </div>

                            {!selectedZone.is_international && (
                                <div className="region-manager">
                                    <div className="regions-header">
                                        <h3>Assigned Regions</h3>
                                        <p>Click on states below to add them to this group.</p>
                                    </div>

                                    <div className="tags-container">
                                        {mappings.filter(m => m.zone_id === selectedZone.id).map((m, i) => (
                                            <div key={i} className="region-tag">
                                                {m.state_name}
                                                <button onClick={() => removeMapping(mappings.indexOf(m))}><X size={12} /></button>
                                            </div>
                                        ))}
                                        {mappings.filter(m => m.zone_id === selectedZone.id).length === 0 && (
                                            <div className="empty-regions">No regions assigned. Select from below.</div>
                                        )}
                                    </div>

                                    <div className="state-picker">
                                        <div className="picker-search">
                                            <Search size={16} />
                                            <input placeholder="Search Indian States..." value={stateSearch} onChange={e => setStateSearch(e.target.value)} />
                                        </div>
                                        <div className="state-grid">
                                            {filteredStates.map(s => {
                                                const isAssigned = mappings.find(m => m.state_name === s && m.zone_id === selectedZone.id);
                                                const isInOther = mappings.find(m => m.state_name === s && m.zone_id !== selectedZone.id);

                                                return (
                                                    <button
                                                        key={s}
                                                        className={`state-btn ${isAssigned ? 'assigned' : ''} ${isInOther ? 'other' : ''}`}
                                                        onClick={() => addLocation(s)}
                                                    >
                                                        {s}
                                                        {isAssigned && <CheckCircle2 size={12} />}
                                                        {isInOther && <Info size={12} title="Assigned elsewhere" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selectedZone.is_international && (
                                <div className="intl-placeholder">
                                    <Globe size={48} />
                                    <h3>Global Coverage Active</h3>
                                    <p>This group will apply to all orders placed outside of India.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="empty-panel">
                            <Truck size={40} />
                            <h3>Select a price group to configure</h3>
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
                .shipping-layout { padding: 2rem; max-width: 1300px; margin: 0 auto; color: hsl(var(--text-main)); }
                
                .premium-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 3rem; }
                .breadcrumb { font-size: 0.75rem; color: hsl(var(--primary)); font-weight: 800; letter-spacing: 0.1em; margin-bottom: 0.5rem; text-transform: uppercase; }
                h1 { margin: 0; font-size: 2.5rem; font-weight: 900; color: hsl(var(--text-main)); }
                .premium-header p { color: hsl(var(--text-muted)); margin-top: 0.5rem; }

                .btn-primary-glow {
                    background: hsl(var(--primary)); color: white; border: none; padding: 0.8rem 1.75rem; border-radius: 16px; 
                    font-weight: 800; display: flex; align-items: center; gap: 0.75rem; cursor: pointer;
                    box-shadow: 0 10px 20px -5px hsl(var(--primary) / 0.4); transition: 0.3s;
                }
                .btn-primary-glow:hover { transform: translateY(-2px); box-shadow: 0 15px 30px -5px hsl(var(--primary) / 0.6); }

                .shipping-grid { display: grid; grid-template-columns: 320px 1fr; gap: 2rem; align-items: start; }

                /* ZONES STACK */
                .zones-stack { background: #ffffff; border: 1px solid hsl(var(--border-subtle)); border-radius: 24px; overflow: hidden; box-shadow: var(--shadow-sm); }
                .stack-header { padding: 1.5rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid hsl(var(--border-subtle)); }
                .stack-header h3 { margin: 0; font-size: 1rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: hsl(var(--text-muted)); }
                .btn-icon-plus { background: hsl(var(--primary)); color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
                .btn-icon-plus:hover { background: hsl(var(--primary-light)); transform: rotate(90deg); }

                .zones-list { padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
                .zone-card { 
                    padding: 1rem; border-radius: 16px; cursor: pointer; display: flex; align-items: center; gap: 1rem; 
                    border: 1px solid transparent; transition: 0.2s; background: #f1f5f9;
                }
                .zone-card:hover { background: hsl(var(--border-subtle)); }
                .zone-card.active { background: hsl(var(--primary) / 0.05); border-color: hsl(var(--primary) / 0.2); }
                .zone-icon { width: 40px; height: 40px; background: #ffffff; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: hsl(var(--text-dim)); transition: 0.2s; border: 1px solid hsl(var(--border-subtle)); }
                .zone-card.active .zone-icon { background: hsl(var(--primary)); color: white; border: none; }
                .zone-info .title { font-weight: 700; font-size: 0.95rem; color: hsl(var(--text-main)); }
                .zone-info .meta { font-size: 0.75rem; color: hsl(var(--text-muted)); margin-top: 0.2rem; }
                .btn-delete { margin-left: auto; opacity: 0; color: #ef4444; transition: 0.2s; font-weight: 900; }
                .zone-card:hover .btn-delete { opacity: 0.5; }
                .btn-delete:hover { opacity: 1 !important; transform: scale(1.2); }

                /* CONFIG AREA */
                .glass-panel { background: #ffffff; border: 1px solid hsl(var(--border-subtle)); border-radius: 32px; padding: 2.5rem; box-shadow: var(--shadow-card); }
                .panel-header h2 { margin: 0; font-size: 1.75rem; font-weight: 900; color: hsl(var(--text-main)); }
                .panel-header p { color: hsl(var(--text-muted)); margin-top: 0.4rem; margin-bottom: 2rem; }

                .settings-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem; }
                .setting-input label { display: block; font-size: 0.75rem; font-weight: 800; color: hsl(var(--text-muted)); text-transform: uppercase; margin-bottom: 0.5rem; }
                .setting-input input { width: 100%; border: 1px solid hsl(var(--border-subtle)); background: #f1f5f9; padding: 0.8rem 1rem; border-radius: 14px; color: hsl(var(--text-main)); font-weight: 600; outline: none; transition: 0.2s; }
                .setting-input input:focus { border-color: hsl(var(--primary)); background: white; }
                .input-prefix { position: relative; }
                .input-prefix svg { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: hsl(var(--primary)); opacity: 0.6; }
                .input-prefix input { padding-left: 2.5rem; }

                .type-toggle { display: flex; background: #f1f5f9; padding: 0.4rem; border-radius: 14px; border: 1px solid hsl(var(--border-subtle)); margin-bottom: 2.5rem; }
                .type-toggle button { flex: 1; padding: 0.75rem; border-radius: 10px; font-weight: 800; font-size: 0.85rem; color: hsl(var(--text-muted)); transition: 0.2s; }
                .type-toggle button.active { background: hsl(var(--primary)); color: white; box-shadow: 0 4px 15px hsl(var(--primary) / 0.3); }

                /* REGION MANAGER */
                .region-manager { border-top: 1px solid hsl(var(--border-subtle)); padding-top: 2rem; }
                .regions-header h3 { margin: 0; font-size: 1.1rem; color: hsl(var(--text-main)); }
                .regions-header p { font-size: 0.85rem; color: hsl(var(--text-muted)); margin-top: 0.25rem; }

                .tags-container { display: flex; flex-wrap: wrap; gap: 0.75rem; margin: 1.5rem 0 2rem; min-height: 44px; padding: 1rem; background: #f1f5f9; border-radius: 16px; border: 1px dashed hsl(var(--border-subtle)); }
                .region-tag { background: hsl(var(--primary) / 0.1); color: hsl(var(--primary)); border: 1px solid hsl(var(--primary) / 0.2); padding: 0.4rem 0.8rem; border-radius: 99px; font-size: 0.85rem; font-weight: 700; display: flex; align-items: center; gap: 0.6rem; }
                .region-tag button { display: flex; opacity: 0.6; transition: 0.2s; color: inherit; }
                .region-tag button:hover { opacity: 1; transform: scale(1.2); }
                .empty-regions { font-style: italic; color: rgba(255,255,255,0.3); font-size: 0.85rem; }

                .state-picker { background: #f1f5f9; border-radius: 20px; padding: 1.5rem; border: 1px solid hsl(var(--border-subtle)); }
                .picker-search { position: relative; margin-bottom: 1.5rem; }
                .picker-search svg { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: hsl(var(--text-dim)); }
                .picker-search input { width: 100%; background: white; border: 1px solid hsl(var(--border-subtle)); border-radius: 12px; padding: 0.75rem 1rem 0.75rem 3rem; color: hsl(var(--text-main)); outline: none; transition: 0.2s; }
                .picker-search input:focus { border-color: hsl(var(--primary)); }
                
                .state-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.6rem; max-height: 240px; overflow-y: auto; padding-right: 0.5rem; }
                .state-btn { 
                    padding: 0.6rem; border-radius: 10px; border: 1px solid hsl(var(--border-subtle)); background: white; 
                    font-size: 0.8rem; font-weight: 600; color: hsl(var(--text-muted)); text-align: left; display: flex; align-items: center; justify-content: space-between; transition: 0.2s;
                }
                .state-btn:hover { background: #f1f5f9; border-color: hsl(var(--primary) / 0.3); color: hsl(var(--text-main)); }
                .state-btn.assigned { background: hsl(var(--primary) / 0.05); border-color: hsl(var(--primary) / 0.3); color: hsl(var(--primary)); }
                .state-btn.other { opacity: 0.4; }

                .intl-placeholder { text-align: center; padding: 4rem 2rem; color: hsl(var(--text-dim)); display: flex; flex-direction: column; align-items: center; gap: 1rem; }
                .intl-placeholder h3 { color: hsl(var(--text-main)); margin: 0; }

                .premium-toast { position: fixed; bottom: 2rem; right: 2rem; padding: 1rem 2rem; border-radius: 16px; display: flex; align-items: center; gap: 1rem; font-weight: 800; z-index: 1000; animation: slideIn 0.3s ease-out; }
                .premium-toast.success { background: #22c55e; color: white; box-shadow: 0 10px 30px rgba(34,197,94,0.3); }
                .premium-toast.error { background: #ef4444; color: white; }

                .empty-panel { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: hsl(var(--text-dim)); gap: 1rem; border: 2px dashed hsl(var(--border-subtle)); border-radius: 32px; background: #f1f5f9; }

                .spin { animation: rotate 1s linear infinite; }
                @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes slideIn { from { transform: translateX(50px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

                @media (max-width: 1000px) {
                    .shipping-grid { grid-template-columns: 1fr; }
                    .settings-row { grid-template-columns: 1fr; gap: 1rem; }
                }
            `}</style>
        </div>
    );
}
