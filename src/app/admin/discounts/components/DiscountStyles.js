'use client';

export default function DiscountStyles() {
    return (
        <style jsx global>{`
            .discounts-layout { padding: 2.5rem; max-width: 1400px; margin: 0 auto; color: #1e293b; font-family: inherit; }
            .page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem; }
            .breadcrumb { font-size: 0.75rem; color: #6366f1; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.4rem; }
            .discounts-layout h1 { margin: 0; font-size: 2.2rem; font-weight: 900; color: #0f172a; }
            .page-header p { color: #64748b; margin-top: 0.4rem; font-weight: 500; font-size: 0.95rem; }

            .btn-primary-glow { background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; border: none; padding: 0.85rem 1.8rem; border-radius: 14px; font-weight: 800; display: flex; align-items: center; gap: 0.65rem; cursor: pointer; box-shadow: 0 10px 20px -5px rgba(99,102,241,0.4); transition: 0.3s; font-size: 0.95rem; }
            .btn-primary-glow:hover { transform: translateY(-2px); box-shadow: 0 15px 30px -5px rgba(99,102,241,0.6); }

            .basis-btn { flex: 1; padding: 0.85rem 1.25rem; border-radius: 14px; border: 2px solid #e2e8f0; background: #f8fafc; color: #475569; font-weight: 800; font-size: 0.9rem; cursor: pointer; transition: all 0.2s ease; text-align: center; }
            .basis-btn:hover { border-color: #cbd5e1; background: #f1f5f9; }
            .basis-btn.active { border-color: #6366f1; background: #eef2ff; color: #4338ca; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.18); }

            /* STATS */
            .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.25rem; margin-bottom: 2rem; }
            .stat-card { background: white; padding: 1.25rem; border-radius: 20px; border: 1px solid #e2e8f0; display: flex; align-items: center; gap: 1rem; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
            .stat-icon { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; }
            .stat-icon.purple { background: #eef2ff; color: #6366f1; }
            .stat-icon.green { background: #f0fdf4; color: #16a34a; }
            .stat-icon.blue { background: #f0f9ff; color: #0284c7; }
            .stat-icon.amber { background: #fffbeb; color: #d97706; }
            .stat-val { font-size: 1.6rem; font-weight: 900; color: #0f172a; }
            .stat-label { font-size: 0.78rem; font-weight: 700; color: #64748b; text-transform: uppercase; }

            /* CONTROLS */
            .controls-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; gap: 1rem; flex-wrap: wrap; }
            .tab-buttons { display: flex; background: #f1f5f9; padding: 0.3rem; border-radius: 14px; gap: 0.3rem; border: 1px solid #e2e8f0; flex-wrap: wrap; }
            .tab-buttons button { padding: 0.65rem 1.25rem; border-radius: 10px; border: none; background: transparent; font-weight: 700; font-size: 0.85rem; color: #64748b; cursor: pointer; transition: 0.2s; }
            .tab-buttons button.active { background: white; color: #4f46e5; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }

            .search-box { position: relative; width: 320px; }
            .search-box svg { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: #94a3b8; }
            .search-box input { width: 100%; padding: 0.75rem 1rem 0.75rem 2.8rem; background: white; border: 1px solid #e2e8f0; border-radius: 14px; outline: none; font-weight: 600; font-size: 0.9rem; }

            /* RULES GRID */
            .rules-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1.5rem; }
            .rule-card { background: white; border-radius: 24px; border: 1px solid #e2e8f0; padding: 1.5rem; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 4px 20px rgba(0,0,0,0.03); transition: 0.3s; position: relative; }
            .rule-card:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0,0,0,0.08); border-color: #cbd5e1; }
            .rule-card.inactive { opacity: 0.75; }

            .rule-badge-row { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; margin-bottom: 1rem; }
            .status-pill { font-size: 0.7rem; font-weight: 800; padding: 0.25rem 0.6rem; border-radius: 99px; text-transform: uppercase; }
            .status-pill.active { background: #dcfce7; color: #15803d; }
            .status-pill.scheduled { background: #dbeafe; color: #1d4ed8; }
            .status-pill.expired { background: #f1f5f9; color: #64748b; }
            .coupon-code-tag { background: #fef3c7; color: #b45309; border: 1px dashed #f59e0b; padding: 0.2rem 0.6rem; border-radius: 8px; font-weight: 900; font-size: 0.75rem; display: flex; align-items: center; gap: 0.3rem; }
            .stackable-tag { background: #f3e8ff; color: #6b21a8; padding: 0.2rem 0.5rem; border-radius: 8px; font-weight: 800; font-size: 0.7rem; }

            .rule-title { margin: 0 0 0.4rem; font-size: 1.25rem; font-weight: 900; color: #0f172a; }
            .rule-desc { color: #64748b; font-size: 0.85rem; margin: 0 0 1rem; line-height: 1.4; }

            .rule-offer-box { background: linear-gradient(135deg, #f8fafc, #e2e8f0); border-radius: 16px; padding: 1rem; text-align: center; margin-bottom: 1.25rem; border: 1px solid #cbd5e1; }
            .offer-value { font-size: 1.75rem; font-weight: 900; color: #4f46e5; }
            .offer-meta { font-size: 0.78rem; font-weight: 700; color: #64748b; text-transform: uppercase; margin-top: 0.2rem; }

            .rule-details { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.8rem; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid #f1f5f9; }
            .detail-item { display: flex; justify-content: space-between; color: #64748b; }
            .detail-item .val { font-weight: 700; color: #0f172a; }

            .card-footer { display: flex; justify-content: space-between; align-items: center; }
            .action-btns { display: flex; gap: 0.5rem; }
            .btn-edit, .btn-trash { border: none; width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; }
            .btn-edit { background: #f1f5f9; color: #475569; }
            .btn-edit:hover { background: #e2e8f0; color: #0f172a; }
            .btn-trash { background: #fef2f2; color: #ef4444; }
            .btn-trash:hover { background: #fee2e2; }

            /* TOGGLE SWITCH */
            .toggle-switch { position: relative; display: inline-block; width: 44px; height: 24px; }
            .toggle-switch input { opacity: 0; width: 0; height: 0; }
            .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: .3s; border-radius: 34px; }
            .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; }
            input:checked + .slider { background-color: #22c55e; }
            input:checked + .slider:before { transform: translateX(20px); }

            /* FULL PAGE FORM FORMAT STYLES */
            .full-page-form { display: flex; flex-direction: column; gap: 1.5rem; }
            .form-header-bar { display: flex; justify-content: space-between; align-items: center; background: white; padding: 1.5rem 2rem; border-radius: 24px; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.03); flex-wrap: wrap; gap: 1rem; }
            .btn-back { background: #f1f5f9; border: 1px solid #cbd5e1; color: #475569; padding: 0.65rem 1.25rem; border-radius: 12px; font-weight: 700; font-size: 0.875rem; display: flex; align-items: center; gap: 0.5rem; cursor: pointer; transition: 0.2s; }
            .btn-back:hover { background: #e2e8f0; color: #0f172a; }
            .btn-secondary-outline { background: white; border: 1px solid #cbd5e1; color: #475569; padding: 0.8rem 1.5rem; border-radius: 14px; font-weight: 800; cursor: pointer; transition: 0.2s; font-size: 0.9rem; }
            .btn-secondary-outline:hover { background: #f8fafc; color: #0f172a; }

            .full-form-body { display: flex; flex-direction: column; gap: 1.5rem; }
            .form-section-card { background: white; border-radius: 24px; border: 1px solid #e2e8f0; padding: 2rem; box-shadow: 0 4px 20px rgba(0,0,0,0.03); }
            .section-title { display: flex; align-items: center; gap: 0.75rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 1rem; margin-bottom: 1.5rem; }
            .section-title h3 { margin: 0; font-size: 1.15rem; font-weight: 900; color: #0f172a; }

            .form-grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; }
            .form-grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; }

            .form-field { display: flex; flex-direction: column; gap: 0.4rem; }
            .field-label { font-size: 0.8rem; font-weight: 800; color: #334155; text-transform: uppercase; letter-spacing: 0.04em; }
            .req { color: #dc2626; }

            .styled-input, .styled-select, .styled-textarea { width: 100%; padding: 0.8rem 1rem; border-radius: 12px; border: 1px solid #cbd5e1; background: #f8fafc; outline: none; font-size: 0.95rem; font-weight: 600; color: #0f172a; transition: all 0.2s; }
            .styled-input:focus, .styled-select:focus, .styled-textarea:focus { border-color: #6366f1; background: white; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
            .uppercase { text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em; }

            .field-explain { font-size: 0.8rem; color: #64748b; font-weight: 500; margin-top: 2px; line-height: 1.35; }

            .picker-container { background: #f8fafc; padding: 1.25rem; border-radius: 16px; border: 1px dashed #cbd5e1; }
            .chip-grid { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-top: 0.6rem; }
            .chip-item { padding: 0.5rem 1rem; border-radius: 99px; border: 1px solid #cbd5e1; background: white; font-size: 0.85rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; transition: 0.2s; }
            .chip-item.selected { background: #eef2ff; border-color: #6366f1; color: #4f46e5; }

            .product-scroll-list { max-height: 220px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.6rem; padding-right: 0.4rem; }
            .product-select-row { display: flex; align-items: center; justify-content: space-between; padding: 0.65rem 1rem; border-radius: 12px; background: white; border: 1px solid #e2e8f0; cursor: pointer; transition: 0.2s; }
            .product-select-row.selected { background: #eef2ff; border-color: #6366f1; }

            .toggles-box { background: #f8fafc; padding: 1.25rem; border-radius: 16px; display: flex; flex-direction: column; gap: 1rem; }
            .custom-checkbox-row { display: flex; align-items: flex-start; gap: 0.85rem; cursor: pointer; }
            .custom-checkbox-row input { width: 18px; height: 18px; margin-top: 2px; accent-color: #6366f1; cursor: pointer; }
            .check-title { font-size: 0.9rem; font-weight: 800; color: #0f172a; }
            .check-desc { font-size: 0.8rem; color: #64748b; margin-top: 2px; }

            .form-footer-bar { display: flex; justify-content: flex-end; gap: 1rem; padding: 1.5rem 2rem; background: white; border-radius: 24px; border: 1px solid #e2e8f0; }

            .toast-bar { padding: 1rem 1.5rem; border-radius: 14px; font-weight: 800; font-size: 0.9rem; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.6rem; }
            .toast-bar.success { background: #dcfce7; color: #15803d; border-left: 4px solid #22c55e; }
            .toast-bar.error { background: #fef2f2; color: #b91c1c; border-left: 4px solid #ef4444; }

            .empty-card { background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 24px; padding: 4rem 2rem; text-align: center; color: #94a3b8; display: flex; flex-direction: column; align-items: center; gap: 1rem; }
            .loading-container { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem; color: #64748b; gap: 1rem; }

            .mt-2 { margin-top: 0.5rem; }
            .mt-3 { margin-top: 1rem; }
            .spin { animation: rotate 1s linear infinite; }
            @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            .animate-enter { animation: fadeIn 0.25s ease-out; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

            @media (max-width: 900px) {
                .discounts-layout { padding: 1.5rem 1rem; }
                .stats-grid { grid-template-columns: repeat(2, 1fr); }
                .controls-bar { flex-direction: column; align-items: stretch; }
                .controls-bar .search-box { width: 100% !important; }
                .page-header { flex-direction: column; align-items: flex-start; gap: 1rem; }
            }
            @media (max-width: 600px) {
                .stats-grid { grid-template-columns: 1fr; }
                .tab-buttons { width: 100%; overflow-x: auto; }
            }
        `}</style>
    );
}
