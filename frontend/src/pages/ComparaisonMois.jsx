import { useState, useEffect, useCallback } from 'react';
import { ArrowRight, TrendingUp, TrendingDown, Users, Calendar, RefreshCw, ChevronUp, ChevronDown, Minus } from 'lucide-react';
import { getMois, getClassement } from '../api';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts';

const HOMME = '#38BDF8';
const FEMME = '#FB7185';
const VOLT  = '#CCFF00';
const TABS  = ['Vue d\'ensemble', 'Top montées', 'Top chutes', 'Points gagnés', 'Points perdus'];

/* ── Helpers ─────────────────────────────────────────────────────────── */
const fmtMois = (m) => {
    if (!m) return '';
    const [y, mo] = m.split('-');
    return new Date(+y, +mo - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
};

const delta = (a, b) => b - a;
const pct   = (a, b) => a > 0 ? (((b - a) / a) * 100).toFixed(1) : '–';

const DarkTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-slate-900 text-white text-xs rounded-xl px-3 py-2.5 shadow-xl border border-white/5">
            <p className="font-semibold mb-1.5 text-white/70">{label}</p>
            {payload.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: p.fill }} />
                    <span className="text-white/60">{p.name} :</span>
                    <span className="font-data font-semibold">{p.value?.toLocaleString('fr-FR')}</span>
                </div>
            ))}
        </div>
    );
};

/* ── KPI Delta Card ──────────────────────────────────────────────────── */
function KpiDelta({ label, valA, valB, color = '#38BDF8', icon: Icon }) {
    const d  = delta(valA, valB);
    const p  = pct(valA, valB);
    const up = d >= 0;
    return (
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{label}</span>
                {Icon && <Icon className="w-4 h-4 text-text-secondary/50" />}
            </div>
            <div className="flex items-end gap-4">
                <div>
                    <div className="text-2xl font-extrabold font-data text-text">
                        {valB?.toLocaleString('fr-FR')}
                    </div>
                    <div className="text-xs text-text-secondary mt-0.5">
                        vs {valA?.toLocaleString('fr-FR')} (mois A)
                    </div>
                </div>
                <div className={`ml-auto flex flex-col items-end gap-0.5`}>
                    <div className={`flex items-center gap-1 text-sm font-bold px-2 py-1 rounded-lg ${
                        up ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
                    }`}>
                        {up ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        {d > 0 ? '+' : ''}{d?.toLocaleString('fr-FR')}
                    </div>
                    <div className="text-xs text-text-secondary">{up ? '+' : ''}{p}%</div>
                </div>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-border overflow-hidden">
                <div className="h-full rounded-full" style={{
                    width: `${Math.min(100, (valB / Math.max(valA, valB, 1)) * 100)}%`,
                    background: color,
                }} />
            </div>
        </div>
    );
}

/* ── Player row in ranking table ─────────────────────────────────────── */
function PlayerRow({ rank, player, deltaRang, deltaPts, mode }) {
    const isPositive = mode === 'montee' ? deltaRang < 0 : mode === 'chute' ? deltaRang > 0 : deltaPts > 0;
    const mainDelta  = mode === 'points_gagnes' || mode === 'points_perdus' ? deltaPts : -deltaRang;

    return (
        <div className="flex items-center gap-3 py-2.5 px-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 rounded-xl transition-colors">
            <span className="text-xs text-text-secondary w-5 text-right shrink-0">{rank}</span>
            <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-text truncate">
                    {player.prenom} {player.nom}
                </div>
                <div className="text-xs text-text-secondary">{player.ligue_b || player.ligue}</div>
            </div>
            <div className="text-right shrink-0">
                <div className="text-xs text-text-secondary">
                    #{player.rang_a} → #{player.rang_b}
                </div>
                <div className="text-xs text-text-secondary">
                    {player.pts_a?.toLocaleString('fr-FR')} → {player.pts_b?.toLocaleString('fr-FR')} pts
                </div>
            </div>
            <div className={`text-sm font-bold px-2 py-1 rounded-lg w-16 text-center shrink-0 ${
                isPositive
                    ? 'bg-green-50 text-green-600'
                    : 'bg-red-50 text-red-500'
            }`}>
                {mainDelta > 0 ? '+' : ''}{mainDelta?.toLocaleString('fr-FR')}
            </div>
        </div>
    );
}

/* ── Main Page ───────────────────────────────────────────────────────── */
export default function ComparaisonMois() {
    const [moisList, setMoisList]   = useState([]);
    const [moisA, setMoisA]         = useState('');
    const [moisB, setMoisB]         = useState('');
    const [genre, setGenre]         = useState('');
    const [tab, setTab]             = useState(0);
    const [loading, setLoading]     = useState(false);
    const [compared, setCompared]   = useState(null); // { kpis, players, chartData }

    useEffect(() => {
        getMois().then(m => {
            setMoisList(m);
            if (m.length >= 2) {
                setMoisB(m[0].mois);
                setMoisA(m[1].mois);
            }
        });
    }, []);

    const comparer = useCallback(async () => {
        if (!moisA || !moisB || moisA === moisB) return;
        setLoading(true);
        try {
            /* Fetch overviews from /mois (already available) */
            const dataA = moisList.find(m => m.mois === moisA) || {};
            const dataB = moisList.find(m => m.mois === moisB) || {};

            /* Fetch top 2000 players from each month for cross-comparison */
            const [clA, clB] = await Promise.all([
                getClassement(moisA, { page: 0, size: 2000, ...(genre && { genre }) }),
                getClassement(moisB, { page: 0, size: 2000, ...(genre && { genre }) }),
            ]);

            /* Build map id → player for each month */
            const mapA = {};
            (clA.joueurs || []).forEach(j => { mapA[j.id] = j; });
            const mapB = {};
            (clB.joueurs || []).forEach(j => { mapB[j.id] = j; });

            /* Compute cross-month deltas for players in both datasets */
            const movers = [];
            Object.keys(mapB).forEach(id => {
                if (!mapA[id]) return;
                const a = mapA[id];
                const b = mapB[id];
                movers.push({
                    id,
                    prenom: b.prenom,
                    nom:    b.nom,
                    ligue_b: b.ligue,
                    rang_a: a.rang,
                    rang_b: b.rang,
                    pts_a:  a.points,
                    pts_b:  b.points,
                    delta_rang: b.rang - a.rang,   // negative = went up
                    delta_pts:  b.points - a.points,
                });
            });

            /* Sort variants */
            const topMontees     = [...movers].sort((a, b) => a.delta_rang - b.delta_rang).slice(0, 20);
            const topChutes      = [...movers].sort((a, b) => b.delta_rang - a.delta_rang).slice(0, 20);
            const topPtsGagnes   = [...movers].sort((a, b) => b.delta_pts - a.delta_pts).slice(0, 20);
            const topPtsPerdus   = [...movers].sort((a, b) => a.delta_pts - b.delta_pts).slice(0, 20);

            /* Chart data — monthly overview from moisList */
            const chartData = moisList
                .filter(m => m.mois <= moisB && m.mois >= moisA)
                .sort((a, b) => a.mois.localeCompare(b.mois))
                .map(m => ({
                    mois: fmtMois(m.mois),
                    Hommes: m.nb_hommes,
                    Femmes: m.nb_femmes,
                }));

            setCompared({
                kpis: { dataA, dataB },
                topMontees, topChutes, topPtsGagnes, topPtsPerdus,
                chartData,
            });
        } finally {
            setLoading(false);
        }
    }, [moisA, moisB, genre, moisList]);

    /* Auto-compare when months are selected */
    useEffect(() => {
        if (moisA && moisB && moisList.length > 0) comparer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [moisA, moisB, genre, moisList]);

    const tabPlayers = compared ? [
        compared.topMontees,
        compared.topChutes,
        compared.topPtsGagnes,
        compared.topPtsPerdus,
    ][tab - 1] : [];

    const tabMode = ['montee', 'chute', 'points_gagnes', 'points_perdus'][tab - 1];

    return (
        <div>
            {/* Header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-6 mb-6">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
                <h1 className="text-2xl font-bold text-text relative">Comparaison de mois</h1>
                <p className="text-text-secondary text-sm mt-1 relative">Analysez l'évolution du classement entre deux périodes</p>
            </div>

            {/* Selectors */}
            <div className="bg-card border border-border rounded-2xl p-5 mb-6 shadow-sm">
                <div className="flex flex-wrap items-end gap-4">
                    {/* Mois A */}
                    <div className="flex-1 min-w-[140px]">
                        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Mois A (référence)</label>
                        <select
                            value={moisA}
                            onChange={e => setMoisA(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        >
                            {moisList.map(m => (
                                <option key={m.mois} value={m.mois}>{fmtMois(m.mois)}</option>
                            ))}
                        </select>
                    </div>

                    {/* Arrow */}
                    <div className="flex items-center justify-center pb-2">
                        <ArrowRight className="w-5 h-5 text-text-secondary" />
                    </div>

                    {/* Mois B */}
                    <div className="flex-1 min-w-[140px]">
                        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Mois B (comparaison)</label>
                        <select
                            value={moisB}
                            onChange={e => setMoisB(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        >
                            {moisList.map(m => (
                                <option key={m.mois} value={m.mois}>{fmtMois(m.mois)}</option>
                            ))}
                        </select>
                    </div>

                    {/* Genre */}
                    <div className="min-w-[130px]">
                        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Genre</label>
                        <select
                            value={genre}
                            onChange={e => setGenre(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        >
                            <option value="">Tous</option>
                            <option value="H">Hommes</option>
                            <option value="F">Femmes</option>
                        </select>
                    </div>

                    <button
                        onClick={comparer}
                        disabled={loading || moisA === moisB}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark disabled:opacity-40 transition-all shadow-sm hover:shadow-primary/20 hover:shadow-lg"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Comparer
                    </button>
                </div>
            </div>

            {loading && (
                <div className="animate-pulse space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {[1,2,3].map(i => <div key={i} className="bg-card border border-border rounded-2xl h-28" />)}
                    </div>
                    <div className="bg-card border border-border rounded-2xl h-64" />
                </div>
            )}

            {compared && !loading && (
                <>
                    {/* Period label */}
                    <div className="flex items-center gap-2 mb-4 text-sm text-text-secondary">
                        <span className="px-3 py-1 bg-primary/10 text-primary rounded-full font-semibold text-xs">{fmtMois(moisA)}</span>
                        <ArrowRight className="w-4 h-4" />
                        <span className="px-3 py-1 bg-accent/20 text-secondary rounded-full font-semibold text-xs">{fmtMois(moisB)}</span>
                        {genre && <span className="px-2 py-1 bg-border rounded-full text-xs">{genre === 'H' ? 'Hommes' : 'Femmes'}</span>}
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                        <KpiDelta
                            label="Total joueurs"
                            valA={compared.kpis.dataA.total}
                            valB={compared.kpis.dataB.total}
                            color="#0047AB"
                            icon={Users}
                        />
                        <KpiDelta
                            label="Hommes"
                            valA={compared.kpis.dataA.nb_hommes}
                            valB={compared.kpis.dataB.nb_hommes}
                            color={HOMME}
                            icon={TrendingUp}
                        />
                        <KpiDelta
                            label="Femmes"
                            valA={compared.kpis.dataA.nb_femmes}
                            valB={compared.kpis.dataB.nb_femmes}
                            color={FEMME}
                            icon={Users}
                        />
                    </div>

                    {/* Tabs */}
                    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                        {/* Tab bar */}
                        <div className="flex gap-0 border-b border-border overflow-x-auto">
                            {TABS.map((t, i) => (
                                <button
                                    key={i}
                                    onClick={() => setTab(i)}
                                    className={`px-4 py-3 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 ${
                                        tab === i
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-text-secondary hover:text-text'
                                    }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>

                        {/* Tab 0 — Vue d'ensemble */}
                        {tab === 0 && (
                            <div className="p-5">
                                <h3 className="font-semibold text-text mb-1">Évolution du nombre de joueurs</h3>
                                <p className="text-xs text-text-secondary mb-4">Tous les mois disponibles entre les deux dates sélectionnées</p>
                                {compared.chartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={compared.chartData} barGap={4}>
                                            <XAxis dataKey="mois" tick={{ fontSize: 11, fill: '#64748b' }} />
                                            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => (v/1000).toFixed(0) + 'k'} />
                                            <Tooltip content={<DarkTooltip />} />
                                            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '16px' }} />
                                            <Bar dataKey="Hommes" fill={HOMME} radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="Femmes" fill={FEMME} radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="text-center py-12 text-text-secondary text-sm">
                                        Sélectionne deux mois différents pour voir l'évolution
                                    </div>
                                )}

                                {/* Summary table */}
                                <div className="mt-4 overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-border">
                                                <th className="text-left py-2 px-3 text-xs text-text-secondary font-semibold">Période</th>
                                                <th className="text-right py-2 px-3 text-xs text-text-secondary font-semibold">Total</th>
                                                <th className="text-right py-2 px-3 text-xs text-text-secondary font-semibold" style={{ color: HOMME }}>Hommes</th>
                                                <th className="text-right py-2 px-3 text-xs text-text-secondary font-semibold" style={{ color: FEMME }}>Femmes</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[
                                                { label: fmtMois(moisA), ...compared.kpis.dataA },
                                                { label: fmtMois(moisB), ...compared.kpis.dataB },
                                            ].map((row, i) => (
                                                <tr key={i} className={`border-b border-border/40 ${i === 1 ? 'font-semibold' : ''}`}>
                                                    <td className="py-2 px-3 text-text">{row.label}</td>
                                                    <td className="py-2 px-3 text-right font-data text-text">{row.total?.toLocaleString('fr-FR')}</td>
                                                    <td className="py-2 px-3 text-right font-data" style={{ color: HOMME }}>{row.nb_hommes?.toLocaleString('fr-FR')}</td>
                                                    <td className="py-2 px-3 text-right font-data" style={{ color: FEMME }}>{row.nb_femmes?.toLocaleString('fr-FR')}</td>
                                                </tr>
                                            ))}
                                            {/* Delta row */}
                                            <tr className="bg-slate-50/50">
                                                <td className="py-2 px-3 text-xs text-text-secondary font-semibold">Variation</td>
                                                {[
                                                    delta(compared.kpis.dataA.total, compared.kpis.dataB.total),
                                                    delta(compared.kpis.dataA.nb_hommes, compared.kpis.dataB.nb_hommes),
                                                    delta(compared.kpis.dataA.nb_femmes, compared.kpis.dataB.nb_femmes),
                                                ].map((d, i) => (
                                                    <td key={i} className={`py-2 px-3 text-right font-data text-xs font-bold ${d >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                        {d >= 0 ? '+' : ''}{d?.toLocaleString('fr-FR')}
                                                    </td>
                                                ))}
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Tabs 1–4 — Player tables */}
                        {tab > 0 && (
                            <div className="p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="font-semibold text-text">
                                            {tab === 1 && 'Top montées (rang)'}
                                            {tab === 2 && 'Top chutes (rang)'}
                                            {tab === 3 && 'Plus de points gagnés'}
                                            {tab === 4 && 'Plus de points perdus'}
                                        </h3>
                                        <p className="text-xs text-text-secondary mt-0.5">
                                            Comparaison sur les top 2 000 joueurs · {fmtMois(moisA)} → {fmtMois(moisB)}
                                        </p>
                                    </div>
                                    <span className="text-xs text-text-secondary px-2 py-1 bg-border rounded-full">
                                        {tabPlayers.length} joueurs
                                    </span>
                                </div>

                                {tabPlayers.length === 0 ? (
                                    <div className="text-center py-12 text-text-secondary text-sm">Aucune donnée disponible</div>
                                ) : (
                                    <div className="space-y-0.5">
                                        {tabPlayers.map((p, i) => (
                                            <PlayerRow
                                                key={p.id}
                                                rank={i + 1}
                                                player={p}
                                                deltaRang={p.delta_rang}
                                                deltaPts={p.delta_pts}
                                                mode={tabMode}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
