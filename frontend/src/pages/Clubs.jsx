import { useState, useEffect } from 'react';
import { Building2, Users, User, TrendingUp, MapPin, Award, Search } from 'lucide-react';
import { getMois, getStats, getAnalyticsClubsTableau, getAnalyticsEvolutionTopClubs, getAnalyticsClubsParLigue } from '../api';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, LabelList } from 'recharts';
import KPICard from '../components/KPICard';

const COLORS = ['#0ea5e9', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#14b8a6', '#e11d48', '#a855f7', '#0284c7', '#d946ef', '#65a30d', '#ea580c', '#7c3aed', '#0891b2', '#dc2626'];
const TOP_N = 10;

const formatMoisLabel = (m) => {
    if (!m) return '';
    const [y, mo] = m.split('-');
    const months = ['', 'Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aout', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[parseInt(mo)]} ${y}`;
};

export default function Clubs() {
    const [moisList, setMoisList] = useState([]);
    const [mois, setMois] = useState('');
    const [genre, setGenre] = useState('');
    const [stats, setStats] = useState(null);
    const [clubs, setClubs] = useState([]);
    const [evoClubs, setEvoClubs] = useState({ clubs: [], data: [] });
    const [clubsParLigue, setClubsParLigue] = useState([]);
    const [visibleClubs, setVisibleClubs] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [topN, setTopN] = useState(20);

    useEffect(() => {
        Promise.all([getMois(), getStats(), getAnalyticsEvolutionTopClubs()]).then(([m, s, evo]) => {
            setMoisList(m);
            setStats(s);
            if (m.length) setMois(m[0].mois);
            setEvoClubs(evo);
            setVisibleClubs(new Set(evo.clubs.slice(0, TOP_N)));
            setLoading(false);
        });
    }, []);

    useEffect(() => {
        if (!mois) return;
        setLoading(true);
        Promise.all([
            getAnalyticsClubsTableau(mois, genre || undefined),
            getAnalyticsClubsParLigue(mois, genre || undefined),
        ]).then(([c, ligue]) => {
            setClubs(c);
            setClubsParLigue(ligue);
            setLoading(false);
        });
    }, [mois, genre]);

    useEffect(() => {
        getAnalyticsEvolutionTopClubs(genre || undefined).then(evo => {
            setEvoClubs(evo);
            setVisibleClubs(new Set(evo.clubs.slice(0, TOP_N)));
        });
    }, [genre]);

    const totalClubs = clubs.length;
    const totalJoueurs = clubs.reduce((s, c) => s + c.total, 0);
    const avgJoueursParClub = totalClubs > 0 ? Math.round(totalJoueurs / totalClubs) : 0;

    const filteredClubs = search
        ? clubs.filter(c => c.club.toLowerCase().includes(search.toLowerCase()))
        : clubs;

    if (loading && !clubs.length) {
        return (
            <div className="animate-pulse space-y-6">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                <div className="grid grid-cols-3 gap-4">
                    {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-gray-200 dark:bg-gray-700 rounded-2xl" />)}
                </div>
                <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            </div>
        );
    }

    return (
        <div>
            {/* Hero header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-6 mb-6">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
                <h1 className="text-2xl font-bold text-text relative">Clubs</h1>
                <p className="text-text-secondary text-sm mt-1 relative">Analyse des clubs de padel en France</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <KPICard icon={Building2} title="Clubs" value={totalClubs} color="primary" />
                <KPICard icon={Users} title="Joueurs classés" value={totalJoueurs} color="homme" />
                <KPICard icon={Award} title="Moy. / club" value={avgJoueursParClub} color="success" />
            </div>

            {/* Top clubs bar chart */}
            <div className="bg-card rounded-xl border border-border p-5 shadow-sm mb-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <h3 className="font-semibold text-text flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-primary" /> Top {topN} clubs par nombre de joueurs
                    </h3>
                    <div className="flex rounded-xl border border-border overflow-hidden">
                        {[{ val: 20, label: 'Top 20' }, { val: 50, label: 'Top 50' }, { val: 100, label: 'Top 100' }, { val: 200, label: 'Top 200' }].map(opt => (
                            <button key={opt.val} onClick={() => setTopN(opt.val)}
                                className={`px-3 py-1.5 text-xs font-medium transition-colors ${topN === opt.val ? 'bg-primary text-white' : 'bg-white dark:bg-slate-800 text-text-secondary hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
                <ResponsiveContainer width="100%" height={Math.max(400, Math.min(topN, clubs.length) * 22 + 20)}>
                    <BarChart data={clubs.slice(0, topN)} layout="vertical" margin={{ left: 10, right: 60 }}>
                        <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="club" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={180} />
                        <Tooltip content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload;
                            return (
                                <div className="bg-slate-900 text-white text-xs rounded-xl px-3 py-2 shadow-xl">
                                    <p className="font-semibold mb-1">{d.club}</p>
                                    <p>Total : {d.total}</p>
                                    <p style={{ color: '#38BDF8' }}>Hommes : {d.hommes}</p>
                                    <p style={{ color: '#FB7185' }}>Femmes : {d.femmes}</p>
                                    <p>Meilleur rang : {d.meilleur_rang}</p>
                                    {d.ligue && <p>Ligue : {d.ligue}</p>}
                                </div>
                            );
                        }} />
                        <Bar dataKey="hommes" stackId="a" fill="#38BDF8" radius={[0, 0, 0, 0]} name="Hommes" />
                        <Bar dataKey="femmes" stackId="a" fill="#FB7185" radius={[0, 4, 4, 0]} name="Femmes">
                            <LabelList dataKey="total" position="right" style={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} formatter={v => v.toLocaleString('fr-FR')} />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Clubs par ligue */}
            {clubsParLigue.length > 0 && (
                <div className="bg-card rounded-xl border border-border p-5 shadow-sm mb-6">
                    <h3 className="font-semibold text-text mb-3 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-green-500" /> Nombre de clubs par ligue
                    </h3>
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={clubsParLigue} margin={{ left: 10, right: 20 }}>
                            <XAxis dataKey="ligue" tick={{ fontSize: 9, fill: '#94a3b8', angle: -35, textAnchor: 'end' }} axisLine={false} tickLine={false} height={80} />
                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <Tooltip content={({ active, payload }) => {
                                if (!active || !payload?.length) return null;
                                const d = payload[0].payload;
                                return (
                                    <div className="bg-slate-900 text-white text-xs rounded-xl px-3 py-2 shadow-xl">
                                        <p className="font-semibold mb-1">{d.ligue}</p>
                                        <p style={{ color: '#10b981' }}>Clubs : {d.nb_clubs}</p>
                                        <p>Joueurs : {d.nb_joueurs.toLocaleString('fr-FR')}</p>
                                    </div>
                                );
                            }} />
                            <Bar dataKey="nb_clubs" fill="#10b981" radius={[8, 8, 0, 0]} name="Clubs" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Evolution top clubs */}
            {evoClubs.data.length > 1 && (
                <div className="bg-card rounded-xl border border-border p-5 shadow-sm mb-6">
                    <h3 className="font-semibold text-text mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-primary" /> Evolution des plus gros clubs dans le temps
                    </h3>
                    <p className="text-text-secondary text-xs mb-3">Cliquez sur un club pour l'afficher ou le masquer</p>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                        <button
                            onClick={() => setVisibleClubs(new Set(evoClubs.clubs.slice(0, TOP_N)))}
                            className="px-2.5 py-1 rounded-full text-xs font-medium border border-border bg-white dark:bg-slate-800 text-text-secondary hover:bg-gray-50 transition-colors"
                        >
                            Top {TOP_N}
                        </button>
                        <button
                            onClick={() => setVisibleClubs(prev => prev.size === evoClubs.clubs.length ? new Set(evoClubs.clubs.slice(0, TOP_N)) : new Set(evoClubs.clubs))}
                            className="px-2.5 py-1 rounded-full text-xs font-medium border border-border bg-white dark:bg-slate-800 text-text-secondary hover:bg-gray-50 transition-colors"
                        >
                            {visibleClubs.size === evoClubs.clubs.length ? 'Reduire' : 'Tous'}
                        </button>
                        <div className="w-px bg-border mx-1" />
                        {evoClubs.clubs.map((club, i) => {
                            const color = COLORS[i % COLORS.length];
                            const active = visibleClubs.has(club);
                            return (
                                <button
                                    key={club}
                                    onClick={() => setVisibleClubs(prev => {
                                        const next = new Set(prev);
                                        next.has(club) ? next.delete(club) : next.add(club);
                                        return next;
                                    })}
                                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 border ${active ? 'text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-text-secondary/50 border-border'}`}
                                    style={active ? { backgroundColor: color, borderColor: color } : {}}
                                >
                                    {club}
                                </button>
                            );
                        })}
                    </div>
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={evoClubs.data}>
                            <XAxis dataKey="mois" tickFormatter={formatMoisLabel} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => v.toLocaleString('fr-FR')} />
                            <Tooltip content={({ active, payload, label }) => {
                                if (!active || !payload?.length) return null;
                                const sorted = [...payload].sort((a, b) => (b.value || 0) - (a.value || 0));
                                return (
                                    <div className="bg-slate-900 text-white text-xs rounded-xl px-3 py-2 shadow-xl max-h-60 overflow-y-auto">
                                        <p className="font-semibold mb-1">{formatMoisLabel(label)}</p>
                                        {sorted.map((p, i) => (
                                            <p key={i} style={{ color: p.color }}>
                                                {p.name} : {typeof p.value === 'number' ? p.value.toLocaleString('fr-FR') : p.value}
                                            </p>
                                        ))}
                                    </div>
                                );
                            }} />
                            {evoClubs.clubs.map((club, i) => visibleClubs.has(club) && (
                                <Line key={club} type="monotone" dataKey={club} name={club} stroke={COLORS[i % COLORS.length]} strokeWidth={2.5} dot={false} connectNulls />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Tableau detaille */}
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="p-5 border-b border-border flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-semibold text-text">Tableau des clubs</h3>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
                            <input
                                type="text"
                                placeholder="Rechercher un club..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-8 pr-3 py-1.5 rounded-xl border border-border text-sm bg-white dark:bg-slate-800 text-text focus:outline-none focus:ring-2 focus:ring-primary/20 w-48"
                            />
                        </div>
                        <select value={mois} onChange={e => setMois(e.target.value)}
                            className="px-3 py-1.5 rounded-xl border border-border text-sm bg-white dark:bg-slate-800 text-text focus:outline-none focus:ring-2 focus:ring-primary/20">
                            {moisList.map(m => <option key={m.mois} value={m.mois}>{formatMoisLabel(m.mois)}</option>)}
                        </select>
                        <div className="flex rounded-xl border border-border overflow-hidden">
                            {[{ val: '', label: 'Tous' }, { val: 'H', label: 'H' }, { val: 'F', label: 'F' }].map(g => (
                                <button key={g.val} onClick={() => setGenre(g.val)}
                                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${genre === g.val ? 'bg-primary text-white' : 'bg-white dark:bg-slate-800 text-text-secondary hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                                    {g.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-slate-800/50">
                                <th className="px-3 py-3 text-left font-medium text-text-secondary">#</th>
                                <th className="px-3 py-3 text-left font-medium text-text-secondary">Club</th>
                                <th className="px-3 py-3 text-left font-medium text-text-secondary">Ligue</th>
                                <th className="px-3 py-3 text-right font-medium text-text-secondary">Total</th>
                                <th className="px-3 py-3 text-right font-medium text-text-secondary text-homme">H</th>
                                <th className="px-3 py-3 text-right font-medium text-text-secondary text-femme">F</th>
                                <th className="px-3 py-3 text-right font-medium text-text-secondary text-femme">%F</th>
                                <th className="px-3 py-3 text-right font-medium text-text-secondary">Meilleur rang</th>
                                <th className="px-3 py-3 text-right font-medium text-text-secondary">Pts moy.</th>
                                <th className="px-3 py-3 text-right font-medium text-text-secondary">Age moy.</th>
                                <th className="px-3 py-3 text-right font-medium text-text-secondary">Tournois moy.</th>
                                <th className="px-3 py-3 text-right font-medium text-text-secondary">Top 100</th>
                                <th className="px-3 py-3 text-right font-medium text-text-secondary">Top 500</th>
                                <th className="px-3 py-3 text-right font-medium text-text-secondary">-18 ans</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredClubs.map((c, i) => (
                                <tr key={c.club} className="border-t border-border hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="px-3 py-2.5 font-bold text-text-secondary">{i + 1}</td>
                                    <td className="px-3 py-2.5 font-semibold text-text whitespace-nowrap">{c.club}</td>
                                    <td className="px-3 py-2.5 text-text-secondary whitespace-nowrap">{c.ligue || '-'}</td>
                                    <td className="px-3 py-2.5 text-right font-medium">{c.total.toLocaleString('fr-FR')}</td>
                                    <td className="px-3 py-2.5 text-right text-homme">{c.hommes.toLocaleString('fr-FR')}</td>
                                    <td className="px-3 py-2.5 text-right text-femme">{c.femmes.toLocaleString('fr-FR')}</td>
                                    <td className="px-3 py-2.5 text-right">
                                        <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${c.pct_femmes >= 30 ? 'bg-femme/10 text-femme' : 'bg-gray-100 dark:bg-slate-700 text-text-secondary'}`}>
                                            {c.pct_femmes}%
                                        </span>
                                    </td>
                                    <td className="px-3 py-2.5 text-right font-medium text-yellow-600">{c.meilleur_rang}</td>
                                    <td className="px-3 py-2.5 text-right">{c.avg_points ? Math.round(c.avg_points).toLocaleString('fr-FR') : '-'}</td>
                                    <td className="px-3 py-2.5 text-right">{c.avg_age > 0 ? `${c.avg_age} ans` : '-'}</td>
                                    <td className="px-3 py-2.5 text-right">{c.avg_tournois > 0 ? c.avg_tournois : '-'}</td>
                                    <td className="px-3 py-2.5 text-right font-medium text-yellow-600">{c.top100 || 0}</td>
                                    <td className="px-3 py-2.5 text-right">{c.top500 || 0}</td>
                                    <td className="px-3 py-2.5 text-right text-text-secondary">{c.moins18 || 0}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredClubs.length === 0 && (
                    <div className="p-8 text-center text-text-secondary text-sm">
                        Aucun club trouve{search ? ` pour "${search}"` : ''}
                    </div>
                )}
            </div>
        </div>
    );
}
