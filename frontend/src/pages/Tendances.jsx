import { useState, useEffect } from 'react';
import {
    LineChart, Line, AreaChart, Area, BarChart, Bar,
    XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
    getDashboardEvolution, getAnalyticsFeminine,
    getAnalyticsEvolutionNationalites, getAnalyticsEvolutionAssimiles,
    getAnalyticsEvolutionAgeMoyen,
} from '../api';
import { TrendingUp, Globe, Users, Clock, Shield } from 'lucide-react';

const HOMME = '#38BDF8';
const FEMME = '#FB7185';
const COLORS = ['#0ea5e9', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16'];

const formatMoisLabel = (m) => {
    if (!m) return '';
    const [y, mo] = m.split('-');
    const months = ['', 'Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aout', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[parseInt(mo)]} ${y}`;
};

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-slate-900 text-white text-xs rounded-xl px-3 py-2 shadow-xl">
            <p className="font-semibold mb-1">{formatMoisLabel(label)}</p>
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color || '#fff' }}>
                    {p.name} : {typeof p.value === 'number' ? p.value.toLocaleString('fr-FR') : p.value}
                </p>
            ))}
        </div>
    );
};

const Section = ({ icon: Icon, title, subtitle, children }) => (
    <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
            <Icon className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-text">{title}</h3>
        </div>
        <p className="text-xs text-text-secondary mb-4">{subtitle}</p>
        {children}
    </div>
);

export default function Tendances() {
    const [genre, setGenre] = useState('');
    const [evolution, setEvolution] = useState([]);
    const [feminine, setFeminine] = useState([]);
    const [natEvo, setNatEvo] = useState({ nationalites: [], data: [] });
    const [assimiles, setAssimiles] = useState([]);
    const [ageMoyen, setAgeMoyen] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const g = genre || undefined;
        Promise.all([
            getDashboardEvolution(g),
            getAnalyticsFeminine(),
            getAnalyticsEvolutionNationalites(g, 6),
            getAnalyticsEvolutionAssimiles(g),
            getAnalyticsEvolutionAgeMoyen(),
        ]).then(([evo, fem, nat, assim, age]) => {
            setEvolution(evo);
            setFeminine(fem);
            setNatEvo(nat);
            setAssimiles(assim);
            setAgeMoyen(age);
            setLoading(false);
        });
    }, [genre]);

    if (loading) return (
        <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            {[...Array(4)].map((_, i) => (
                <div key={i} className="h-72 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
            ))}
        </div>
    );

    return (
        <div>
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-text">Tendances</h1>
                    <p className="text-text-secondary text-sm mt-1">Évolution de toutes les métriques clés dans le temps</p>
                </div>
                <div className="flex rounded-xl border border-border overflow-hidden">
                    {[{ val: '', label: 'Tous' }, { val: 'H', label: 'H' }, { val: 'F', label: 'F' }].map(g => (
                        <button key={g.val} onClick={() => setGenre(g.val)}
                            className={`px-3 py-2 text-sm font-medium transition-colors ${genre === g.val ? 'bg-primary text-white' : 'bg-card text-text-secondary hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                            {g.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-6">

                {/* Évolution du nombre de classés */}
                {evolution.length > 1 && (
                    <Section icon={Users} title="Évolution du nombre de classés" subtitle="Hommes et femmes au fil des mois">
                        <ResponsiveContainer width="100%" height={280}>
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
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                                <Area type="monotone" dataKey="hommes" name="Hommes" stroke={HOMME} fill="url(#gradH)" strokeWidth={2} />
                                <Area type="monotone" dataKey="femmes" name="Femmes" stroke={FEMME} fill="url(#gradF)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Section>
                )}

                {/* Participation féminine */}
                {feminine.length > 1 && (
                    <Section icon={Users} title="Participation féminine" subtitle="Ratio femmes / total et évolution mois par mois">
                        {(() => {
                            const latest = feminine[feminine.length - 1];
                            const prev = feminine.length >= 2 ? feminine[feminine.length - 2] : null;
                            const deltaPct = prev ? (latest.pct_femmes - prev.pct_femmes).toFixed(2) : null;
                            return (
                                <div className="grid grid-cols-3 gap-3 mb-4">
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
                                </div>
                            );
                        })()}
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={feminine}>
                                <XAxis dataKey="mois" tickFormatter={formatMoisLabel} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                                <Bar dataKey="hommes" stackId="a" fill={HOMME} name="Hommes" />
                                <Bar dataKey="femmes" stackId="a" fill={FEMME} radius={[8, 8, 0, 0]} name="Femmes" />
                            </BarChart>
                        </ResponsiveContainer>
                    </Section>
                )}

                {/* Évolution des nationalités */}
                {natEvo.data.length > 1 && (
                    <Section icon={Globe} title="Évolution des nationalités" subtitle="Nombre de joueurs par nationalité (top 6) mois par mois">
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={natEvo.data}>
                                <XAxis dataKey="mois" tickFormatter={formatMoisLabel} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                                {natEvo.nationalites.map((nat, i) => (
                                    <Line key={nat} type="monotone" dataKey={nat} name={nat} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} connectNulls />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </Section>
                )}

                {/* Âge moyen dans le temps */}
                {ageMoyen.length > 1 && (
                    <Section icon={Clock} title="Âge moyen dans le temps" subtitle="Évolution de l'âge moyen de tous les joueurs classés">
                        <ResponsiveContainer width="100%" height={280}>
                            <LineChart data={ageMoyen}>
                                <XAxis dataKey="mois" tickFormatter={formatMoisLabel} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} domain={['auto', 'auto']} unit=" ans" axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} formatter={(v) => `${v} ans`} />
                                <Legend />
                                <Line type="monotone" dataKey="avg_age" name="Tous" stroke="#8b5cf6" strokeWidth={2.5} dot={false} connectNulls />
                                <Line type="monotone" dataKey="avg_age_h" name="Hommes" stroke={HOMME} strokeWidth={2} dot={false} strokeDasharray="4 2" connectNulls />
                                <Line type="monotone" dataKey="avg_age_f" name="Femmes" stroke={FEMME} strokeWidth={2} dot={false} strokeDasharray="4 2" connectNulls />
                            </LineChart>
                        </ResponsiveContainer>
                    </Section>
                )}

                {/* Évolution des assimilés */}
                {assimiles.length > 1 && (
                    <Section icon={Shield} title="Évolution des assimilés" subtitle="Joueurs assimilés (étrangers classés FFT) — nombre et pourcentage dans le temps">
                        {(() => {
                            const latest = assimiles[assimiles.length - 1];
                            const prev = assimiles.length >= 2 ? assimiles[assimiles.length - 2] : null;
                            const delta = prev ? latest.assimiles - prev.assimiles : null;
                            return (
                                <div className="grid grid-cols-3 gap-3 mb-4">
                                    <div className="text-center p-3 bg-amber-500/10 rounded-xl">
                                        <div className="text-xl font-bold text-amber-600">{latest.assimiles.toLocaleString('fr-FR')}</div>
                                        <div className="text-xs text-text-secondary">Assimilés</div>
                                        {delta !== null && <div className={`text-xs mt-1 ${delta >= 0 ? 'text-success' : 'text-red-500'}`}>{delta >= 0 ? '+' : ''}{delta}</div>}
                                    </div>
                                    <div className="text-center p-3 bg-amber-500/10 rounded-xl">
                                        <div className="text-xl font-bold text-amber-600">{latest.pct_assimiles}%</div>
                                        <div className="text-xs text-text-secondary">% du total</div>
                                    </div>
                                    <div className="text-center p-3 bg-primary/10 rounded-xl">
                                        <div className="text-xl font-bold text-primary">{latest.total.toLocaleString('fr-FR')}</div>
                                        <div className="text-xs text-text-secondary">Total classés</div>
                                    </div>
                                </div>
                            );
                        })()}
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={assimiles}>
                                <XAxis dataKey="mois" tickFormatter={formatMoisLabel} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis yAxisId="right" orientation="right" unit="%" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                                <Line yAxisId="left" type="monotone" dataKey="assimiles" name="Nb assimilés" stroke="#f59e0b" strokeWidth={2} dot={false} />
                                <Line yAxisId="right" type="monotone" dataKey="pct_assimiles" name="% assimilés" stroke="#f97316" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                            </LineChart>
                        </ResponsiveContainer>
                    </Section>
                )}

            </div>
        </div>
    );
}
