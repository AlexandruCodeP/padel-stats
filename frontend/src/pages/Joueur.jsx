import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, MapPin, Flag, Calendar, TrendingUp, Building2, Shield, Award } from 'lucide-react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { getJoueur } from '../api';
import KPICard from '../components/KPICard';
import EvolutionChart from '../components/EvolutionChart';

export default function Joueur() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getJoueur(id).then(d => {
            setData(d);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [id]);

    if (loading) return (
        <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}
            </div>
            <div className="h-72 bg-gray-200 rounded-xl" />
        </div>
    );

    if (!data) return (
        <div className="text-center py-16">
            <p className="text-text-secondary text-lg">Joueur non trouvé</p>
            <button onClick={() => navigate(-1)} className="mt-4 text-primary font-medium hover:underline">Retour</button>
        </div>
    );

    const { joueur, historique } = data;
    const latest = historique[0] || {};
    const chartData = [...historique].reverse();
    const isAssimile = latest.est_assimile;

    // Radar chart data — normalize values to 0-100 for radar visualization
    const maxRank = 135000;
    const radarData = [
        { stat: 'Rang', value: Math.max(0, 100 - ((latest.rang || maxRank) / maxRank) * 100), fullMark: 100 },
        { stat: 'Points', value: Math.min(100, ((latest.points || 0) / 10000) * 100), fullMark: 100 },
        { stat: 'Tournois', value: Math.min(100, ((latest.nb_tournois || 0) / 20) * 100), fullMark: 100 },
        { stat: 'Stabilité', value: latest.evolution === '=' || latest.evolution === '0' ? 80 : latest.evolution?.startsWith('+') ? 60 : 40, fullMark: 100 },
        { stat: 'Best Rang', value: Math.max(0, 100 - ((latest.meilleur_classement || latest.rang || maxRank) / maxRank) * 100), fullMark: 100 },
    ];

    const flagEmoji = (nat) => nat || '';

    return (
        <div>
            <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-text-secondary hover:text-primary text-sm font-medium mb-4 transition-colors group">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Retour
            </button>

            {/* Player Hero Card */}
            <div className={`relative overflow-hidden rounded-2xl border p-6 mb-6 shadow-sm ${joueur.genre === 'H'
                ? 'bg-gradient-to-br from-sky-50 to-sky-100/50 border-sky-200/50'
                : 'bg-gradient-to-br from-pink-50 to-pink-100/50 border-pink-200/50'
                }`}>
                <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full blur-3xl opacity-20" style={{ background: joueur.genre === 'H' ? '#0ea5e9' : '#ec4899' }} />
                <div className="flex items-start gap-5 relative">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-xl text-white shrink-0 shadow-lg ${joueur.genre === 'H' ? 'bg-gradient-to-br from-sky-500 to-sky-600' : 'bg-gradient-to-br from-pink-400 to-pink-500'
                        }`}>
                        {latest.rang || '?'}
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-text">{joueur.prenom} {joueur.nom}</h1>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-text-secondary">
                            {joueur.genre && (
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${joueur.genre === 'H' ? 'bg-sky-100 text-sky-700' : 'bg-pink-100 text-pink-700'
                                    }`}>
                                    {joueur.genre === 'H' ? 'Homme' : 'Femme'}
                                </span>
                            )}
                            {isAssimile && (
                                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                                    Assimilé
                                </span>
                            )}
                            {joueur.nationalite && <span className="flex items-center gap-1">{flagEmoji(joueur.nationalite)} {joueur.nationalite}</span>}
                            {latest.ligue && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {latest.ligue}</span>}
                            {latest.age && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {latest.age} ans</span>}
                        </div>
                    </div>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <KPICard icon={Trophy} title="Rang" value={`#${latest.rang || '-'}`} color="primary" />
                <KPICard icon={TrendingUp} title="Points" value={latest.points ? latest.points.toLocaleString('fr-FR') : isAssimile ? 'Assimilé' : '-'} color="success" />
                <KPICard icon={Calendar} title="Tournois" value={latest.nb_tournois || 0} color="warning" />
                <KPICard icon={Award} title="Meilleur rang" value={`#${latest.meilleur_classement || latest.rang || '-'}`} color="homme" />
                <KPICard icon={TrendingUp} title="Évolution" value={latest.evolution || '='} color={
                    latest.evolution?.startsWith('+') ? 'success' : latest.evolution?.startsWith('-') ? 'danger' : 'primary'
                } />
            </div>

            {/* Charts row: radar + evolution */}
            <div className="grid md:grid-cols-3 gap-6 mb-6">
                {/* Radar chart */}
                <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
                    <h3 className="font-semibold text-text mb-2">Profil joueur</h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <RadarChart data={radarData}>
                            <PolarGrid stroke="#e2e8f0" />
                            <PolarAngleAxis dataKey="stat" tick={{ fontSize: 11 }} />
                            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                            <Radar name="Profil" dataKey="value" stroke={joueur.genre === 'H' ? '#0ea5e9' : '#ec4899'}
                                fill={joueur.genre === 'H' ? '#0ea5e9' : '#ec4899'} fillOpacity={0.3} strokeWidth={2} />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>

                {/* Evolution charts */}
                {chartData.length > 1 ? (
                    <>
                        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
                            <h3 className="font-semibold text-text mb-4">Évolution du rang</h3>
                            <EvolutionChart
                                data={chartData}
                                lines={[{ key: 'rang', name: 'Rang', color: '#0ea5e9' }]}
                                invertY={true}
                            />
                        </div>
                        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
                            <h3 className="font-semibold text-text mb-4">Évolution des points</h3>
                            <EvolutionChart
                                data={chartData}
                                lines={[{ key: 'points', name: 'Points', color: '#10b981' }]}
                            />
                        </div>
                    </>
                ) : (
                    <div className="md:col-span-2 bg-card rounded-xl border border-border p-8 shadow-sm flex items-center justify-center text-text-secondary text-sm">
                        Les graphiques d'évolution seront disponibles après 2+ mois de données.
                    </div>
                )}
            </div>

            {/* History table */}
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="p-5 border-b border-border">
                    <h3 className="font-semibold text-text">Historique des classements</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="px-4 py-3 text-left font-medium text-text-secondary">Mois</th>
                                <th className="px-4 py-3 text-right font-medium text-text-secondary">Rang</th>
                                <th className="px-4 py-3 text-right font-medium text-text-secondary">Points</th>
                                <th className="px-4 py-3 text-right font-medium text-text-secondary">Évolution</th>
                                <th className="px-4 py-3 text-right font-medium text-text-secondary">Tournois</th>
                                <th className="px-4 py-3 text-left font-medium text-text-secondary">Ligue</th>
                            </tr>
                        </thead>
                        <tbody>
                            {historique.map((h, i) => (
                                <tr key={i} className="border-t border-border hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 font-medium">{h.mois}</td>
                                    <td className="px-4 py-3 text-right font-semibold">{h.rang}</td>
                                    <td className="px-4 py-3 text-right">{h.points ? h.points.toLocaleString('fr-FR') : h.est_assimile ? '—' : '0'}</td>
                                    <td className={`px-4 py-3 text-right font-semibold ${h.evolution?.startsWith('+') ? 'text-success' : h.evolution?.startsWith('-') ? 'text-danger' : 'text-text-secondary'
                                        }`}>{h.evolution || '='}</td>
                                    <td className="px-4 py-3 text-right">{h.nb_tournois}</td>
                                    <td className="px-4 py-3">{h.ligue}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
