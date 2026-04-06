/* ── Inline sparkline (no extra deps) ── */
function Sparkline({ data, color }) {
    if (!data || data.length < 2) return null;
    const W = 72, H = 28;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    const pts = data.map((v, i) => {
        const x = (i / (data.length - 1)) * W;
        const y = H - ((v - min) / range) * (H - 4) - 2;
        return [x, y];
    });

    const linePts = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const fillPts = `${linePts} L${W},${H} L0,${H} Z`;
    const gradId = `sg${color.replace(/[^a-z0-9]/gi, '')}`;

    return (
        <svg width={W} height={H} className="overflow-visible shrink-0">
            <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={fillPts} fill={`url(#${gradId})`} />
            <path d={linePts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

export default function KPICard({ icon: Icon, title, value, delta, pct, sparkData, color = 'primary' }) {
    const colorMap = {
        primary: { grad: 'from-primary/10 to-primary/5', text: 'text-primary', hex: '#0047AB' },
        homme:   { grad: 'from-homme/10 to-homme/5',   text: 'text-homme',   hex: '#38BDF8' },
        femme:   { grad: 'from-femme/10 to-femme/5',   text: 'text-femme',   hex: '#FB7185' },
        success: { grad: 'from-success/10 to-success/5', text: 'text-success', hex: '#10B981' },
        danger:  { grad: 'from-danger/10 to-danger/5',  text: 'text-danger',  hex: '#EF4444' },
        warning: { grad: 'from-warning/10 to-warning/5', text: 'text-warning', hex: '#F59E0B' },
    };

    const c = colorMap[color] || colorMap.primary;
    const hasDelta = delta !== undefined && delta !== null;
    const pctPositive = pct != null && parseFloat(pct) > 0;
    const pctNegative = pct != null && parseFloat(pct) < 0;

    return (
        <div
            className="bg-card border border-border p-3 sm:p-5 transition-all duration-200 hover:-translate-y-0.5 min-w-0"
            style={{ borderRadius: '16px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.07)' }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 10px 20px -6px rgb(0 0 0 / 0.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 6px -1px rgb(0 0 0 / 0.07)'; }}
        >
            {/* Header: title + icon */}
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-medium text-text-secondary truncate">{title}</span>
                {Icon && (
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${c.grad} ${c.text} flex items-center justify-center shrink-0`}>
                        <Icon className="w-4.5 h-4.5" />
                    </div>
                )}
            </div>

            {/* Value + sparkline */}
            <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-xl sm:text-2xl font-bold text-text font-data tracking-tight leading-none">
                        {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
                    </div>

                    {/* Delta / progression badges */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {hasDelta && (
                            <span className={`text-xs font-semibold font-data ${delta > 0 ? 'text-success' : delta < 0 ? 'text-danger' : 'text-neutral'}`}>
                                {delta > 0 ? '+' : ''}{typeof delta === 'number' ? delta.toLocaleString('fr-FR') : delta}
                            </span>
                        )}
                        {pct != null && (
                            <span
                                className="text-xs font-bold px-1.5 py-0.5 rounded-full font-data"
                                style={{
                                    backgroundColor: pctPositive
                                        ? 'rgba(16,185,129,0.12)'
                                        : pctNegative ? 'rgba(239,68,68,0.12)' : 'rgba(148,163,184,0.12)',
                                    color: pctPositive ? '#10B981' : pctNegative ? '#EF4444' : '#94A3B8',
                                }}
                            >
                                {pctPositive ? '+' : ''}{pct}%
                            </span>
                        )}
                        {hasDelta && (
                            <span className="text-xs text-neutral">vs mois préc.</span>
                        )}
                    </div>
                </div>

                {/* Sparkline */}
                {sparkData && <Sparkline data={sparkData} color={c.hex} />}
            </div>
        </div>
    );
}
