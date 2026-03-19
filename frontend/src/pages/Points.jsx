import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';
import { getMois, getAnalyticsInflation, getAnalyticsProfil } from '../api';
import { Award, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const CustomTooltip = ({ active, payload, label, labelFormatter }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-slate-900 text-white text-xs rounded-xl px-3 py-2 shadow-xl border-0">
            {label && <p className="font-semibold mb-1">{labelFormatter ? labelFormatter(label) : label}</p>}
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color || '#fff' }}>{p.name || ''} {typeof p.value === 'number' ? p.value.toLocaleString('fr-FR') : p.value}</p>
            ))}
        </div>
    );
};

export default function Points() {
    const [moisList, setMoisList] = useState([]);
    const [mois, setMois] = useState('');
    const [genre, setGenre] = useState('');
    const [inflation, setInflation] = useState([]);
    const [profils, setProfils] = useState({});
    const [profilsH, setProfilsH] = useState({});
    const [profilsF, setProfilsF] = useState({});
    const [loading, setLoading] = useState(true);

    const tops = [10, 50, 100, 500, 1000, 5000];

    useEffect(() => { getMois().then(m => { setMoisList(m); if (m.length) setMois(m[0].mois); }); }, []);

    useEffect(() => {
        if (!mois) return;
        setLoading(true);
        const g = genre || undefined;
        Promise.all([
            getAnalyticsInflation(g),
            ...tops.map(t => getAnalyticsProfil(mois, t, g)),
            ...tops.map(t => getAnalyticsProfil(mois, t, 'H')),
            ...tops.map(t => getAnalyticsProfil(mois, t, 'F')),
        ]).then(([inf, ...rest]) => {
            setInflation(inf);
            const p = {}, pH = {}, pF = {};
            tops.forEach((t, i) => { p[t] = rest[i]; pH[t] = rest[i + tops.length]; pF[t] = rest[i + tops.length * 2]; });
            setProfils(p); setProfilsH(pH); setProfilsF(pF);
            setLoading(false);
        });
    }, [mois, genre]);

    const formatMoisLabel = (m) => {
        if (!m) return '';
        const [y, mo] = m.split('-');
        const months = ['', 'Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aout', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[parseInt(mo)]} ${y}`;
    };

    if (loading) return (
        <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-gray-200 dark:bg-gray-700 rounded-2xl" />)}</div>
            <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
        </div>
    );

    // Year-over-year comparison from inflation data
    const latestInflation = inflation.length > 0 ? inflation[inflation.length - 1] : null;
    const yearAgoInflation = inflation.length >= 13 ? inflation[inflation.length - 13] : inflation.length > 0 ? inflation[0] : null;

    // Bar chart data for points by top level
    const barData = tops.map(t => ({
        top: `Top ${t.toLocaleString('fr-FR')}`,
        points: profils[t]?.avg_points || 0,
        tournois: profils[t]?.avg_tournois || 0,
    }));

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-text">Points</h1>
                    <p className="text-text-secondary text-sm mt-1">Analyse des points necessaires, inflation et comparaison par niveau</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <select value={mois} onChange={e => setMois(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-border text-sm bg-card text-text focus:outline-none focus:ring-2 focus:ring-primary/20">
                        {moisList.map(m => <option key={m.mois} value={m.mois}>{formatMoisLabel(m.mois)}</option>)}
                    </select>
                    <div className="flex rounded-xl border border-border overflow-hidden">
                        {[{ val: '', label: 'Tous' }, { val: 'H', label: 'H' }, { val: 'F', label: 'F' }].map(g => (
                            <button key={g.val} onClick={() => setGenre(g.val)}
                                className={`px-3 py-2 text-sm font-medium transition-colors ${genre === g.val ? 'bg-primary text-white' : 'bg-card text-text-secondary hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                                {g.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* KPI: Points moyens par Top */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                {tops.map(t => (
                    <div key={t} className="bg-card rounded-2xl border border-border p-4 shadow-sm text-center">
                        <div className="text-xs text-text-secondary mb-1">Top {t.toLocaleString('fr-FR')}</div>
                        <div className="text-xl font-bold text-text font-data">{profils[t]?.avg_points?.toLocaleString('fr-FR') ?? '-'}</div>
                        <div className="text-xs text-text-secondary mt-0.5">pts moy.</div>
                    </div>
                ))}
            </div>

            {/* Year-over-year comparison */}
            {latestInflation && yearAgoInflation && (
                <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl border border-primary/20 p-5 shadow-sm mb-6">
                    <h3 className="font-semibold text-text mb-4 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-primary" /> Evolution annuelle des seuils
                    </h3>
                    <p className="text-xs text-text-secondary mb-4">Points pour atteindre chaque rang : {formatMoisLabel(yearAgoInflation.mois)} vs {formatMoisLabel(latestInflation.mois)}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                            { label: '~#1', key: 'rang_1', color: '#ef4444' },
                            { label: '~#10', key: 'rang_10', color: '#f59e0b' },
                            { label: '~#100', key: 'rang_100', color: '#10b981' },
                            { label: '~#1000', key: 'rang_1000', color: '#0ea5e9' },
                        ].map(({ label, key, color }) => {
                            const now = latestInflation[key];
                            const then = yearAgoInflation[key];
                            const delta = now && then ? now - then : null;
                            const pct = then && delta ? ((delta / then) * 100).toFixed(1) : null;
                            return (
                                <div key={label} className="bg-card/80 rounded-xl p-4 text-center">
                                    <div className="text-xs font-semibold mb-1" style={{ color }}>{label}</div>
                                    <div className="text-lg font-bold text-text font-data">{now?.toLocaleString('fr-FR') ?? '-'} <span className="text-xs text-text-secondary">pts</span></div>
                                    <div className="text-xs text-text-secondary">avant: {then?.toLocaleString('fr-FR') ?? '-'}</div>
                                    {delta !== null && (
                                        <div className={`text-xs font-medium mt-1 flex items-center justify-center gap-0.5 ${delta >= 0 ? 'text-success' : 'text-red-500'}`}>
                                            {delta >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                            {delta >= 0 ? '+' : ''}{pct}%
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="grid md:grid-cols-2 gap-6 mb-6">
                {/* Courbe inflation */}
                {inflation.length > 1 && (
                    <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                        <h3 className="font-semibold text-text mb-1">Inflation des points</h3>
                        <p className="text-xs text-text-secondary mb-4">Points pour chaque rang au fil des mois</p>
                        <ResponsiveContainer width="100%" height={320}>
                            <LineChart data={inflation}>
                                <XAxis dataKey="mois" tickFormatter={formatMoisLabel} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip labelFormatter={formatMoisLabel} />} formatter={(v) => v?.toLocaleString('fr-FR') + ' pts'} />
                                <Legend />
                                <Line type="monotone" dataKey="rang_1" name="~#1" stroke="#ef4444" strokeWidth={2} dot={false} connectNulls />
                                <Line type="monotone" dataKey="rang_10" name="~#10" stroke="#f59e0b" strokeWidth={2} dot={false} connectNulls />
                                <Line type="monotone" dataKey="rang_50" name="~#50" stroke="#8b5cf6" strokeWidth={2} dot={false} connectNulls />
                                <Line type="monotone" dataKey="rang_100" name="~#100" stroke="#10b981" strokeWidth={2} dot={false} connectNulls />
                                <Line type="monotone" dataKey="rang_1000" name="~#1000" stroke="#0ea5e9" strokeWidth={2} dot={false} connectNulls />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Points moyens par niveau */}
                <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                    <h3 className="font-semibold text-text mb-1">Points et tournois moyens par niveau</h3>
                    <p className="text-xs text-text-secondary mb-4">Correlation entre points et activite</p>
                    <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={barData}>
                            <XAxis dataKey="top" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Bar dataKey="points" fill="#8b5cf6" radius={[8, 8, 0, 0]} name="Points moy." />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Tableau detaille */}
            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                <h3 className="font-semibold text-text mb-4">Synthese par niveau</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-text-secondary border-b border-border">
                                <th className="text-left py-2 px-3">Niveau</th>
                                <th className="text-right py-2 px-3">Joueurs</th>
                                <th className="text-right py-2 px-3">Pts moy.</th>
                                <th className="text-right py-2 px-3">Pts moy. H</th>
                                <th className="text-right py-2 px-3">Pts moy. F</th>
                                <th className="text-right py-2 px-3">Tournois moy.</th>
                                <th className="text-right py-2 px-3">Age moy.</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tops.map(t => (
                                <tr key={t} className="border-b border-border/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <td className="py-2.5 px-3 font-medium text-text">Top {t.toLocaleString('fr-FR')}</td>
                                    <td className="py-2.5 px-3 text-right font-mono text-text">{profils[t]?.total?.toLocaleString('fr-FR') ?? '-'}</td>
                                    <td className="py-2.5 px-3 text-right font-mono text-text font-bold">{profils[t]?.avg_points?.toLocaleString('fr-FR') ?? '-'}</td>
                                    <td className="py-2.5 px-3 text-right font-mono text-homme">{profilsH[t]?.avg_points?.toLocaleString('fr-FR') ?? '-'}</td>
                                    <td className="py-2.5 px-3 text-right font-mono text-femme">{profilsF[t]?.avg_points?.toLocaleString('fr-FR') ?? '-'}</td>
                                    <td className="py-2.5 px-3 text-right font-mono text-text-secondary">{profils[t]?.avg_tournois ?? '-'}</td>
                                    <td className="py-2.5 px-3 text-right font-mono text-text-secondary">{profils[t]?.avg_age ?? '-'} ans</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
