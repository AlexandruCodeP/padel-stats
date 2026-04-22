import { useState, useEffect } from 'react';
import { Users, TrendingUp, TrendingDown, Activity, Calendar } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    AreaChart, Area, Legend,
} from 'recharts';
import {
    getMois, getDashboardOverview, getDashboardProgressions, getDashboardChutes,
    getDashboardEvolution, getDashboardAges, getDashboardLigues
} from '../api';
import KPICard from '../components/KPICard';
import { useNavigate } from 'react-router-dom';

const HOMME = '#38BDF8';
const FEMME = '#FB7185';

/* ── Shared dark tooltip ── */
const DarkTooltip = ({ active, payload, label, labelFormatter }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            backgroundColor: '#0F172A', borderRadius: '12px',
            padding: '10px 14px', border: 'none',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.4)',
        }}>
            <div style={{ color: '#94A3B8', fontSize: '11px', marginBottom: '5px', fontWeight: '500' }}>
                {labelFormatter ? labelFormatter(label) : label}
            </div>
            {payload.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: p.color ?? HOMME, flexShrink: 0 }} />
                    <span style={{ color: '#94A3B8', fontSize: '12px' }}>{p.name}:</span>
                    <span style={{ color: '#F8FAFC', fontSize: '13px', fontWeight: '600', fontFamily: 'var(--font-mono)' }}>
                        {typeof p.value === 'number' ? p.value.toLocaleString('fr-FR') : p.value}
                    </span>
                </div>
            ))}
        </div>
    );
};

const CARD_STYLE = { borderRadius: '16px' };

export default function Dashboard() {
    const navigate = useNavigate();
    const [moisList, setMoisList] = useState([]);
    const [mois, setMois] = useState('');
    const [genre, setGenre] = useState('');
    const [overview, setOverview] = useState(null);
    const [progressions, setProgressions] = useState([]);
    const [chutes, setChutes] = useState([]);
    const [progressionsH, setProgressionsH] = useState([]);
    const [progressionsF, setProgressionsF] = useState([]);
    const [chutesH, setChutesH] = useState([]);
    const [chutesF, setChutesF] = useState([]);
    const [excludeAssimiles, setExcludeAssimiles] = useState(false);
    const [evolution, setEvolution] = useState([]);
    const [ages, setAges] = useState([]);
    const [ligues, setLigues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [rangMax, setRangMax] = useState(1000);

    useEffect(() => {
        getMois().then(m => {
            setMoisList(m);
            if (m.length > 0) setMois(m[0].mois);
        });
    }, []);

    useEffect(() => {
        if (!mois) return;
        setLoading(true);
        const g = genre || undefined;
        Promise.all([
            getDashboardOverview(mois, g),
            getDashboardEvolution(g),
            getDashboardAges(mois, g),
            getDashboardLigues(mois, g),
        ]).then(([o, e, a, l]) => {
            setOverview(o);
            setEvolution(e); setAges(a); setLigues(l);
            setLoading(false);
        });
    }, [mois, genre]);

    // Progressions & chutes: split by gender when "Tous", with rangMax + assimilés filter
    useEffect(() => {
        if (!mois) return;
        const g = genre || undefined;
        const rm = rangMax === 0 ? null : rangMax;
        const ea = excludeAssimiles;
        if (genre) {
            Promise.all([
                getDashboardProgressions(mois, g, 10, rm, ea),
                getDashboardChutes(mois, g, 10, rm, ea),
            ]).then(([p, c]) => {
                setProgressions(p); setChutes(c);
                setProgressionsH([]); setProgressionsF([]);
                setChutesH([]); setChutesF([]);
            });
        } else {
            Promise.all([
                getDashboardProgressions(mois, 'H', 10, rm, ea),
                getDashboardProgressions(mois, 'F', 10, rm, ea),
                getDashboardChutes(mois, 'H', 10, rm, ea),
                getDashboardChutes(mois, 'F', 10, rm, ea),
            ]).then(([progH, progF, chH, chF]) => {
                setProgressions([]); setChutes([]);
                setProgressionsH(progH); setProgressionsF(progF);
                setChutesH(chH); setChutesF(chF);
            });
        }
    }, [mois, genre, rangMax, excludeAssimiles]);

    const formatMoisLabel = (m) => {
        if (!m) return '';
        const [y, mo] = m.split('-');
        const months = ['', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
        return `${months[parseInt(mo)]} ${y}`;
    };

    if (loading) return (
        <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 w-1/3" style={{ borderRadius: '12px' }} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-200" style={CARD_STYLE} />)}
            </div>
            <div className="grid md:grid-cols-2 gap-6">
                {[...Array(4)].map((_, i) => <div key={i} className="h-64 bg-gray-200" style={CARD_STYLE} />)}
            </div>
        </div>
    );

    const sparkTotal = evolution.slice(-8).map(e => (e.hommes || 0) + (e.femmes || 0));
    const prevTotal = overview?.prev_total ?? null;
    const deltaPct = prevTotal && overview?.total && prevTotal !== overview.total
        ? (((overview.total - prevTotal) / prevTotal) * 100).toFixed(1)
        : null;

    return (
        <div>
            {/* ── Header ── */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-text tracking-tight">Dashboard</h1>
                    <p className="text-text-secondary text-sm mt-0.5">Vue d'ensemble du padel français</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <select value={mois} onChange={e => setMois(e.target.value)}
                        className="px-3 py-2 border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        style={{ borderRadius: '12px' }}>
                        {moisList.map(m => <option key={m.mois} value={m.mois}>{formatMoisLabel(m.mois)}</option>)}
                    </select>
                    <div className="flex border border-border overflow-hidden" style={{ borderRadius: '12px' }}>
                        {[{ val: '', label: 'Tous' }, { val: 'H', label: 'H' }, { val: 'F', label: 'F' }].map(g => (
                            <button key={g.val} onClick={() => setGenre(g.val)}
                                className="px-3 py-2 text-sm font-medium transition-all duration-200"
                                style={genre === g.val ? { backgroundColor: '#0047AB', color: '#fff' } : { backgroundColor: 'white', color: '#64748B' }}>
                                {g.label}
                            </button>
                        ))}
                    </div>
                    <button onClick={() => setExcludeAssimiles(v => !v)}
                        className="px-3 py-2 text-sm font-medium border transition-all duration-200"
                        style={{
                            borderRadius: '12px',
                            ...(excludeAssimiles
                                ? { backgroundColor: '#f59e0b', color: '#fff', borderColor: '#f59e0b' }
                                : { backgroundColor: 'white', color: '#64748B', borderColor: '#e2e8f0' })
                        }}>
                        Hors assimilés
                    </button>
                </div>
            </div>

            {/* ── KPI Cards ── */}
            {overview && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <KPICard
                        icon={Users} title="Joueurs classés" value={overview.total}
                        delta={prevTotal != null ? overview.total - prevTotal : undefined}
                        pct={deltaPct}
                        sparkData={sparkTotal.length > 1 ? sparkTotal : undefined}
                        color="primary"
                    />
                    <KPICard icon={Activity} title="Points moyen" value={overview.avg_points} color="success" />
                    <KPICard icon={Calendar} title="Tournois moyen" value={overview.avg_tournois} color="warning" />
                    <KPICard icon={Users} title="Âge moyen" value={overview.avg_age} color="homme" />
                </div>
            )}

            {/* ── Charts row 1 ── */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
                {overview?.distribution && (
                    <div className="bg-card border border-border p-5 shadow-sm" style={CARD_STYLE}>
                        <h3 className="font-semibold text-text mb-1 tracking-tight">Distribution par points</h3>
                        <p className="text-xs text-text-secondary mb-4">Nombre de joueurs classés par tranche de points FFT</p>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={overview.distribution} layout="vertical" margin={{ left: 10 }}>
                                <XAxis type="number" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                                <YAxis type="category" dataKey="tranche" tick={{ fontSize: 11, fill: '#94A3B8' }} width={70} axisLine={false} tickLine={false} />
                                <Tooltip content={<DarkTooltip />} />
                                <Bar dataKey="count" fill={HOMME} radius={[0, 8, 8, 0]} name="Joueurs" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {ages.length > 0 && (
                    <div className="bg-card border border-border p-5 shadow-sm" style={CARD_STYLE}>
                        <h3 className="font-semibold text-text mb-4 tracking-tight">Distribution par âge</h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={ages}>
                                <XAxis dataKey="tranche" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                                <Tooltip content={<DarkTooltip />} />
                                <Legend wrapperStyle={{ fontSize: '12px' }} />
                                <Bar dataKey="hommes" fill={HOMME} name="Hommes" radius={[8, 8, 0, 0]} />
                                <Bar dataKey="femmes" fill={FEMME} name="Femmes" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* ── Evolution Area chart with gradients ── */}
            {evolution.length > 0 && (
                <div className="bg-card border border-border p-5 shadow-sm mb-6" style={CARD_STYLE}>
                    <h3 className="font-semibold text-text mb-4 tracking-tight">Évolution du nombre de joueurs classés</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={evolution}>
                            <defs>
                                <linearGradient id="gradH" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={HOMME} stopOpacity={0.4} />
                                    <stop offset="95%" stopColor={HOMME} stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gradF" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={FEMME} stopOpacity={0.4} />
                                    <stop offset="95%" stopColor={FEMME} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="mois" tickFormatter={formatMoisLabel} tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                            <Tooltip content={<DarkTooltip labelFormatter={formatMoisLabel} />} />
                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                            <Area type="monotone" dataKey="hommes" stackId="1" stroke={HOMME} fill="url(#gradH)" strokeWidth={2} name="Hommes" />
                            <Area type="monotone" dataKey="femmes" stackId="1" stroke={FEMME} fill="url(#gradF)" strokeWidth={2} name="Femmes" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* ── Ligues + Progressions / Chutes ── */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
                {ligues.length > 0 && (() => {
                    const abbrMap = {
                        'PROVENCE ALPES COTE D\'AZUR': 'PACA', 'AUVERGNE RHONE-ALPES': 'ARA',
                        'NOUVELLE AQUITAINE': 'N-AQ.', 'ILE DE FRANCE': 'IDF',
                        'HAUTS DE FRANCE': 'HDF', 'BOURGOGNE FRANCHE COMTE': 'BFC',
                        'CENTRE VAL DE LOIRE': 'CVL', 'PAYS DE LA LOIRE': 'PDL',
                        'GRAND EST': 'GD EST', 'REUNION - MAYOTTE': 'REU-MAY',
                        'GUADELOUPE - MARTINIQUE - GUYANE': 'DOM',
                    };
                    const abbrLigues = ligues.slice(0, 10).map(l => ({
                        ...l, ligue_short: abbrMap[l.ligue] || l.ligue.slice(0, 9),
                    }));
                    return (
                        <div className="bg-card border border-border p-5 shadow-sm" style={CARD_STYLE}>
                            <h3 className="font-semibold text-text mb-4 tracking-tight">Top 10 ligues</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={abbrLigues} layout="vertical" margin={{ left: 10 }}>
                                    <XAxis type="number" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                                    <YAxis type="category" dataKey="ligue_short" tick={{ fontSize: 11, fill: '#94A3B8' }} width={78} axisLine={false} tickLine={false} />
                                    <Tooltip content={<DarkTooltip labelFormatter={(l, p) => p?.[0]?.payload?.ligue || l} />} />
                                    <Bar dataKey="total" fill={HOMME} radius={[0, 8, 8, 0]} name="Joueurs" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    );
                })()}

                <div className="space-y-4">
                    {/* Rank filter shared by progressions & chutes */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-text-secondary font-medium mr-1">Filtre rang :</span>
                        {[{ val: 10, label: 'Top 10' }, { val: 20, label: 'Top 20' }, { val: 50, label: 'Top 50' }, { val: 100, label: 'Top 100' }, { val: 200, label: 'Top 200' }, { val: 500, label: 'Top 500' }, { val: 1000, label: 'Top 1000' }, { val: 0, label: '∞' }].map(opt => (
                            <button key={opt.val} onClick={() => setRangMax(opt.val)}
                                className="px-2.5 py-1 rounded-full text-xs font-medium border transition-colors"
                                style={rangMax === opt.val
                                    ? { backgroundColor: '#0047AB', color: '#fff', borderColor: '#0047AB' }
                                    : { backgroundColor: 'white', color: '#64748B', borderColor: '#E2E8F0' }}>
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    {(genre ? [{ list: progressions, label: 'Top progressions', badge: null }] : [
                        { list: progressionsH, label: 'Top progressions', badge: { text: 'Hommes', cls: 'text-homme border-homme/30 bg-homme/5' } },
                        { list: progressionsF, label: 'Top progressions', badge: { text: 'Dames', cls: 'text-femme border-femme/30 bg-femme/5' } },
                    ]).map(({ list, label, badge }, idx) => (
                        <div key={`prog-${idx}`} className="bg-card border border-border p-5 shadow-sm" style={CARD_STYLE}>
                            <h3 className="font-semibold text-text mb-3 flex items-center gap-2 tracking-tight">
                                <TrendingUp className="w-4 h-4 text-success" /> {label}
                                {badge && <span className={`text-xs px-2 py-0.5 rounded-full border ${badge.cls}`}>{badge.text}</span>}
                            </h3>
                            <div className="space-y-1">
                                {list.slice(0, 5).map((j, i) => (
                                    <div key={i} onClick={() => navigate(`/joueur/${j.id}`)}
                                        className="flex items-center justify-between p-2.5 cursor-pointer transition-all duration-200 hover:bg-slate-50"
                                        style={{ borderRadius: '10px' }}>
                                        <div>
                                            <span className="font-medium text-sm text-text">{j.prenom} {j.nom}</span>
                                            <span className="text-xs text-text-secondary ml-2 font-data">#{j.rang + parseInt(j.evolution || 0)} → #{j.rang}</span>
                                        </div>
                                        <span className="text-xs font-bold px-2 py-0.5 font-data"
                                            style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10B981', borderRadius: '999px' }}>
                                            {j.evolution}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {(genre ? [{ list: chutes, label: 'Top chutes', badge: null }] : [
                        { list: chutesH, label: 'Top chutes', badge: { text: 'Hommes', cls: 'text-homme border-homme/30 bg-homme/5' } },
                        { list: chutesF, label: 'Top chutes', badge: { text: 'Dames', cls: 'text-femme border-femme/30 bg-femme/5' } },
                    ]).map(({ list, label, badge }, idx) => (
                        <div key={`chute-${idx}`} className="bg-card border border-border p-5 shadow-sm" style={CARD_STYLE}>
                            <h3 className="font-semibold text-text mb-3 flex items-center gap-2 tracking-tight">
                                <TrendingDown className="w-4 h-4 text-danger" /> {label}
                                {badge && <span className={`text-xs px-2 py-0.5 rounded-full border ${badge.cls}`}>{badge.text}</span>}
                            </h3>
                            <div className="space-y-1">
                                {list.slice(0, 5).map((j, i) => (
                                    <div key={i} onClick={() => navigate(`/joueur/${j.id}`)}
                                        className="flex items-center justify-between p-2.5 cursor-pointer transition-all duration-200 hover:bg-slate-50"
                                        style={{ borderRadius: '10px' }}>
                                        <div>
                                            <span className="font-medium text-sm text-text">{j.prenom} {j.nom}</span>
                                            <span className="text-xs text-text-secondary ml-2 font-data">#{j.rang + parseInt(j.evolution || 0)} → #{j.rang}</span>
                                        </div>
                                        <span className="text-xs font-bold px-2 py-0.5 font-data"
                                            style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#EF4444', borderRadius: '999px' }}>
                                            {j.evolution}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
