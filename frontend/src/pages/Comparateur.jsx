import { useState } from 'react';
import { Search, GitCompare, Trophy, TrendingUp, MapPin, Calendar, Zap, ChevronRight, Activity } from 'lucide-react';
import { rechercher, getComparaison } from '../api';
import {
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    ResponsiveContainer, Tooltip,
} from 'recharts';

const HOMME = '#38BDF8';
const FEMME = '#FB7185';
const VOLT = '#CCFF00';

const parseEvol = (e) => {
    if (!e || e === '=') return 0;
    return parseInt(e.replace('+', '')) || 0;
};

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-slate-900 text-white text-xs rounded-xl px-3 py-2 shadow-xl border-0">
            <p className="font-semibold mb-1">{label}</p>
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color }}>{p.name} : {p.value}</p>
            ))}
        </div>
    );
};

export default function Comparateur() {
    const [q1, setQ1] = useState('');
    const [q2, setQ2] = useState('');
    const [suggestions1, setSuggestions1] = useState([]);
    const [suggestions2, setSuggestions2] = useState([]);
    const [selected1, setSelected1] = useState(null);
    const [selected2, setSelected2] = useState(null);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showSim, setShowSim] = useState(false);

    const search = async (q, setSugg) => {
        if (q.length < 2) { setSugg([]); return; }
        const r = await rechercher(q);
        setSugg(r);
    };

    const compare = async () => {
        if (!selected1 || !selected2) return;
        setLoading(true);
        setShowSim(false);
        const r = await getComparaison(selected1.id, selected2.id);
        setResult(r);
        setLoading(false);
    };

    /* ── Radar data ────────────────────────────────────────────────── */
    const getRadarData = () => {
        if (!result?.joueur1 || !result?.joueur2) return [];
        const h1 = result.joueur1.historique[0] || {};
        const h2 = result.joueur2.historique[0] || {};

        // Points — normalisés entre les deux joueurs
        const maxPts = Math.max(h1.points || 0, h2.points || 0, 1);
        const pts1 = Math.round(((h1.points || 0) / maxPts) * 100);
        const pts2 = Math.round(((h2.points || 0) / maxPts) * 100);

        // Classement — rang inversé (rang 1 = 100, rang élevé = score bas)
        const maxRang = Math.max(h1.rang || 1, h2.rang || 1, 1);
        const rk1 = Math.round((1 - ((h1.rang || maxRang) - 1) / Math.max(maxRang - 1, 1)) * 100);
        const rk2 = Math.round((1 - ((h2.rang || maxRang) - 1) / Math.max(maxRang - 1, 1)) * 100);

        // Activité — nb de tournois normalisé
        const maxTrn = Math.max(h1.nb_tournois || 0, h2.nb_tournois || 0, 1);
        const act1 = Math.round(((h1.nb_tournois || 0) / maxTrn) * 100);
        const act2 = Math.round(((h2.nb_tournois || 0) / maxTrn) * 100);

        // Progression — basée sur l'évolution récente du classement
        const ev1 = parseEvol(h1.evolution);
        const ev2 = parseEvol(h2.evolution);
        const eMax = Math.max(Math.abs(ev1), Math.abs(ev2), 1);
        const prog1 = Math.min(100, Math.max(0, Math.round(50 + (ev1 / eMax) * 50)));
        const prog2 = Math.min(100, Math.max(0, Math.round(50 + (ev2 / eMax) * 50)));

        return [
            { axis: 'Points',      j1: pts1, j2: pts2 },
            { axis: 'Classement',  j1: rk1,  j2: rk2 },
            { axis: 'Activité',    j1: act1, j2: act2 },
            { axis: 'Progression', j1: prog1, j2: prog2 },
        ];
    };

    /* ── Match Simulation ──────────────────────────────────────────── */
    const getSimulation = () => {
        if (!result?.joueur1 || !result?.joueur2) return null;
        const h1 = result.joueur1.historique[0] || {};
        const h2 = result.joueur2.historique[0] || {};

        const score = (h) => {
            const pts = h.points || 0;
            const rnk = Math.max(0, 10000 - (h.rang || 10000));
            const trn = (h.nb_tournois || 0) * 50;
            const ev = Math.max(0, parseEvol(h.evolution)) * 30;
            return pts * 0.50 + rnk * 3 * 0.30 + trn * 0.12 + ev * 0.08;
        };

        const s1 = score(h1);
        const s2 = score(h2);
        const total = s1 + s2;
        const prob1 = total > 0 ? Math.round((s1 / total) * 100) : 50;
        return {
            prob1,
            prob2: 100 - prob1,
            winner: prob1 >= 50 ? result.joueur1.joueur : result.joueur2.joueur,
            winnerIdx: prob1 >= 50 ? 1 : 2,
        };
    };

    /* ── StatRow ───────────────────────────────────────────────────── */
    const StatRow = ({ label, v1, v2, icon: Icon, isBetter }) => {
        const better1 = isBetter === 'lower' ? Number(v1) < Number(v2) : Number(v1) > Number(v2);
        const better2 = isBetter === 'lower' ? Number(v2) < Number(v1) : Number(v2) > Number(v1);
        return (
            <div className="flex items-center py-3 gap-2">
                <div className={`flex-1 text-right font-semibold text-sm ${better1 && isBetter ? 'text-success' : 'text-text'}`}>
                    {typeof v1 === 'number' ? v1.toLocaleString('fr-FR') : v1}
                </div>
                <div className="w-32 text-center text-xs text-text-secondary font-medium flex items-center justify-center gap-1.5 px-2">
                    {Icon && <Icon className="w-3.5 h-3.5" />} {label}
                </div>
                <div className={`flex-1 font-semibold text-sm ${better2 && isBetter ? 'text-success' : 'text-text'}`}>
                    {typeof v2 === 'number' ? v2.toLocaleString('fr-FR') : v2}
                </div>
            </div>
        );
    };

    const radarData = getRadarData();
    const sim = showSim ? getSimulation() : null;
    const c1 = result?.joueur1?.joueur?.genre === 'F' ? FEMME : HOMME;
    const c2 = result?.joueur2?.joueur?.genre === 'F' ? FEMME : HOMME;

    return (
        <div>
            {/* Hero header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-6 mb-6">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
                <h1 className="text-2xl font-bold text-text relative">Comparateur</h1>
                <p className="text-text-secondary text-sm mt-1 relative">Comparez deux joueurs côte à côte</p>
            </div>

            {/* Search inputs */}
            <div className="bg-card rounded-2xl border border-border p-5 mb-6 shadow-sm">
                <div className="grid md:grid-cols-2 gap-4">
                    {[
                        { label: 'Joueur 1', q: q1, setQ: setQ1, sugg: suggestions1, setSugg: setSuggestions1, sel: selected1, setSel: setSelected1, color: 'homme' },
                        { label: 'Joueur 2', q: q2, setQ: setQ2, sugg: suggestions2, setSugg: setSuggestions2, sel: selected2, setSel: setSelected2, color: 'femme' },
                    ].map(({ label, q, setQ, sugg, setSugg, sel, setSel, color }, idx) => (
                        <div key={idx} className="relative">
                            <div className="flex items-center gap-2 mb-2">
                                <div className={`w-6 h-6 rounded-full bg-${color}/20 text-${color} flex items-center justify-center text-xs font-bold`}>{idx + 1}</div>
                                <span className="text-sm font-medium text-text">{label}</span>
                                {sel && <span className="text-xs text-success ml-auto">✓ sélectionné</span>}
                            </div>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                                <input
                                    value={sel ? `${sel.prenom} ${sel.nom}` : q}
                                    onChange={e => { setQ(e.target.value); setSel(null); search(e.target.value, setSugg); }}
                                    placeholder="Rechercher un joueur..."
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                            </div>
                            {sugg.length > 0 && !sel && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-border rounded-xl shadow-xl max-h-48 overflow-y-auto">
                                    {sugg.map(s => (
                                        <div key={s.id} onClick={() => { setSel(s); setSugg([]); }}
                                            className="px-3 py-2.5 text-sm hover:bg-primary/5 cursor-pointer flex items-center justify-between border-b border-border/50 last:border-0 transition-colors">
                                            <span className="font-medium">{s.prenom} {s.nom}</span>
                                            <span className="text-xs text-text-secondary">#{s.rang} · {s.genre}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="mt-4 text-center">
                    <button
                        onClick={compare}
                        disabled={!selected1 || !selected2 || loading}
                        className="px-8 py-2.5 rounded-xl bg-primary text-white font-medium text-sm hover:bg-primary-dark disabled:opacity-40 transition-all duration-200 inline-flex items-center gap-2 hover:shadow-lg hover:shadow-primary/20"
                    >
                        <GitCompare className="w-4 h-4" /> Comparer
                    </button>
                </div>
            </div>

            {/* Skeleton loader */}
            {loading && (
                <div className="animate-pulse space-y-4">
                    <div className="bg-card rounded-2xl border border-border p-6 h-32" />
                    <div className="bg-card rounded-2xl border border-border p-6 h-48" />
                </div>
            )}

            {result && result.joueur1 && result.joueur2 && (
                <>
                    {/* VS Header */}
                    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden mb-4">
                        <div className="grid grid-cols-3">
                            <div className="p-5 text-center" style={{ background: `${c1}10` }}>
                                <div className="w-14 h-14 rounded-2xl mx-auto mb-2 flex items-center justify-center font-bold text-xl text-white shadow-lg"
                                    style={{ background: `linear-gradient(135deg, ${c1}, ${c1}cc)` }}>
                                    {result.joueur1.historique[0]?.rang || '?'}
                                </div>
                                <div className="font-bold text-text">{result.joueur1.joueur.prenom} {result.joueur1.joueur.nom}</div>
                                <div className="text-xs text-text-secondary mt-0.5">{result.joueur1.joueur.nationalite}</div>
                                <div className="text-xs font-medium mt-1 px-2 py-0.5 rounded-full inline-block border"
                                    style={{ color: c1, borderColor: `${c1}40`, background: `${c1}10` }}>
                                    {result.joueur1.historique[0]?.points?.toLocaleString('fr-FR')} pts
                                </div>
                            </div>
                            <div className="p-5 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/30 gap-2">
                                <span className="text-3xl font-bold text-text-secondary">VS</span>
                                <span className="text-xs text-text-secondary">duel de classement</span>
                            </div>
                            <div className="p-5 text-center" style={{ background: `${c2}10` }}>
                                <div className="w-14 h-14 rounded-2xl mx-auto mb-2 flex items-center justify-center font-bold text-xl text-white shadow-lg"
                                    style={{ background: `linear-gradient(135deg, ${c2}, ${c2}cc)` }}>
                                    {result.joueur2.historique[0]?.rang || '?'}
                                </div>
                                <div className="font-bold text-text">{result.joueur2.joueur.prenom} {result.joueur2.joueur.nom}</div>
                                <div className="text-xs text-text-secondary mt-0.5">{result.joueur2.joueur.nationalite}</div>
                                <div className="text-xs font-medium mt-1 px-2 py-0.5 rounded-full inline-block border"
                                    style={{ color: c2, borderColor: `${c2}40`, background: `${c2}10` }}>
                                    {result.joueur2.historique[0]?.points?.toLocaleString('fr-FR')} pts
                                </div>
                            </div>
                        </div>

                        {/* Stats rows */}
                        <div className="px-5 pb-2 divide-y divide-border/40">
                            {(() => {
                                const h1 = result.joueur1.historique[0] || {};
                                const h2 = result.joueur2.historique[0] || {};
                                return (
                                    <>
                                        <StatRow label="Rang" icon={Trophy} v1={h1.rang || '-'} v2={h2.rang || '-'} isBetter="lower" />
                                        <StatRow label="Points" icon={TrendingUp} v1={h1.points || 0} v2={h2.points || 0} isBetter="higher" />
                                        <StatRow label="Tournois" icon={Calendar} v1={h1.nb_tournois || 0} v2={h2.nb_tournois || 0} isBetter="higher" />
                                        <StatRow label="Âge" icon={Calendar} v1={h1.age || '-'} v2={h2.age || '-'} />
                                        <StatRow label="Ligue" icon={MapPin} v1={h1.ligue || '-'} v2={h2.ligue || '-'} />
                                        <StatRow label="Évolution" icon={TrendingUp} v1={h1.evolution || '='} v2={h2.evolution || '='} />
                                    </>
                                );
                            })()}
                        </div>
                    </div>

                    {/* Radar chart */}
                    {radarData.length > 0 && (
                        <div className="bg-card rounded-2xl border border-border shadow-sm p-5 mb-4">
                            <h3 className="font-semibold text-text mb-1 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-primary" />
                                Profil comparatif
                            </h3>
                            <p className="text-xs text-text-secondary mb-4">Scores normalisés (0-100) basés sur les données FFT : points, rang, tournois joués et évolution récente</p>
                            <ResponsiveContainer width="100%" height={300}>
                                <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                                    <PolarGrid stroke="#e2e8f0" strokeDasharray="0" />
                                    <PolarAngleAxis dataKey="axis" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} />
                                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} tickCount={4} />
                                    <Radar name={`${result.joueur1.joueur.prenom} ${result.joueur1.joueur.nom}`}
                                        dataKey="j1" stroke={c1} fill={c1} fillOpacity={0.2} strokeWidth={2.5} />
                                    <Radar name={`${result.joueur2.joueur.prenom} ${result.joueur2.joueur.nom}`}
                                        dataKey="j2" stroke={c2} fill={c2} fillOpacity={0.2} strokeWidth={2.5} />
                                    <Tooltip content={<CustomTooltip />} />
                                </RadarChart>
                            </ResponsiveContainer>
                            <div className="flex items-center justify-center gap-6 mt-2">
                                <div className="flex items-center gap-2 text-xs text-text-secondary">
                                    <div className="w-3 h-3 rounded-full" style={{ background: c1 }} />
                                    {result.joueur1.joueur.prenom} {result.joueur1.joueur.nom}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-text-secondary">
                                    <div className="w-3 h-3 rounded-full" style={{ background: c2 }} />
                                    {result.joueur2.joueur.prenom} {result.joueur2.joueur.nom}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Match Simulation */}
                    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 mb-4">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-semibold text-text flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-yellow-500" /> Match Simulation
                                </h3>
                                <p className="text-xs text-text-secondary mt-0.5">Prédiction basée sur les statistiques de classement</p>
                            </div>
                            {!showSim && (
                                <button
                                    onClick={() => setShowSim(true)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 hover:shadow-lg"
                                    style={{ background: VOLT, color: '#0F172A' }}
                                >
                                    Simuler <ChevronRight className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {showSim && sim && (
                            <div className="space-y-4">
                                {/* Win probability bar */}
                                <div>
                                    <div className="flex justify-between text-xs font-semibold mb-1.5">
                                        <span style={{ color: c1 }}>{sim.prob1}%</span>
                                        <span className="text-text-secondary">probabilité de victoire</span>
                                        <span style={{ color: c2 }}>{sim.prob2}%</span>
                                    </div>
                                    <div className="h-3 rounded-full overflow-hidden bg-slate-100 flex">
                                        <div className="h-full rounded-l-full transition-all duration-700"
                                            style={{ width: `${sim.prob1}%`, background: c1 }} />
                                        <div className="h-full rounded-r-full transition-all duration-700"
                                            style={{ width: `${sim.prob2}%`, background: c2 }} />
                                    </div>
                                    <div className="flex justify-between text-xs text-text-secondary mt-1">
                                        <span>{result.joueur1.joueur.prenom} {result.joueur1.joueur.nom}</span>
                                        <span>{result.joueur2.joueur.prenom} {result.joueur2.joueur.nom}</span>
                                    </div>
                                </div>

                                {/* Winner prediction */}
                                <div className="flex items-center justify-center gap-3 p-4 rounded-xl"
                                    style={{ background: `${sim.winnerIdx === 1 ? c1 : c2}12`, border: `1px solid ${sim.winnerIdx === 1 ? c1 : c2}30` }}>
                                    <Trophy className="w-5 h-5" style={{ color: sim.winnerIdx === 1 ? c1 : c2 }} />
                                    <div className="text-center">
                                        <div className="text-xs text-text-secondary mb-0.5">Vainqueur prédit</div>
                                        <div className="font-bold text-text">{sim.winner.prenom} {sim.winner.nom}</div>
                                        <div className="text-xs font-semibold mt-0.5"
                                            style={{ color: sim.winnerIdx === 1 ? c1 : c2 }}>
                                            {sim.winnerIdx === 1 ? sim.prob1 : sim.prob2}% de chances
                                        </div>
                                    </div>
                                </div>

                                <p className="text-xs text-text-secondary text-center italic">
                                    Simulation indicative basée sur le rang, les points, les tournois et l'évolution récente.
                                </p>

                                <button onClick={() => setShowSim(false)}
                                    className="w-full text-xs text-text-secondary hover:text-text transition-colors py-1">
                                    Masquer la simulation
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
