import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, ComposedChart, Area } from 'recharts';
import { getMois, getAnalyticsNumeroUn, getAnalyticsDifficulte, getAnalyticsInflation, getAnalyticsNationalites, getAnalyticsAge, getAnalyticsFrequence, getAnalyticsProfil, getAnalyticsCompetitivite, getAnalyticsFeminine, getAnalyticsRecords, getAnalyticsEvolutionNationalites, getAnalyticsRangPoints } from '../api';
import { Trophy, Target, TrendingUp, Flame, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const COLORS = ['#0ea5e9', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];
const HOMME = '#38BDF8';
const FEMME = '#FB7185';

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

export default function Analytics() {
    const navigate = useNavigate();
    const [moisList, setMoisList] = useState([]);
    const [mois, setMois] = useState('');
    const [genre, setGenre] = useState('');
    const [top, setTop] = useState(100);
    const [profil, setProfil] = useState(null);
    const [hall, setHall] = useState([]);
    const [difficulte, setDifficulte] = useState([]);
    const [inflation, setInflation] = useState([]);
    const [nationalites, setNationalites] = useState([]);
    const [ages, setAges] = useState([]);
    const [frequence, setFrequence] = useState([]);
    const [competitivite, setCompetitivite] = useState([]);
    const [feminine, setFeminine] = useState([]);
    const [records, setRecords] = useState(null);
    const [evolutionNat, setEvolutionNat] = useState({ nationalites: [], data: [] });
    const [rangPoints, setRangPoints] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { getMois().then(m => { setMoisList(m); if (m.length) setMois(m[0].mois); }); }, []);

    useEffect(() => {
        if (!mois) return;
        setLoading(true);
        const g = genre || undefined;
        Promise.all([
            getAnalyticsProfil(mois, top, g),
            getAnalyticsNumeroUn(g),
            getAnalyticsDifficulte(mois, g),
            getAnalyticsInflation(g),
            getAnalyticsNationalites(mois, top, g),
            getAnalyticsAge(mois, g),
            getAnalyticsFrequence(mois, g),
            getAnalyticsCompetitivite(mois, g),
            getAnalyticsFeminine(),
            getAnalyticsRecords(mois, g),
            getAnalyticsEvolutionNationalites(g, 5),
            getAnalyticsRangPoints(mois, g),
        ]).then(([pr, h, d, inf, n, a, f, comp, fem, rec, evNat, rp]) => {
            setProfil(pr); setHall(h); setDifficulte(d); setInflation(inf);
            setNationalites(n); setAges(a); setFrequence(f);
            setCompetitivite(comp); setFeminine(fem); setRecords(rec);
            setEvolutionNat(evNat); setRangPoints(rp);
            setLoading(false);
        });
    }, [mois, genre, top]);

    const formatMoisLabel = (m) => {
        if (!m) return '';
        const [y, mo] = m.split('-');
        const months = ['', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
        return `${months[parseInt(mo)]} ${y}`;
    };

    if (loading) return (
        <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="grid md:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-gray-200 rounded-2xl" />)}
            </div>
            <div className="grid md:grid-cols-2 gap-6">
                {[...Array(6)].map((_, i) => <div key={i} className="h-64 bg-gray-200 rounded-2xl" />)}
            </div>
        </div>
    );

    return (
        <div>
            {/* Header + Filters */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-text">📈 Analytics</h1>
                    <p className="text-text-secondary text-sm mt-1">Analyses avancées et statistiques uniques</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <select value={mois} onChange={e => setMois(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all">
                        {moisList.map(m => <option key={m.mois} value={m.mois}>{formatMoisLabel(m.mois)}</option>)}
                    </select>
                    <div className="flex rounded-xl border border-border overflow-hidden">
                        {[{ val: '', label: 'Tous' }, { val: 'H', label: 'H' }, { val: 'F', label: 'F' }].map(g => (
                            <button key={g.val} onClick={() => setGenre(g.val)}
                                className={`px-3 py-2 text-sm font-medium transition-colors ${genre === g.val ? 'bg-primary text-white' : 'bg-white text-text-secondary hover:bg-gray-50'}`}>
                                {g.label}
                            </button>
                        ))}
                    </div>
                    <select value={top} onChange={e => setTop(Number(e.target.value))}
                        className="px-3 py-2 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all">
                        {[100, 500, 1000, 5000, 10000].map(n => <option key={n} value={n}>Top {n}</option>)}
                    </select>
                </div>
            </div>

            {/* ── Records du mois ──────────────────────────────────────────── */}
            {records && (records.plus_grosse_progression || records.joueur_plus_actif) && (
                <div className="mb-6">
                    <h2 className="text-base font-bold text-text mb-3 flex items-center gap-2">
                        <Flame className="w-4 h-4 text-orange-500" /> Records du mois
                    </h2>
                    <div className="grid sm:grid-cols-2 gap-4">
                        {/* Plus grosse progression */}
                        {records.plus_grosse_progression && (() => {
                            const p = records.plus_grosse_progression;
                            const evol = p.evolution;
                            return (
                                <div
                                    onClick={() => navigate(`/joueur/${p.id}`)}
                                    className="bg-card rounded-2xl border border-border shadow-sm p-5 cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group"
                                >
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
                                        <span className="text-lg font-bold text-success font-data">
                                            {evol?.startsWith('+') ? evol : `+${evol}`}
                                        </span>
                                    </div>
                                    <div className="font-bold text-text group-hover:text-primary transition-colors">
                                        {p.prenom} {p.nom}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-xs px-2 py-0.5 rounded-full border ${p.genre === 'H' ? 'text-homme border-homme/30 bg-homme/5' : 'text-femme border-femme/30 bg-femme/5'}`}>
                                            {p.genre === 'H' ? 'Homme' : 'Femme'}
                                        </span>
                                        <span className="text-xs text-text-secondary">#{p.rang} · {p.ligue}</span>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Joueur le plus actif */}
                        {records.joueur_plus_actif && (() => {
                            const p = records.joueur_plus_actif;
                            return (
                                <div
                                    onClick={() => navigate(`/joueur/${p.id}`)}
                                    className="bg-card rounded-2xl border border-border shadow-sm p-5 cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group"
                                >
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
                                        <span className="text-lg font-bold text-yellow-600 font-data">
                                            {p.nb_tournois} <span className="text-xs font-normal text-text-secondary">tournois</span>
                                        </span>
                                    </div>
                                    <div className="font-bold text-text group-hover:text-primary transition-colors">
                                        {p.prenom} {p.nom}
                                    </div>
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

            {/* Profil type */}
            {profil && profil.total > 0 && (
                <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl border border-primary/20 p-6 mb-6 shadow-sm">
                    <h3 className="font-bold text-lg text-text mb-4 flex items-center gap-2">
                        <Target className="w-5 h-5 text-primary" /> Profil type — Top {top}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {[
                            { label: 'Joueurs', value: profil.total },
                            { label: 'Âge moyen', value: `${profil.avg_age} ans` },
                            { label: 'Points moy.', value: profil.avg_points?.toLocaleString('fr-FR') },
                            { label: 'Tournois moy.', value: profil.avg_tournois },
                            { label: 'Nationalité', value: profil.nationalite_principale || '-' },
                        ].map(({ label, value }) => (
                            <div key={label} className="text-center">
                                <div className="text-xs text-text-secondary mb-1">{label}</div>
                                <div className="text-xl font-bold text-text">{value}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid md:grid-cols-2 gap-6 mb-6">
                {/* Hall of Fame */}
                <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                    <h3 className="font-semibold text-text mb-4 flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-yellow-500" /> Hall of Fame — Numéro 1
                    </h3>
                    {hall.length === 0 ? (
                        <p className="text-text-secondary text-sm text-center py-6">Pas de données historiques</p>
                    ) : (
                        <div className="space-y-2">
                            {hall.map((h, i) => (
                                <div key={i} onClick={() => navigate(`/joueur/${h.id}`)}
                                    className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-all duration-200 border border-transparent hover:border-border">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm ${i === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-text-secondary'}`}>
                                            {i + 1}
                                        </div>
                                        <div>
                                            <div className="font-medium text-sm">{h.prenom} {h.nom}</div>
                                            <div className="text-xs text-text-secondary">{h.nationalite}</div>
                                        </div>
                                    </div>
                                    <div className="font-bold text-primary text-sm">{h.nb_mois} mois</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Difficulté de progression */}
                <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                    <h3 className="font-semibold text-text mb-4">Difficulté de progression</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={difficulte}>
                            <XAxis dataKey="tranche" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} unit="%" axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} formatter={(v) => `${v}%`} />
                            <Bar dataKey="taux" fill="#10b981" radius={[8, 8, 0, 0]} name="Taux de progression" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
                {/* Nationalités */}
                <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                    <h3 className="font-semibold text-text mb-4">Nationalités — Top {top}</h3>
                    {nationalites.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie data={nationalites.slice(0, 8)} dataKey="count" nameKey="nationalite" cx="50%" cy="50%"
                                    innerRadius={60} outerRadius={100} strokeWidth={2}>
                                    {nationalites.slice(0, 8).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} formatter={(v) => v.toLocaleString('fr-FR')} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : <p className="text-text-secondary text-center py-8 text-sm">Pas de données</p>}
                </div>

                {/* Évolution nationalités dans le temps */}
                {evolutionNat.data.length > 1 && (
                    <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                        <h3 className="font-semibold text-text mb-1">Évolution des nationalités</h3>
                        <p className="text-xs text-text-secondary mb-4">Nombre de classés par nationalité au fil du temps</p>
                        <ResponsiveContainer width="100%" height={280}>
                            <LineChart data={evolutionNat.data}>
                                <XAxis dataKey="mois" tickFormatter={formatMoisLabel} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} labelFormatter={formatMoisLabel} formatter={(v) => v.toLocaleString('fr-FR')} />
                                <Legend />
                                {evolutionNat.nationalites.map((nat, i) => (
                                    <Line key={nat} type="monotone" dataKey={nat} name={nat}
                                        stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} connectNulls />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
                {/* Âge par niveau */}
                <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                    <h3 className="font-semibold text-text mb-4">Âge moyen par niveau</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={ages}>
                            <XAxis dataKey="tranche" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} domain={[0, 50]} unit=" ans" axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} formatter={(v) => `${v} ans`} />
                            <Bar dataKey="avg_age" fill="#8b5cf6" radius={[8, 8, 0, 0]} name="Âge moyen" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Courbe classement / points (logarithmique) */}
                {rangPoints.length > 0 && (
                    <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                        <h3 className="font-semibold text-text mb-1">Courbe classement / points</h3>
                        <p className="text-xs text-text-secondary mb-4">Points moyens par tranche de classement — courbe logarithmique naturelle</p>
                        <ResponsiveContainer width="100%" height={280}>
                            <ComposedChart data={rangPoints}>
                                <defs>
                                    <linearGradient id="gradRangPts" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="tranche" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} formatter={(v) => `${v.toLocaleString('fr-FR')} pts`} />
                                <Area type="monotone" dataKey="avg_pts" fill="url(#gradRangPts)" stroke="none" />
                                <Line type="monotone" dataKey="avg_pts" name="Points moyens" stroke="#0ea5e9" strokeWidth={2.5} dot={{ r: 4, fill: '#0ea5e9' }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
                {/* Fréquence tournois */}
                <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                    <h3 className="font-semibold text-text mb-4">Fréquence de participation aux tournois</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={frequence} layout="vertical" margin={{ left: 5 }}>
                            <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis type="category" dataKey="tranche" tick={{ fontSize: 11, fill: '#94a3b8' }} width={50} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} formatter={(v) => v.toLocaleString('fr-FR')} />
                            <Bar dataKey="count" fill="#f59e0b" radius={[0, 8, 8, 0]} name="Joueurs" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Inflation des points */}
                {inflation.length > 1 && (
                    <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                        <h3 className="font-semibold text-text mb-4">Inflation des points</h3>
                        <ResponsiveContainer width="100%" height={280}>
                            <LineChart data={inflation}>
                                <XAxis dataKey="mois" tickFormatter={formatMoisLabel} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} labelFormatter={formatMoisLabel} formatter={(v) => v?.toLocaleString('fr-FR') + ' pts'} />
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
            </div>

            {/* Advanced Analytics */}
            <div className="mt-6">
                <h2 className="text-lg font-bold text-text mb-4">🧠 Analyses avancées</h2>
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Compétitivité */}
                    {competitivite.length > 0 && (
                        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                            <h3 className="font-semibold text-text mb-1">Indice de compétitivité par ligue</h3>
                            <p className="text-xs text-text-secondary mb-4">Moyenne des points du Top 10 de chaque ligue</p>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={competitivite.slice(0, 10)} layout="vertical" margin={{ left: 10 }}>
                                    <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                    <YAxis type="category" dataKey="ligue" tick={{ fontSize: 10, fill: '#94a3b8' }} width={80}
                                        axisLine={false} tickLine={false}
                                        tickFormatter={(v) => {
                                            const abbr = { "PROVENCE ALPES COTE D'AZUR": 'PACA', 'AUVERGNE RHONE-ALPES': 'ARA', 'NOUVELLE AQUITAINE': 'N-AQUIT.', 'ILE DE FRANCE': 'IDF', 'HAUTS DE FRANCE': 'HDF', 'BOURGOGNE FRANCHE COMTE': 'BFC', 'CENTRE VAL DE LOIRE': 'CVL', 'PAYS DE LA LOIRE': 'PDL', 'GRAND EST': 'GD EST' };
                                            return abbr[v] || v.slice(0, 10);
                                        }} />
                                    <Tooltip content={<CustomTooltip />} formatter={(v) => `${v.toLocaleString('fr-FR')} pts`} />
                                    <Bar dataKey="avg_top10_pts" fill="#8b5cf6" radius={[0, 8, 8, 0]} name="Moy. Top 10" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Participation féminine */}
                    {feminine.length > 0 && (
                        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                            <h3 className="font-semibold text-text mb-1">Participation féminine</h3>
                            <p className="text-xs text-text-secondary mb-3">Évolution du ratio femmes/total par mois</p>
                            <div className="grid grid-cols-3 gap-3 mb-4">
                                {(() => {
                                    const latest = feminine[feminine.length - 1];
                                    const first = feminine[0];
                                    const delta = (latest.pct_femmes - first.pct_femmes).toFixed(2);
                                    return (
                                        <>
                                            <div className="text-center p-2 bg-femme/10 rounded-xl">
                                                <div className="text-lg font-bold text-femme">{latest.pct_femmes}%</div>
                                                <div className="text-xs text-text-secondary">Femmes actuellement</div>
                                            </div>
                                            <div className="text-center p-2 bg-homme/10 rounded-xl">
                                                <div className="text-lg font-bold text-homme">{(100 - latest.pct_femmes).toFixed(2)}%</div>
                                                <div className="text-xs text-text-secondary">Hommes</div>
                                            </div>
                                            <div className="text-center p-2 bg-primary/10 rounded-xl">
                                                <div className={`text-lg font-bold ${delta >= 0 ? 'text-success' : 'text-danger'}`}>{delta >= 0 ? '+' : ''}{delta}%</div>
                                                <div className="text-xs text-text-secondary">Évolution totale</div>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                            {/* % line chart */}
                            <p className="text-xs font-medium text-text-secondary mb-1">% femmes dans le temps</p>
                            <ResponsiveContainer width="100%" height={130}>
                                <ComposedChart data={feminine}>
                                    <defs>
                                        <linearGradient id="gradFem" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#FB7185" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#FB7185" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="mois" tickFormatter={formatMoisLabel} tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} unit="%" domain={['auto', 'auto']} axisLine={false} tickLine={false} width={35} />
                                    <Tooltip content={<CustomTooltip />} labelFormatter={formatMoisLabel} formatter={(v) => `${v}%`} />
                                    <Area type="monotone" dataKey="pct_femmes" fill="url(#gradFem)" stroke="none" />
                                    <Line type="monotone" dataKey="pct_femmes" name="% Femmes" stroke={FEMME} strokeWidth={2} dot={false} />
                                </ComposedChart>
                            </ResponsiveContainer>
                            {/* stacked absolute */}
                            <p className="text-xs font-medium text-text-secondary mt-3 mb-1">Effectifs absolus</p>
                            <ResponsiveContainer width="100%" height={130}>
                                <BarChart data={feminine}>
                                    <XAxis dataKey="mois" tickFormatter={formatMoisLabel} tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip />} labelFormatter={formatMoisLabel} formatter={(v) => v.toLocaleString('fr-FR')} />
                                    <Legend />
                                    <Bar dataKey="hommes" stackId="a" fill={HOMME} name="Hommes" />
                                    <Bar dataKey="femmes" stackId="a" fill={FEMME} radius={[4, 4, 0, 0]} name="Femmes" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
