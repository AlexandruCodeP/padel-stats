import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { getMois, getAnalyticsFrequence, getAnalyticsProfil } from '../api';
import { Repeat, Users } from 'lucide-react';

const COLORS = ['#0ea5e9', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16'];
const HOMME = '#38BDF8';
const FEMME = '#FB7185';

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-slate-900 text-white text-xs rounded-xl px-3 py-2 shadow-xl border-0">
            {label && <p className="font-semibold mb-1">{label}</p>}
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color || '#fff' }}>{p.name || ''} {typeof p.value === 'number' ? p.value.toLocaleString('fr-FR') : p.value}</p>
            ))}
        </div>
    );
};

export default function Frequence() {
    const [moisList, setMoisList] = useState([]);
    const [mois, setMois] = useState('');
    const [frequence, setFrequence] = useState([]);
    const [freqH, setFreqH] = useState([]);
    const [freqF, setFreqF] = useState([]);
    const [profilAll, setProfilAll] = useState(null);
    const [profil100, setProfil100] = useState(null);
    const [profil1000, setProfil1000] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { getMois().then(m => { setMoisList(m); if (m.length) setMois(m[0].mois); }); }, []);

    useEffect(() => {
        if (!mois) return;
        setLoading(true);
        Promise.all([
            getAnalyticsFrequence(mois),
            getAnalyticsFrequence(mois, 'H'),
            getAnalyticsFrequence(mois, 'F'),
            getAnalyticsProfil(mois, 999999),
            getAnalyticsProfil(mois, 100),
            getAnalyticsProfil(mois, 1000),
        ]).then(([f, fH, fF, pAll, p100, p1000]) => {
            setFrequence(f); setFreqH(fH); setFreqF(fF);
            setProfilAll(pAll); setProfil100(p100); setProfil1000(p1000);
            setLoading(false);
        });
    }, [mois]);

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
            <div className="grid md:grid-cols-2 gap-6">{[...Array(2)].map((_, i) => <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-2xl" />)}</div>
        </div>
    );

    const total = frequence.reduce((s, f) => s + f.count, 0);

    // Merge H/F data
    const mergedHF = frequence.map((f, i) => ({
        tranche: f.tranche,
        tous: f.count,
        hommes: freqH[i]?.count || 0,
        femmes: freqF[i]?.count || 0,
    }));

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-text">Frequence de participation</h1>
                    <p className="text-text-secondary text-sm mt-1">Repartition des joueurs selon leur nombre de tournois joues</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <select value={mois} onChange={e => setMois(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-border text-sm bg-card text-text focus:outline-none focus:ring-2 focus:ring-primary/20">
                        {moisList.map(m => <option key={m.mois} value={m.mois}>{formatMoisLabel(m.mois)}</option>)}
                    </select>
                </div>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-card rounded-2xl border border-border p-4 shadow-sm text-center">
                    <div className="text-xs text-text-secondary mb-1 flex items-center justify-center gap-1"><Users className="w-3.5 h-3.5" /> Total competiteurs</div>
                    <div className="text-2xl font-bold text-text font-data">{total.toLocaleString('fr-FR')}</div>
                </div>
                <div className="bg-card rounded-2xl border border-border p-4 shadow-sm text-center">
                    <div className="text-xs text-text-secondary mb-1 flex items-center justify-center gap-1"><Repeat className="w-3.5 h-3.5" /> Tournois moy. (tous)</div>
                    <div className="text-2xl font-bold text-text font-data">{profilAll?.avg_tournois ?? '-'}</div>
                </div>
                <div className="bg-card rounded-2xl border border-border p-4 shadow-sm text-center">
                    <div className="text-xs text-text-secondary mb-1">Tournois moy. Top 100</div>
                    <div className="text-2xl font-bold text-primary font-data">{profil100?.avg_tournois ?? '-'}</div>
                </div>
                <div className="bg-card rounded-2xl border border-border p-4 shadow-sm text-center">
                    <div className="text-xs text-text-secondary mb-1">Tournois moy. Top 1 000</div>
                    <div className="text-2xl font-bold text-primary font-data">{profil1000?.avg_tournois ?? '-'}</div>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
                {/* Barres horizontales */}
                <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                    <h3 className="font-semibold text-text mb-1">Nombre de joueurs par tranche</h3>
                    <p className="text-xs text-text-secondary mb-4">Distribution des competiteurs selon l'activite</p>
                    {frequence.length > 0 ? (
                        <ResponsiveContainer width="100%" height={320}>
                            <BarChart data={frequence} layout="vertical" margin={{ left: 5 }}>
                                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis type="category" dataKey="tranche" tick={{ fontSize: 11, fill: '#94a3b8' }} width={60} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} formatter={(v) => v.toLocaleString('fr-FR')} />
                                <Bar dataKey="count" fill="#f59e0b" radius={[0, 8, 8, 0]} name="Joueurs" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <p className="text-text-secondary text-center py-8 text-sm">Pas de donnees</p>}
                </div>

                {/* Camembert */}
                <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                    <h3 className="font-semibold text-text mb-1">Repartition en %</h3>
                    <p className="text-xs text-text-secondary mb-4">Part de chaque tranche de participation</p>
                    {frequence.length > 0 ? (
                        <ResponsiveContainer width="100%" height={320}>
                            <PieChart>
                                <Pie data={frequence} dataKey="count" nameKey="tranche" cx="50%" cy="50%"
                                    innerRadius={60} outerRadius={110} strokeWidth={2}>
                                    {frequence.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} formatter={(v) => `${v.toLocaleString('fr-FR')} (${total > 0 ? ((v / total) * 100).toFixed(1) : 0}%)`} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : <p className="text-text-secondary text-center py-8 text-sm">Pas de donnees</p>}
                </div>
            </div>

            {/* Comparaison H/F */}
            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm mb-6">
                <h3 className="font-semibold text-text mb-1">Comparaison Hommes / Femmes</h3>
                <p className="text-xs text-text-secondary mb-4">Distribution de la frequence de tournois par genre</p>
                {mergedHF.length > 0 ? (
                    <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={mergedHF} layout="vertical" margin={{ left: 5 }}>
                            <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis type="category" dataKey="tranche" tick={{ fontSize: 11, fill: '#94a3b8' }} width={60} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} formatter={(v) => v.toLocaleString('fr-FR')} />
                            <Legend />
                            <Bar dataKey="hommes" fill={HOMME} radius={[0, 8, 8, 0]} name="Hommes" />
                            <Bar dataKey="femmes" fill={FEMME} radius={[0, 8, 8, 0]} name="Femmes" />
                        </BarChart>
                    </ResponsiveContainer>
                ) : <p className="text-text-secondary text-center py-8 text-sm">Pas de donnees</p>}
            </div>

            {/* Tableau recap */}
            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                <h3 className="font-semibold text-text mb-4">Detail par tranche</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-text-secondary border-b border-border">
                                <th className="text-left py-2 px-3">Tranche</th>
                                <th className="text-right py-2 px-3">Total</th>
                                <th className="text-right py-2 px-3">%</th>
                                <th className="text-right py-2 px-3">Hommes</th>
                                <th className="text-right py-2 px-3">Femmes</th>
                                <th className="text-right py-2 px-3">Ratio F</th>
                            </tr>
                        </thead>
                        <tbody>
                            {mergedHF.map((row) => {
                                const rowTotal = row.hommes + row.femmes;
                                return (
                                    <tr key={row.tranche} className="border-b border-border/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className="py-2.5 px-3 font-medium text-text">{row.tranche} tournois</td>
                                        <td className="py-2.5 px-3 text-right font-mono text-text font-bold">{row.tous.toLocaleString('fr-FR')}</td>
                                        <td className="py-2.5 px-3 text-right text-text-secondary">{total > 0 ? ((row.tous / total) * 100).toFixed(1) : 0}%</td>
                                        <td className="py-2.5 px-3 text-right font-mono text-homme">{row.hommes.toLocaleString('fr-FR')}</td>
                                        <td className="py-2.5 px-3 text-right font-mono text-femme">{row.femmes.toLocaleString('fr-FR')}</td>
                                        <td className="py-2.5 px-3 text-right text-text-secondary">{rowTotal > 0 ? ((row.femmes / rowTotal) * 100).toFixed(1) : 0}%</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
