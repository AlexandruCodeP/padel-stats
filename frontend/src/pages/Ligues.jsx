import { useState, useEffect } from 'react';
import { Users, User, MapPin, TrendingUp } from 'lucide-react';
import { getLigues, getStats, getMois, getAnalyticsRegionTableau, getAnalyticsEvolutionLigues, getAnalyticsEvolutionTop100ParLigue, getAnalyticsEvolutionMoins18ParLigue, getAnalyticsEvolutionAssimilesParLigue } from '../api';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import KPICard from '../components/KPICard';
import FranceMap from '../components/FranceMap';

export default function LiguesPage() {
    const [ligues, setLigues] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedRegion, setSelectedRegion] = useState(null);
    const [moisList, setMoisList] = useState([]);
    const [mois, setMois] = useState('');
    const [genre, setGenre] = useState('');
    const [tableau, setTableau] = useState([]);
    const [tableauLoading, setTableauLoading] = useState(false);
    const [evoLigues, setEvoLigues] = useState({ ligues: [], data: [] });
    const [evoTop100, setEvoTop100] = useState({ ligues: [], data: [] });
    const [evoMoins18, setEvoMoins18] = useState({ ligues: [], data: [] });
    const [evoAssimiles, setEvoAssimiles] = useState({ ligues: [], data: [] });
    const [visibleLigues, setVisibleLigues] = useState(new Set());
    const [visibleTop100, setVisibleTop100] = useState(new Set());
    const [visibleMoins18, setVisibleMoins18] = useState(new Set());
    const [visibleAssimiles, setVisibleAssimiles] = useState(new Set());

    const COLORS = ['#0ea5e9', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#14b8a6', '#e11d48', '#a855f7'];
    const TOP_N = 8;

    useEffect(() => {
        Promise.all([
            getLigues(), getStats(), getMois(), getAnalyticsEvolutionLigues(),
            getAnalyticsEvolutionTop100ParLigue(), getAnalyticsEvolutionMoins18ParLigue(),
            getAnalyticsEvolutionAssimilesParLigue(),
        ]).then(([l, s, m, evo, evoT100, evoM18, evoAssi]) => {
            setLigues(l);
            setStats(s);
            setMoisList(m);
            if (m.length) setMois(m[0].mois);
            setEvoLigues(evo);
            setVisibleLigues(new Set(evo.ligues.slice(0, TOP_N)));
            setEvoTop100(evoT100);
            setVisibleTop100(new Set(evoT100.ligues.slice(0, TOP_N)));
            setEvoMoins18(evoM18);
            setVisibleMoins18(new Set(evoM18.ligues.slice(0, TOP_N)));
            setEvoAssimiles(evoAssi);
            setVisibleAssimiles(new Set(evoAssi.ligues.slice(0, TOP_N)));
            setLoading(false);
        });
    }, []);

    useEffect(() => {
        if (!mois) return;
        setTableauLoading(true);
        getAnalyticsRegionTableau(mois, genre || undefined).then(t => {
            setTableau(t);
            setTableauLoading(false);
        });
    }, [mois, genre]);

    const formatMoisLabel = (m) => {
        if (!m) return '';
        const [y, mo] = m.split('-');
        const months = ['', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
        return `${months[parseInt(mo)]} ${y}`;
    };

    const maxTotal = Math.max(...ligues.map(l => l.total), 1);

    const handleRegionClick = (region, data) => {
        setSelectedRegion(prev => prev === region.id ? null : region.id);
    };

    // Highlight selected region in table
    const isSelected = (ligue) => selectedRegion === ligue;

    return (
        <div>
            {/* Hero header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-6 mb-6">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
                <h1 className="text-2xl font-bold text-text relative">Ligues régionales</h1>
                <p className="text-text-secondary text-sm mt-1 relative">Répartition des joueurs par ligue — carte interactive</p>
            </div>

            {stats && (
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <KPICard icon={Users} title="Total" value={stats.total_joueurs} color="primary" />
                    <KPICard icon={User} title="Hommes" value={stats.hommes} color="homme" />
                    <KPICard icon={User} title="Femmes" value={stats.femmes} color="femme" />
                </div>
            )}

            {/* Map + Legend side by side */}
            {!loading && ligues.length > 0 && (
                <div className="grid lg:grid-cols-5 gap-6 mb-6">
                    {/* Interactive map */}
                    <div className="lg:col-span-3 bg-card rounded-xl border border-border p-5 shadow-sm">
                        <h3 className="font-semibold text-text mb-3 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-primary" /> Carte de France
                        </h3>
                        <FranceMap
                            ligues={ligues}
                            onRegionClick={handleRegionClick}
                        />
                        <div className="flex items-center gap-2 mt-3 text-xs text-text-secondary justify-center">
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-sm" style={{ background: 'rgb(224,242,254)' }} />
                                <span>Moins de joueurs</span>
                            </div>
                            <div className="w-12 h-2 rounded-full" style={{ background: 'linear-gradient(to right, rgb(224,242,254), rgb(14,165,233))' }} />
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-sm" style={{ background: 'rgb(14,165,233)' }} />
                                <span>Plus de joueurs</span>
                            </div>
                        </div>
                    </div>

                    {/* Top regions ranking */}
                    <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5 shadow-sm">
                        <h3 className="font-semibold text-text mb-3">Classement des ligues</h3>
                        <div className="space-y-2">
                            {ligues.slice(0, 13).map((l, i) => {
                                const pct = (l.total / maxTotal) * 100;
                                const femPct = ((l.femmes / l.total) * 100).toFixed(1);
                                const selected = isSelected(l.ligue);
                                return (
                                    <div
                                        key={i}
                                        onClick={() => setSelectedRegion(prev => prev === l.ligue ? null : l.ligue)}
                                        className={`relative p-3 rounded-lg cursor-pointer transition-all duration-200 group ${selected
                                            ? 'bg-primary/10 border border-primary/30 shadow-sm'
                                            : 'hover:bg-gray-50 border border-transparent'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${i < 3 ? 'bg-primary text-white' : 'bg-gray-100 text-text-secondary'}`}>
                                                    {i + 1}
                                                </span>
                                                <span className="font-semibold text-sm text-text">{l.ligue}</span>
                                            </div>
                                            <span className="font-bold text-sm text-text">{l.total.toLocaleString('fr-FR')}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden flex">
                                                <div
                                                    className="h-full bg-homme/60 transition-all duration-700"
                                                    style={{ width: `${((l.hommes / maxTotal) * 100)}%` }}
                                                />
                                                <div
                                                    className="h-full bg-femme/60 transition-all duration-700"
                                                    style={{ width: `${((l.femmes / maxTotal) * 100)}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-femme font-medium w-10 text-right">{femPct}% F</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Évolution des ligues dans le temps */}
            {evoLigues.data.length > 1 && (
                <div className="bg-card rounded-xl border border-border p-5 shadow-sm mb-6">
                    <h3 className="font-semibold text-text mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-primary" /> Évolution des ligues dans le temps
                    </h3>
                    <p className="text-text-secondary text-xs mb-3">Cliquez sur une ligue pour l'afficher ou la masquer</p>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                        <button
                            onClick={() => setVisibleLigues(new Set(evoLigues.ligues.slice(0, TOP_N)))}
                            className="px-2.5 py-1 rounded-full text-xs font-medium border border-border bg-white text-text-secondary hover:bg-gray-50 transition-colors"
                        >
                            Top {TOP_N}
                        </button>
                        <button
                            onClick={() => setVisibleLigues(prev => prev.size === evoLigues.ligues.length ? new Set(evoLigues.ligues.slice(0, TOP_N)) : new Set(evoLigues.ligues))}
                            className="px-2.5 py-1 rounded-full text-xs font-medium border border-border bg-white text-text-secondary hover:bg-gray-50 transition-colors"
                        >
                            {visibleLigues.size === evoLigues.ligues.length ? 'Réduire' : 'Toutes'}
                        </button>
                        <div className="w-px bg-border mx-1" />
                        {evoLigues.ligues.map((ligue, i) => {
                            const color = COLORS[i % COLORS.length];
                            const active = visibleLigues.has(ligue);
                            return (
                                <button
                                    key={ligue}
                                    onClick={() => setVisibleLigues(prev => {
                                        const next = new Set(prev);
                                        next.has(ligue) ? next.delete(ligue) : next.add(ligue);
                                        return next;
                                    })}
                                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 border ${active ? 'text-white shadow-sm' : 'bg-white text-text-secondary/50 border-border'}`}
                                    style={active ? { backgroundColor: color, borderColor: color } : {}}
                                >
                                    {ligue}
                                </button>
                            );
                        })}
                    </div>
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={evoLigues.data}>
                            <XAxis dataKey="mois" tickFormatter={formatMoisLabel} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => v.toLocaleString('fr-FR')} />
                            <Tooltip
                                content={({ active, payload, label }) => {
                                    if (!active || !payload?.length) return null;
                                    const sorted = [...payload].sort((a, b) => (b.value || 0) - (a.value || 0));
                                    return (
                                        <div className="bg-slate-900 text-white text-xs rounded-xl px-3 py-2 shadow-xl">
                                            <p className="font-semibold mb-1">{formatMoisLabel(label)}</p>
                                            {sorted.map((p, i) => (
                                                <p key={i} style={{ color: p.color }}>
                                                    {p.name} : {typeof p.value === 'number' ? p.value.toLocaleString('fr-FR') : p.value}
                                                </p>
                                            ))}
                                        </div>
                                    );
                                }}
                            />
                            {evoLigues.ligues.map((ligue, i) => visibleLigues.has(ligue) && (
                                <Line key={ligue} type="monotone" dataKey={ligue} name={ligue} stroke={COLORS[i % COLORS.length]} strokeWidth={2.5} dot={false} connectNulls />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Évolution du Top 100 par ligue */}
            {evoTop100.data.length > 1 && (
                <div className="bg-card rounded-xl border border-border p-5 shadow-sm mb-6">
                    <h3 className="font-semibold text-text mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-yellow-500" /> Évolution du nombre de Top 100 par ligue
                    </h3>
                    <p className="text-text-secondary text-xs mb-3">Cliquez sur une ligue pour l'afficher ou la masquer</p>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                        <button onClick={() => setVisibleTop100(new Set(evoTop100.ligues.slice(0, TOP_N)))}
                            className="px-2.5 py-1 rounded-full text-xs font-medium border border-border bg-white dark:bg-slate-800 text-text-secondary hover:bg-gray-50 transition-colors">Top {TOP_N}</button>
                        <button onClick={() => setVisibleTop100(prev => prev.size === evoTop100.ligues.length ? new Set(evoTop100.ligues.slice(0, TOP_N)) : new Set(evoTop100.ligues))}
                            className="px-2.5 py-1 rounded-full text-xs font-medium border border-border bg-white dark:bg-slate-800 text-text-secondary hover:bg-gray-50 transition-colors">
                            {visibleTop100.size === evoTop100.ligues.length ? 'Réduire' : 'Toutes'}</button>
                        <div className="w-px bg-border mx-1" />
                        {evoTop100.ligues.map((ligue, i) => {
                            const color = COLORS[i % COLORS.length]; const active = visibleTop100.has(ligue);
                            return (<button key={ligue} onClick={() => setVisibleTop100(prev => { const next = new Set(prev); next.has(ligue) ? next.delete(ligue) : next.add(ligue); return next; })}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 border ${active ? 'text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-text-secondary/50 border-border'}`}
                                style={active ? { backgroundColor: color, borderColor: color } : {}}>{ligue}</button>);
                        })}
                    </div>
                    <ResponsiveContainer width="100%" height={350}>
                        <LineChart data={evoTop100.data}>
                            <XAxis dataKey="mois" tickFormatter={formatMoisLabel} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <Tooltip content={({ active, payload, label }) => {
                                if (!active || !payload?.length) return null;
                                const sorted = [...payload].sort((a, b) => (b.value || 0) - (a.value || 0));
                                return (<div className="bg-slate-900 text-white text-xs rounded-xl px-3 py-2 shadow-xl">
                                    <p className="font-semibold mb-1">{formatMoisLabel(label)}</p>
                                    {sorted.map((p, i) => (<p key={i} style={{ color: p.color }}>{p.name} : {p.value}</p>))}
                                </div>);
                            }} />
                            {evoTop100.ligues.map((ligue, i) => visibleTop100.has(ligue) && (
                                <Line key={ligue} type="monotone" dataKey={ligue} name={ligue} stroke={COLORS[i % COLORS.length]} strokeWidth={2.5} dot={false} connectNulls />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Évolution des moins de 18 ans par ligue */}
            {evoMoins18.data.length > 1 && (
                <div className="bg-card rounded-xl border border-border p-5 shadow-sm mb-6">
                    <h3 className="font-semibold text-text mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-green-500" /> Évolution des moins de 18 ans par ligue
                    </h3>
                    <p className="text-text-secondary text-xs mb-3">Cliquez sur une ligue pour l'afficher ou la masquer</p>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                        <button onClick={() => setVisibleMoins18(new Set(evoMoins18.ligues.slice(0, TOP_N)))}
                            className="px-2.5 py-1 rounded-full text-xs font-medium border border-border bg-white dark:bg-slate-800 text-text-secondary hover:bg-gray-50 transition-colors">Top {TOP_N}</button>
                        <button onClick={() => setVisibleMoins18(prev => prev.size === evoMoins18.ligues.length ? new Set(evoMoins18.ligues.slice(0, TOP_N)) : new Set(evoMoins18.ligues))}
                            className="px-2.5 py-1 rounded-full text-xs font-medium border border-border bg-white dark:bg-slate-800 text-text-secondary hover:bg-gray-50 transition-colors">
                            {visibleMoins18.size === evoMoins18.ligues.length ? 'Réduire' : 'Toutes'}</button>
                        <div className="w-px bg-border mx-1" />
                        {evoMoins18.ligues.map((ligue, i) => {
                            const color = COLORS[i % COLORS.length]; const active = visibleMoins18.has(ligue);
                            return (<button key={ligue} onClick={() => setVisibleMoins18(prev => { const next = new Set(prev); next.has(ligue) ? next.delete(ligue) : next.add(ligue); return next; })}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 border ${active ? 'text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-text-secondary/50 border-border'}`}
                                style={active ? { backgroundColor: color, borderColor: color } : {}}>{ligue}</button>);
                        })}
                    </div>
                    <ResponsiveContainer width="100%" height={350}>
                        <LineChart data={evoMoins18.data}>
                            <XAxis dataKey="mois" tickFormatter={formatMoisLabel} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <Tooltip content={({ active, payload, label }) => {
                                if (!active || !payload?.length) return null;
                                const sorted = [...payload].sort((a, b) => (b.value || 0) - (a.value || 0));
                                return (<div className="bg-slate-900 text-white text-xs rounded-xl px-3 py-2 shadow-xl">
                                    <p className="font-semibold mb-1">{formatMoisLabel(label)}</p>
                                    {sorted.map((p, i) => (<p key={i} style={{ color: p.color }}>{p.name} : {p.value}</p>))}
                                </div>);
                            }} />
                            {evoMoins18.ligues.map((ligue, i) => visibleMoins18.has(ligue) && (
                                <Line key={ligue} type="monotone" dataKey={ligue} name={ligue} stroke={COLORS[i % COLORS.length]} strokeWidth={2.5} dot={false} connectNulls />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Évolution des joueurs assimilés par ligue */}
            {evoAssimiles.data.length > 1 && (
                <div className="bg-card rounded-xl border border-border p-5 shadow-sm mb-6">
                    <h3 className="font-semibold text-text mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-purple-500" /> Évolution des joueurs assimilés par ligue
                    </h3>
                    <p className="text-text-secondary text-xs mb-3">Cliquez sur une ligue pour l'afficher ou la masquer</p>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                        <button onClick={() => setVisibleAssimiles(new Set(evoAssimiles.ligues.slice(0, TOP_N)))}
                            className="px-2.5 py-1 rounded-full text-xs font-medium border border-border bg-white dark:bg-slate-800 text-text-secondary hover:bg-gray-50 transition-colors">Top {TOP_N}</button>
                        <button onClick={() => setVisibleAssimiles(prev => prev.size === evoAssimiles.ligues.length ? new Set(evoAssimiles.ligues.slice(0, TOP_N)) : new Set(evoAssimiles.ligues))}
                            className="px-2.5 py-1 rounded-full text-xs font-medium border border-border bg-white dark:bg-slate-800 text-text-secondary hover:bg-gray-50 transition-colors">
                            {visibleAssimiles.size === evoAssimiles.ligues.length ? 'Réduire' : 'Toutes'}</button>
                        <div className="w-px bg-border mx-1" />
                        {evoAssimiles.ligues.map((ligue, i) => {
                            const color = COLORS[i % COLORS.length]; const active = visibleAssimiles.has(ligue);
                            return (<button key={ligue} onClick={() => setVisibleAssimiles(prev => { const next = new Set(prev); next.has(ligue) ? next.delete(ligue) : next.add(ligue); return next; })}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 border ${active ? 'text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-text-secondary/50 border-border'}`}
                                style={active ? { backgroundColor: color, borderColor: color } : {}}>{ligue}</button>);
                        })}
                    </div>
                    <ResponsiveContainer width="100%" height={350}>
                        <LineChart data={evoAssimiles.data}>
                            <XAxis dataKey="mois" tickFormatter={formatMoisLabel} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <Tooltip content={({ active, payload, label }) => {
                                if (!active || !payload?.length) return null;
                                const sorted = [...payload].sort((a, b) => (b.value || 0) - (a.value || 0));
                                return (<div className="bg-slate-900 text-white text-xs rounded-xl px-3 py-2 shadow-xl">
                                    <p className="font-semibold mb-1">{formatMoisLabel(label)}</p>
                                    {sorted.map((p, i) => (<p key={i} style={{ color: p.color }}>{p.name} : {p.value}</p>))}
                                </div>);
                            }} />
                            {evoAssimiles.ligues.map((ligue, i) => visibleAssimiles.has(ligue) && (
                                <Line key={ligue} type="monotone" dataKey={ligue} name={ligue} stroke={COLORS[i % COLORS.length]} strokeWidth={2.5} dot={false} connectNulls />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Tableau récapitulatif enrichi */}
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="p-5 border-b border-border flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-semibold text-text">Tableau récapitulatif par région</h3>
                    <div className="flex items-center gap-3">
                        <select value={mois} onChange={e => setMois(e.target.value)}
                            className="px-3 py-1.5 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20">
                            {moisList.map(m => <option key={m.mois} value={m.mois}>{formatMoisLabel(m.mois)}</option>)}
                        </select>
                        <div className="flex rounded-xl border border-border overflow-hidden">
                            {[{ val: '', label: 'Tous' }, { val: 'H', label: 'H' }, { val: 'F', label: 'F' }].map(g => (
                                <button key={g.val} onClick={() => setGenre(g.val)}
                                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${genre === g.val ? 'bg-primary text-white' : 'bg-white text-text-secondary hover:bg-gray-50'}`}>
                                    {g.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                {tableauLoading ? (
                    <div className="p-6 space-y-3">
                        {[...Array(5)].map((_, i) => <div key={i} className="animate-pulse h-8 bg-gray-200 rounded" />)}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="px-3 py-3 text-left font-medium text-text-secondary">#</th>
                                    <th className="px-3 py-3 text-left font-medium text-text-secondary">Ligue</th>
                                    <th className="px-3 py-3 text-right font-medium text-text-secondary">Total</th>
                                    <th className="px-3 py-3 text-right font-medium text-text-secondary text-homme">H</th>
                                    <th className="px-3 py-3 text-right font-medium text-text-secondary text-femme">F</th>
                                    <th className="px-3 py-3 text-right font-medium text-text-secondary text-femme">%F</th>
                                    <th className="px-3 py-3 text-right font-medium text-text-secondary">Âge moy.</th>
                                    <th className="px-3 py-3 text-right font-medium text-text-secondary">Top 100</th>
                                    <th className="px-3 py-3 text-right font-medium text-text-secondary">Top 500</th>
                                    <th className="px-3 py-3 text-right font-medium text-text-secondary">Top 1000</th>
                                    <th className="px-3 py-3 text-right font-medium text-text-secondary">Top 5000</th>
                                    <th className="px-3 py-3 text-right font-medium text-text-secondary">-18 ans</th>
                                    <th className="px-3 py-3 text-right font-medium text-text-secondary">18-30</th>
                                    <th className="px-3 py-3 text-right font-medium text-text-secondary">31-50</th>
                                    <th className="px-3 py-3 text-right font-medium text-text-secondary">51+</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tableau.map((l, i) => (
                                    <tr key={i} className={`border-t border-border transition-colors ${isSelected(l.ligue) ? 'bg-primary/5' : 'hover:bg-gray-50'}`}>
                                        <td className="px-3 py-2.5 font-bold text-text-secondary">{i + 1}</td>
                                        <td className="px-3 py-2.5 font-semibold text-text whitespace-nowrap">{l.ligue}</td>
                                        <td className="px-3 py-2.5 text-right font-medium">{l.total.toLocaleString('fr-FR')}</td>
                                        <td className="px-3 py-2.5 text-right text-homme">{l.hommes.toLocaleString('fr-FR')}</td>
                                        <td className="px-3 py-2.5 text-right text-femme">{l.femmes.toLocaleString('fr-FR')}</td>
                                        <td className="px-3 py-2.5 text-right">
                                            <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${l.pct_femmes >= 30 ? 'bg-femme/10 text-femme' : 'bg-gray-100 text-text-secondary'}`}>
                                                {l.pct_femmes}%
                                            </span>
                                        </td>
                                        <td className="px-3 py-2.5 text-right">{l.avg_age > 0 ? `${l.avg_age} ans` : '-'}</td>
                                        <td className="px-3 py-2.5 text-right font-medium text-yellow-600">{l.top100 || 0}</td>
                                        <td className="px-3 py-2.5 text-right">{l.top500 || 0}</td>
                                        <td className="px-3 py-2.5 text-right">{l.top1000 || 0}</td>
                                        <td className="px-3 py-2.5 text-right text-text-secondary">{l.top5000 || 0}</td>
                                        <td className="px-3 py-2.5 text-right text-text-secondary">{l.age_moins18 || 0}</td>
                                        <td className="px-3 py-2.5 text-right">{l.age_18_30 || 0}</td>
                                        <td className="px-3 py-2.5 text-right">{l.age_31_50 || 0}</td>
                                        <td className="px-3 py-2.5 text-right text-text-secondary">{l.age_plus50 || 0}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
