import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { getMois, getAnalyticsNationalites, getAnalyticsProfil } from '../api';
import { Globe, Flag, Users } from 'lucide-react';

const COLORS = ['#0ea5e9', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-slate-900 text-white text-xs rounded-xl px-3 py-2 shadow-xl border-0">
            {label && <p className="font-semibold mb-1">{label}</p>}
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color || '#fff' }}>{p.name || ''} {p.value?.toLocaleString('fr-FR')}</p>
            ))}
        </div>
    );
};

export default function Nationalites() {
    const [moisList, setMoisList] = useState([]);
    const [mois, setMois] = useState('');
    const [genre, setGenre] = useState('');
    const [top, setTop] = useState(100);
    const [natTop100, setNatTop100] = useState([]);
    const [natTop1000, setNatTop1000] = useState([]);
    const [natAll, setNatAll] = useState([]);
    const [profilTop100, setProfilTop100] = useState(null);
    const [profilTop1000, setProfilTop1000] = useState(null);
    const [profilAll, setProfilAll] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { getMois().then(m => { setMoisList(m); if (m.length) setMois(m[0].mois); }); }, []);

    useEffect(() => {
        if (!mois) return;
        setLoading(true);
        const g = genre || undefined;
        Promise.all([
            getAnalyticsNationalites(mois, 100, g),
            getAnalyticsNationalites(mois, 1000, g),
            getAnalyticsNationalites(mois, 50000, g),
            getAnalyticsProfil(mois, 100, g),
            getAnalyticsProfil(mois, 1000, g),
            getAnalyticsProfil(mois, 50000, g),
        ]).then(([n100, n1000, nAll, p100, p1000, pAll]) => {
            setNatTop100(n100); setNatTop1000(n1000); setNatAll(nAll);
            setProfilTop100(p100); setProfilTop1000(p1000); setProfilAll(pAll);
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
            <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-2xl" />)}</div>
            <div className="grid md:grid-cols-2 gap-6">{[...Array(4)].map((_, i) => <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-2xl" />)}</div>
        </div>
    );

    // Pick data for the selected top filter
    const currentData = top <= 100 ? natTop100 : top <= 1000 ? natTop1000 : natAll;
    const total = currentData.reduce((s, n) => s + n.count, 0);

    // French % in each level
    const frPct = (data) => {
        const t = data.reduce((s, n) => s + n.count, 0);
        const fr = data.find(n => n.nationalite === 'FRA');
        return t > 0 && fr ? ((fr.count / t) * 100).toFixed(1) : '-';
    };

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-text">Nationalites</h1>
                    <p className="text-text-secondary text-sm mt-1">Repartition et comparaison des nationalites par niveau</p>
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
                    <select value={top} onChange={e => setTop(Number(e.target.value))}
                        className="px-3 py-2 rounded-xl border border-border text-sm bg-card text-text focus:outline-none focus:ring-2 focus:ring-primary/20">
                        {[100, 1000, 50000].map(n => <option key={n} value={n}>{n >= 50000 ? 'Tous' : `Top ${n.toLocaleString('fr-FR')}`}</option>)}
                    </select>
                </div>
            </div>

            {/* KPIs: % francais par niveau */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-card rounded-2xl border border-border p-4 shadow-sm text-center">
                    <div className="text-xs text-text-secondary mb-1 flex items-center justify-center gap-1"><Flag className="w-3.5 h-3.5" /> Nat. dominante</div>
                    <div className="text-xl font-bold text-text font-data">{profilTop100?.nationalite_principale || 'FRA'}</div>
                    <div className="text-xs text-text-secondary">Top 100</div>
                </div>
                <div className="bg-card rounded-2xl border border-border p-4 shadow-sm text-center">
                    <div className="text-xs text-text-secondary mb-1">% Francais Top 100</div>
                    <div className="text-xl font-bold text-primary font-data">{frPct(natTop100)}%</div>
                    <div className="text-xs text-text-secondary">{natTop100.find(n => n.nationalite === 'FRA')?.count || 0} joueurs</div>
                </div>
                <div className="bg-card rounded-2xl border border-border p-4 shadow-sm text-center">
                    <div className="text-xs text-text-secondary mb-1">% Francais Top 1 000</div>
                    <div className="text-xl font-bold text-primary font-data">{frPct(natTop1000)}%</div>
                    <div className="text-xs text-text-secondary">{natTop1000.find(n => n.nationalite === 'FRA')?.count || 0} joueurs</div>
                </div>
                <div className="bg-card rounded-2xl border border-border p-4 shadow-sm text-center">
                    <div className="text-xs text-text-secondary mb-1">Nationalites representees</div>
                    <div className="text-xl font-bold text-text font-data">{natAll.length}</div>
                    <div className="text-xs text-text-secondary">tous niveaux</div>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
                {/* Camembert */}
                <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                    <h3 className="font-semibold text-text mb-4">Repartition — {top >= 50000 ? 'Tous' : `Top ${top.toLocaleString('fr-FR')}`}</h3>
                    {currentData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={320}>
                            <PieChart>
                                <Pie data={currentData.slice(0, 8)} dataKey="count" nameKey="nationalite" cx="50%" cy="50%"
                                    innerRadius={60} outerRadius={110} strokeWidth={2}>
                                    {currentData.slice(0, 8).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} formatter={(v) => `${v.toLocaleString('fr-FR')} (${total > 0 ? ((v / total) * 100).toFixed(1) : 0}%)`} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : <p className="text-text-secondary text-center py-8 text-sm">Pas de donnees</p>}
                </div>

                {/* Barres */}
                <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                    <h3 className="font-semibold text-text mb-4">Nombre par nationalite</h3>
                    {currentData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={320}>
                            <BarChart data={currentData.slice(0, 10)} layout="vertical" margin={{ left: 10 }}>
                                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis type="category" dataKey="nationalite" tick={{ fontSize: 11, fill: '#94a3b8' }} width={50} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} formatter={(v) => v.toLocaleString('fr-FR')} />
                                <Bar dataKey="count" fill="#0ea5e9" radius={[0, 8, 8, 0]} name="Joueurs" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <p className="text-text-secondary text-center py-8 text-sm">Pas de donnees</p>}
                </div>
            </div>

            {/* Comparaison par niveau */}
            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm mb-6">
                <h3 className="font-semibold text-text mb-1">Comparaison par niveau</h3>
                <p className="text-xs text-text-secondary mb-4">Proportion de chaque nationalite selon le niveau de classement</p>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-text-secondary border-b border-border">
                                <th className="text-left py-2 px-3">Nationalite</th>
                                <th className="text-right py-2 px-3">Top 100</th>
                                <th className="text-right py-2 px-3">%</th>
                                <th className="text-right py-2 px-3">Top 1 000</th>
                                <th className="text-right py-2 px-3">%</th>
                                <th className="text-right py-2 px-3">Total</th>
                                <th className="text-right py-2 px-3">%</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                const allNats = [...new Set([...natTop100.map(n => n.nationalite), ...natTop1000.map(n => n.nationalite), ...natAll.map(n => n.nationalite)])];
                                const t100 = natTop100.reduce((s, n) => s + n.count, 0);
                                const t1000 = natTop1000.reduce((s, n) => s + n.count, 0);
                                const tAll = natAll.reduce((s, n) => s + n.count, 0);
                                // Sort by total count
                                const sorted = allNats.map(nat => ({
                                    nat,
                                    c100: natTop100.find(n => n.nationalite === nat)?.count || 0,
                                    c1000: natTop1000.find(n => n.nationalite === nat)?.count || 0,
                                    cAll: natAll.find(n => n.nationalite === nat)?.count || 0,
                                })).sort((a, b) => b.cAll - a.cAll);

                                return sorted.slice(0, 15).map((r, i) => (
                                    <tr key={r.nat} className="border-b border-border/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className="py-2 px-3 font-medium text-text">{r.nat}</td>
                                        <td className="py-2 px-3 text-right text-text font-mono">{r.c100}</td>
                                        <td className="py-2 px-3 text-right text-text-secondary">{t100 > 0 ? ((r.c100 / t100) * 100).toFixed(1) : 0}%</td>
                                        <td className="py-2 px-3 text-right text-text font-mono">{r.c1000.toLocaleString('fr-FR')}</td>
                                        <td className="py-2 px-3 text-right text-text-secondary">{t1000 > 0 ? ((r.c1000 / t1000) * 100).toFixed(1) : 0}%</td>
                                        <td className="py-2 px-3 text-right text-text font-mono">{r.cAll.toLocaleString('fr-FR')}</td>
                                        <td className="py-2 px-3 text-right text-text-secondary">{tAll > 0 ? ((r.cAll / tAll) * 100).toFixed(1) : 0}%</td>
                                    </tr>
                                ));
                            })()}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
