import { useState, useEffect } from 'react';
import { Users, User, MapPin } from 'lucide-react';
import { getLigues, getStats } from '../api';
import KPICard from '../components/KPICard';
import FranceMap from '../components/FranceMap';

export default function LiguesPage() {
    const [ligues, setLigues] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedRegion, setSelectedRegion] = useState(null);

    useEffect(() => {
        Promise.all([getLigues(), getStats()]).then(([l, s]) => {
            setLigues(l);
            setStats(s);
            setLoading(false);
        });
    }, []);

    const maxTotal = Math.max(...ligues.map(l => l.total), 1);

    const handleRegionClick = (region, data) => {
        setSelectedRegion(prev => prev === region.id ? null : region.id);
    };

    // Highlight selected region in table
    const isSelected = (ligue) => selectedRegion === ligue;

    return (
        <div>
            {/* Hero header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-6 mb-6">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
                <h1 className="text-2xl font-bold text-text relative">🗺️ Ligues régionales</h1>
                <p className="text-text-secondary text-sm mt-1 relative">Répartition des joueurs par ligue — carte interactive</p>
            </div>

            {stats && (
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <KPICard icon={Users} title="Total" value={stats.total_joueurs} color="primary" />
                    <KPICard icon={User} title="Hommes" value={stats.hommes} color="homme" />
                    <KPICard icon={User} title="Femmes" value={stats.femmes} color="femme" />
                </div>
            )}

            {/* Map + Legend side by side */}
            {!loading && ligues.length > 0 && (
                <div className="grid lg:grid-cols-5 gap-6 mb-6">
                    {/* Interactive map */}
                    <div className="lg:col-span-3 bg-card rounded-xl border border-border p-5 shadow-sm">
                        <h3 className="font-semibold text-text mb-3 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-primary" /> Carte de France
                        </h3>
                        <FranceMap
                            ligues={ligues}
                            onRegionClick={handleRegionClick}
                        />
                        <div className="flex items-center gap-2 mt-3 text-xs text-text-secondary justify-center">
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-sm" style={{ background: 'rgb(224,242,254)' }} />
                                <span>Moins de joueurs</span>
                            </div>
                            <div className="w-12 h-2 rounded-full" style={{ background: 'linear-gradient(to right, rgb(224,242,254), rgb(14,165,233))' }} />
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-sm" style={{ background: 'rgb(14,165,233)' }} />
                                <span>Plus de joueurs</span>
                            </div>
                        </div>
                    </div>

                    {/* Top regions ranking */}
                    <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5 shadow-sm">
                        <h3 className="font-semibold text-text mb-3">🏅 Classement des ligues</h3>
                        <div className="space-y-2">
                            {ligues.slice(0, 13).map((l, i) => {
                                const pct = (l.total / maxTotal) * 100;
                                const femPct = ((l.femmes / l.total) * 100).toFixed(1);
                                const selected = isSelected(l.ligue);
                                return (
                                    <div
                                        key={i}
                                        onClick={() => setSelectedRegion(prev => prev === l.ligue ? null : l.ligue)}
                                        className={`relative p-3 rounded-lg cursor-pointer transition-all duration-200 group ${selected
                                            ? 'bg-primary/10 border border-primary/30 shadow-sm'
                                            : 'hover:bg-gray-50 border border-transparent'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${i < 3 ? 'bg-primary text-white' : 'bg-gray-100 text-text-secondary'}`}>
                                                    {i + 1}
                                                </span>
                                                <span className="font-semibold text-sm text-text">{l.ligue}</span>
                                            </div>
                                            <span className="font-bold text-sm text-text">{l.total.toLocaleString('fr-FR')}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden flex">
                                                <div
                                                    className="h-full bg-homme/60 transition-all duration-700"
                                                    style={{ width: `${((l.hommes / maxTotal) * 100)}%` }}
                                                />
                                                <div
                                                    className="h-full bg-femme/60 transition-all duration-700"
                                                    style={{ width: `${((l.femmes / maxTotal) * 100)}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-femme font-medium w-10 text-right">{femPct}%♀</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Full data table */}
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="p-5 border-b border-border">
                    <h3 className="font-semibold text-text">📋 Données complètes</h3>
                </div>
                {loading ? (
                    <div className="p-6 space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="animate-pulse">
                                <div className="h-5 bg-gray-200 rounded w-full mb-2" />
                                <div className="h-3 bg-gray-200 rounded w-2/3" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="px-4 py-3 text-left font-medium text-text-secondary">#</th>
                                    <th className="px-4 py-3 text-left font-medium text-text-secondary">Ligue</th>
                                    <th className="px-4 py-3 text-right font-medium text-text-secondary">Total</th>
                                    <th className="px-4 py-3 text-right font-medium text-text-secondary">Hommes</th>
                                    <th className="px-4 py-3 text-right font-medium text-text-secondary">Femmes</th>
                                    <th className="px-4 py-3 text-left font-medium text-text-secondary w-1/3">Proportion</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ligues.map((l, i) => (
                                    <tr key={i} className={`border-t border-border transition-colors ${isSelected(l.ligue) ? 'bg-primary/5' : 'hover:bg-gray-50'}`}>
                                        <td className="px-4 py-3 font-bold text-text-secondary">{i + 1}</td>
                                        <td className="px-4 py-3 font-semibold">{l.ligue}</td>
                                        <td className="px-4 py-3 text-right font-medium">{l.total.toLocaleString('fr-FR')}</td>
                                        <td className="px-4 py-3 text-right text-homme">{l.hommes.toLocaleString('fr-FR')}</td>
                                        <td className="px-4 py-3 text-right text-femme">{l.femmes.toLocaleString('fr-FR')}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden flex">
                                                    <div
                                                        className="h-full bg-homme/70 transition-all duration-500"
                                                        style={{ width: `${(l.hommes / maxTotal) * 100}%` }}
                                                    />
                                                    <div
                                                        className="h-full bg-femme/70 transition-all duration-500"
                                                        style={{ width: `${(l.femmes / maxTotal) * 100}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-text-secondary w-10 text-right">
                                                    {stats ? `${((l.total / stats.total_joueurs) * 100).toFixed(1)}%` : ''}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
