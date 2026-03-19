import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend, AreaChart, Area } from 'recharts';
import { getMois, getAnalyticsDifficulte, getAnalyticsInflation, getAnalyticsFeminine, getAnalyticsRecords, getDashboardEvolution, getDashboardProgressions, getDashboardChutes } from '../api';
import { TrendingUp, TrendingDown, Zap, Flame, Users, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const HOMME = '#38BDF8';
const FEMME = '#FB7185';

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

export default function Evolution() {
    const navigate = useNavigate();
    const [moisList, setMoisList] = useState([]);
    const [mois, setMois] = useState('');
    const [genre, setGenre] = useState('');
    const [difficulte, setDifficulte] = useState([]);
    const [inflation, setInflation] = useState([]);
    const [feminine, setFeminine] = useState([]);
    const [records, setRecords] = useState(null);
    const [evolution, setEvolution] = useState([]);
    const [progressions, setProgressions] = useState([]);
    const [chutes, setChutes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { getMois().then(m => { setMoisList(m); if (m.length) setMois(m[0].mois); }); }, []);

    useEffect(() => {
        if (!mois) return;
        setLoading(true);
        const g = genre || undefined;
        Promise.all([
            getAnalyticsDifficulte(mois, g),
            getAnalyticsInflation(g),
            getAnalyticsFeminine(),
            getAnalyticsRecords(mois, g),
            getDashboardEvolution(g),
            getDashboardProgressions(mois, g, 10),
            getDashboardChutes(mois, g, 10),
        ]).then(([d, inf, fem, rec, evo, prog, ch]) => {
            setDifficulte(d); setInflation(inf); setFeminine(fem); setRecords(rec);
            setEvolution(evo); setProgressions(prog); setChutes(ch);
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
            <div className="grid sm:grid-cols-2 gap-4">{[...Array(2)].map((_, i) => <div key={i} className="h-28 bg-gray-200 dark:bg-gray-700 rounded-2xl" />)}</div>
            <div className="grid md:grid-cols-2 gap-6">{[...Array(4)].map((_, i) => <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-2xl" />)}</div>
        </div>
    );

    // Compute evolution deltas
    const latestEvo = evolution.length >= 2 ? evolution[evolution.length - 1] : null;
    const prevEvo = evolution.length >= 2 ? evolution[evolution.length - 2] : null;
    const deltaTotal = latestEvo && prevEvo ? latestEvo.total - prevEvo.total : null;
    const deltaHommes = latestEvo && prevEvo ? latestEvo.hommes - prevEvo.hommes : null;
    const deltaFemmes = latestEvo && prevEvo ? latestEvo.femmes - prevEvo.femmes : null;

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-text">Evolution</h1>
                    <p className="text-text-secondary text-sm mt-1">Suivi mensuel, progressions et tendances du classement</p>
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

            {/* KPI Row */}
            {latestEvo && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    {[
                        { label: 'Total classes', value: latestEvo.total, delta: deltaTotal, icon: Users },
                        { label: 'Hommes', value: latestEvo.hommes, delta: deltaHommes, color: 'text-homme' },
                        { label: 'Femmes', value: latestEvo.femmes, delta: deltaFemmes, color: 'text-femme' },
                        { label: 'Ratio F/H', value: latestEvo.femmes && latestEvo.hommes ? `${((latestEvo.femmes / latestEvo.total) * 100).toFixed(1)}%` : '-', delta: null },
                    ].map(({ label, value, delta, color, icon: Icon }) => (
                        <div key={label} className="bg-card rounded-2xl border border-border p-4 shadow-sm">
                            <div className="text-xs text-text-secondary mb-1 flex items-center gap-1.5">
                                {Icon && <Icon className="w-3.5 h-3.5" />}
                                {label}
                            </div>
                            <div className={`text-2xl font-bold ${color || 'text-text'}`}>
                                {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
                            </div>
                            {delta !== null && (
                                <div className={`text-xs font-medium mt-1 flex items-center gap-0.5 ${delta >= 0 ? 'text-success' : 'text-red-500'}`}>
                                    {delta >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                    {delta >= 0 ? '+' : ''}{delta.toLocaleString('fr-FR')} vs mois precedent
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Records du mois */}
            {records && (records.plus_grosse_progression || records.joueur_plus_actif) && (
                <div className="mb-6">
                    <h2 className="text-base font-bold text-text mb-3 flex items-center gap-2">
                        <Flame className="w-4 h-4 text-orange-500" /> Records du mois
                    </h2>
                    <div className="grid sm:grid-cols-2 gap-4">
                        {records.plus_grosse_progression && (() => {
                            const p = records.plus_grosse_progression;
                            return (
                                <div onClick={() => navigate(`/joueur/${p.id}`)}
                                    className="bg-card rounded-2xl border border-border shadow-sm p-5 cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-9 h-9 rounded-xl bg-success/10 flex items-center justify-center">
                                                <TrendingUp className="w-4 h-4 text-success" />
                                            </div>
                                            <div>
                                                <div className="text-xs text-text-secondary">Plus grosse progression</div>
                                                <div className="text-xs font-medium text-success">ce mois-ci</div>
                                            </div>
                                        </div>
                                        <span className="text-lg font-bold text-success font-mono">{p.evolution?.startsWith('+') ? p.evolution : `+${p.evolution}`}</span>
                                    </div>
                                    <div className="font-bold text-text group-hover:text-primary transition-colors">{p.prenom} {p.nom}</div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-xs px-2 py-0.5 rounded-full border ${p.genre === 'H' ? 'text-homme border-homme/30 bg-homme/5' : 'text-femme border-femme/30 bg-femme/5'}`}>
                                            {p.genre === 'H' ? 'Homme' : 'Femme'}
                                        </span>
                                        <span className="text-xs text-text-secondary">#{p.rang} · {p.ligue}</span>
                                    </div>
                                </div>
                            );
                        })()}
                        {records.joueur_plus_actif && (() => {
                            const p = records.joueur_plus_actif;
                            return (
                                <div onClick={() => navigate(`/joueur/${p.id}`)}
                                    className="bg-card rounded-2xl border border-border shadow-sm p-5 cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-9 h-9 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                                                <Zap className="w-4 h-4 text-yellow-500" />
                                            </div>
                                            <div>
                                                <div className="text-xs text-text-secondary">Joueur le plus actif</div>
                                                <div className="text-xs font-medium text-yellow-600">le plus de tournois</div>
                                            </div>
                                        </div>
                                        <span className="text-lg font-bold text-yellow-600 font-mono">{p.nb_tournois} <span className="text-xs font-normal text-text-secondary">tournois</span></span>
                                    </div>
                                    <div className="font-bold text-text group-hover:text-primary transition-colors">{p.prenom} {p.nom}</div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-xs px-2 py-0.5 rounded-full border ${p.genre === 'H' ? 'text-homme border-homme/30 bg-homme/5' : 'text-femme border-femme/30 bg-femme/5'}`}>
                                            {p.genre === 'H' ? 'Homme' : 'Femme'}
                                        </span>
                                        <span className="text-xs text-text-secondary">#{p.rang} · {p.ligue}</span>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* Evolution mensuelle du nombre de classes */}
            {evolution.length > 1 && (
                <div className="bg-card rounded-2xl border border-border p-5 shadow-sm mb-6">
                    <h3 className="font-semibold text-text mb-1">Evolution mensuelle du nombre de classes</h3>
                    <p className="text-xs text-text-secondary mb-4">Suivi hommes / femmes au fil des mois</p>
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={evolution}>
                            <defs>
                                <linearGradient id="gradH" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={HOMME} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={HOMME} stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gradF" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={FEMME} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={FEMME} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="mois" tickFormatter={formatMoisLabel} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip labelFormatter={formatMoisLabel} />} />
                            <Legend />
                            <Area type="monotone" dataKey="hommes" name="Hommes" stroke={HOMME} fill="url(#gradH)" strokeWidth={2} />
                            <Area type="monotone" dataKey="femmes" name="Femmes" stroke={FEMME} fill="url(#gradF)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}

            <div className="grid md:grid-cols-2 gap-6 mb-6">
                {/* Difficulte de progression */}
                <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                    <h3 className="font-semibold text-text mb-1">Difficulte de progression</h3>
                    <p className="text-xs text-text-secondary mb-4">Taux de joueurs ayant progresse par tranche de classement</p>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={difficulte}>
                            <XAxis dataKey="tranche" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} unit="%" axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} formatter={(v) => `${v}%`} />
                            <Bar dataKey="taux" fill="#10b981" radius={[8, 8, 0, 0]} name="Taux de progression" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Inflation des points */}
                {inflation.length > 1 && (
                    <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                        <h3 className="font-semibold text-text mb-1">Inflation des points</h3>
                        <p className="text-xs text-text-secondary mb-4">Points necessaires pour chaque rang au fil du temps</p>
                        <ResponsiveContainer width="100%" height={280}>
                            <LineChart data={inflation}>
                                <XAxis dataKey="mois" tickFormatter={formatMoisLabel} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip labelFormatter={formatMoisLabel} />} formatter={(v) => v?.toLocaleString('fr-FR') + ' pts'} />
                                <Legend />
                                <Line type="monotone" dataKey="rang_1" name="~#1" stroke="#ef4444" strokeWidth={2} dot={false} connectNulls />
                                <Line type="monotone" dataKey="rang_10" name="~#10" stroke="#f59e0b" strokeWidth={2} dot={false} connectNulls />
                                <Line type="monotone" dataKey="rang_100" name="~#100" stroke="#10b981" strokeWidth={2} dot={false} connectNulls />
                                <Line type="monotone" dataKey="rang_1000" name="~#1000" stroke="#0ea5e9" strokeWidth={2} dot={false} connectNulls />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* Meilleures progressions + plus grosses chutes */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                    <h3 className="font-semibold text-text mb-4 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-success" /> Top 10 progressions
                    </h3>
                    {progressions.length > 0 ? (
                        <div className="space-y-1.5">
                            {progressions.map((p, i) => (
                                <div key={p.id || i} onClick={() => navigate(`/joueur/${p.id}`)}
                                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-bold text-text-secondary w-5">{i + 1}</span>
                                        <div>
                                            <div className="text-sm font-medium text-text">{p.prenom} {p.nom}</div>
                                            <div className="text-xs text-text-secondary">#{p.rang} · {p.ligue}</div>
                                        </div>
                                    </div>
                                    <span className="text-sm font-bold text-success font-mono">{p.evolution}</span>
                                </div>
                            ))}
                        </div>
                    ) : <p className="text-text-secondary text-sm text-center py-6">Pas de donnees</p>}
                </div>

                <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                    <h3 className="font-semibold text-text mb-4 flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-red-500" /> Top 10 chutes
                    </h3>
                    {chutes.length > 0 ? (
                        <div className="space-y-1.5">
                            {chutes.map((p, i) => (
                                <div key={p.id || i} onClick={() => navigate(`/joueur/${p.id}`)}
                                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-bold text-text-secondary w-5">{i + 1}</span>
                                        <div>
                                            <div className="text-sm font-medium text-text">{p.prenom} {p.nom}</div>
                                            <div className="text-xs text-text-secondary">#{p.rang} · {p.ligue}</div>
                                        </div>
                                    </div>
                                    <span className="text-sm font-bold text-red-500 font-mono">{p.evolution}</span>
                                </div>
                            ))}
                        </div>
                    ) : <p className="text-text-secondary text-sm text-center py-6">Pas de donnees</p>}
                </div>
            </div>

            {/* Participation feminine */}
            {feminine.length > 0 && (
                <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                    <h3 className="font-semibold text-text mb-1">Participation feminine</h3>
                    <p className="text-xs text-text-secondary mb-3">Evolution du ratio femmes/total par mois</p>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        {(() => {
                            const latest = feminine[feminine.length - 1];
                            const prev = feminine.length >= 2 ? feminine[feminine.length - 2] : null;
                            const deltaPct = prev ? (latest.pct_femmes - prev.pct_femmes).toFixed(2) : null;
                            return (
                                <>
                                    <div className="text-center p-3 bg-femme/10 rounded-xl">
                                        <div className="text-xl font-bold text-femme">{latest.pct_femmes}%</div>
                                        <div className="text-xs text-text-secondary">Femmes</div>
                                        {deltaPct && <div className={`text-xs mt-1 ${Number(deltaPct) >= 0 ? 'text-success' : 'text-red-500'}`}>{Number(deltaPct) >= 0 ? '+' : ''}{deltaPct}pt</div>}
                                    </div>
                                    <div className="text-center p-3 bg-homme/10 rounded-xl">
                                        <div className="text-xl font-bold text-homme">{(100 - latest.pct_femmes).toFixed(2)}%</div>
                                        <div className="text-xs text-text-secondary">Hommes</div>
                                    </div>
                                    <div className="text-center p-3 bg-primary/10 rounded-xl">
                                        <div className="text-xl font-bold text-primary">{latest.total.toLocaleString('fr-FR')}</div>
                                        <div className="text-xs text-text-secondary">Total</div>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={feminine}>
                            <XAxis dataKey="mois" tickFormatter={formatMoisLabel} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip labelFormatter={formatMoisLabel} />} formatter={(v) => v.toLocaleString('fr-FR')} />
                            <Legend />
                            <Bar dataKey="hommes" stackId="a" fill={HOMME} name="Hommes" />
                            <Bar dataKey="femmes" stackId="a" fill={FEMME} radius={[8, 8, 0, 0]} name="Femmes" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}
