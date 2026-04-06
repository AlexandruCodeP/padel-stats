import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getMois, getAnalyticsAge, getAnalyticsProfil, getAnalyticsEvolutionAgeMoyen } from '../api';
import { Clock, Users, TrendingUp } from 'lucide-react';

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

export default function Age() {
    const [moisList, setMoisList] = useState([]);
    const [mois, setMois] = useState('');
    const [ages, setAges] = useState([]);
    const [agesH, setAgesH] = useState([]);
    const [agesF, setAgesF] = useState([]);
    const [profilAll, setProfilAll] = useState(null);
    const [profil10, setProfil10] = useState(null);
    const [profil100, setProfil100] = useState(null);
    const [profil1000, setProfil1000] = useState(null);
    const [profilAllH, setProfilAllH] = useState(null);
    const [profilAllF, setProfilAllF] = useState(null);
    const [profil100H, setProfil100H] = useState(null);
    const [profil100F, setProfil100F] = useState(null);
    const [evoAge, setEvoAge] = useState([]);
    const [visibleLines, setVisibleLines] = useState(new Set(['avg_age', 'avg_age_h', 'avg_age_f']));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getMois().then(m => { setMoisList(m); if (m.length) setMois(m[0].mois); });
        getAnalyticsEvolutionAgeMoyen().then(setEvoAge).catch(() => {});
    }, []);

    useEffect(() => {
        if (!mois) return;
        setLoading(true);
        Promise.all([
            getAnalyticsAge(mois),
            getAnalyticsAge(mois, 'H'),
            getAnalyticsAge(mois, 'F'),
            getAnalyticsProfil(mois, 999999),
            getAnalyticsProfil(mois, 10),
            getAnalyticsProfil(mois, 100),
            getAnalyticsProfil(mois, 1000),
            getAnalyticsProfil(mois, 999999, 'H'),
            getAnalyticsProfil(mois, 999999, 'F'),
            getAnalyticsProfil(mois, 100, 'H'),
            getAnalyticsProfil(mois, 100, 'F'),
        ]).then(([a, aH, aF, pAll, p10, p100, p1000, pAllH, pAllF, p100H, p100F]) => {
            setAges(a); setAgesH(aH); setAgesF(aF);
            setProfilAll(pAll); setProfil10(p10); setProfil100(p100); setProfil1000(p1000);
            setProfilAllH(pAllH); setProfilAllF(pAllF);
            setProfil100H(p100H); setProfil100F(p100F);
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-200 dark:bg-gray-700 rounded-2xl" />)}</div>
            <div className="grid md:grid-cols-2 gap-6">{[...Array(2)].map((_, i) => <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-2xl" />)}</div>
        </div>
    );

    // Merge H/F age data for side-by-side chart
    const mergedAgeHF = ages.map((a, i) => ({
        tranche: a.tranche,
        tous: a.avg_age,
        hommes: agesH[i]?.avg_age || null,
        femmes: agesF[i]?.avg_age || null,
    }));

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-text">Age</h1>
                    <p className="text-text-secondary text-sm mt-1">Analyse de l'age moyen selon le niveau, le sexe et les tendances</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <select value={mois} onChange={e => setMois(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-border text-sm bg-card text-text focus:outline-none focus:ring-2 focus:ring-primary/20">
                        {moisList.map(m => <option key={m.mois} value={m.mois}>{formatMoisLabel(m.mois)}</option>)}
                    </select>
                </div>
            </div>

            {/* KPI Row — ages moyens par niveau */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
                {[
                    { label: 'Tous les classes', value: profilAll?.avg_age, total: profilAll?.total, icon: Users },
                    { label: 'Top 10', value: profil10?.avg_age, total: profil10?.total },
                    { label: 'Top 100', value: profil100?.avg_age, total: profil100?.total },
                    { label: 'Top 1 000', value: profil1000?.avg_age, total: profil1000?.total },
                ].map(({ label, value, total, icon: Icon }) => (
                    <div key={label} className="bg-card rounded-2xl border border-border p-3 sm:p-4 shadow-sm text-center min-w-0">
                        <div className="text-xs text-text-secondary mb-1 flex items-center justify-center gap-1">
                            {Icon && <Icon className="w-3.5 h-3.5" />}
                            <span className="truncate">{label}</span>
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-text font-data">{value ?? '-'} <span className="text-xs sm:text-sm font-normal text-text-secondary">ans</span></div>
                        <div className="text-xs text-text-secondary mt-0.5">{total?.toLocaleString('fr-FR')} joueurs</div>
                    </div>
                ))}
            </div>

            {/* Comparaison H/F */}
            <div className="bg-gradient-to-br from-homme/5 via-transparent to-femme/5 rounded-2xl border border-border p-5 shadow-sm mb-6">
                <h3 className="font-semibold text-text mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" /> Comparaison Hommes / Femmes
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    {[
                        { label: 'Age moy. H (tous)', value: profilAllH?.avg_age, color: 'text-homme' },
                        { label: 'Age moy. F (tous)', value: profilAllF?.avg_age, color: 'text-femme' },
                        { label: 'Age moy. H (Top 100)', value: profil100H?.avg_age, color: 'text-homme' },
                        { label: 'Age moy. F (Top 100)', value: profil100F?.avg_age, color: 'text-femme' },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="bg-card/80 rounded-xl p-3 sm:p-4 text-center min-w-0">
                            <div className="text-xs text-text-secondary mb-1 truncate">{label}</div>
                            <div className={`text-xl sm:text-2xl font-bold font-data ${color}`}>{value ?? '-'} <span className="text-xs sm:text-sm font-normal text-text-secondary">ans</span></div>
                            {profilAllH?.avg_age && profilAllF?.avg_age && label.includes('tous') && label.includes('F') && (
                                <div className="text-xs text-text-secondary mt-1">
                                    Ecart: {Math.abs(profilAllH.avg_age - profilAllF.avg_age).toFixed(1)} ans
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Évolution de l'âge moyen dans le temps */}
            {evoAge.length > 1 && (
                <div className="bg-card rounded-2xl border border-border p-5 shadow-sm mb-6">
                    <h3 className="font-semibold text-text mb-1 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-primary" /> Évolution de l'âge moyen dans le temps
                    </h3>
                    <p className="text-xs text-text-secondary mb-3">Cliquez sur une série pour l'afficher ou la masquer</p>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                        {[
                            { key: 'avg_age', label: 'Tous', color: '#8b5cf6' },
                            { key: 'avg_age_h', label: 'Hommes', color: HOMME },
                            { key: 'avg_age_f', label: 'Femmes', color: FEMME },
                        ].map(({ key, label, color }) => {
                            const active = visibleLines.has(key);
                            return (
                                <button
                                    key={key}
                                    onClick={() => setVisibleLines(prev => {
                                        const next = new Set(prev);
                                        next.has(key) ? next.delete(key) : next.add(key);
                                        return next;
                                    })}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${active ? 'text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-text-secondary/50 border-border'}`}
                                    style={active ? { backgroundColor: color, borderColor: color } : {}}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                    <ResponsiveContainer width="100%" height={350}>
                        <LineChart data={evoAge}>
                            <XAxis dataKey="mois" tickFormatter={formatMoisLabel} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} unit=" ans" />
                            <Tooltip
                                content={({ active, payload, label }) => {
                                    if (!active || !payload?.length) return null;
                                    return (
                                        <div className="bg-slate-900 text-white text-xs rounded-xl px-3 py-2 shadow-xl">
                                            <p className="font-semibold mb-1">{formatMoisLabel(label)}</p>
                                            {payload.map((p, i) => (
                                                <p key={i} style={{ color: p.color }}>
                                                    {p.name} : {typeof p.value === 'number' ? `${p.value} ans` : p.value}
                                                </p>
                                            ))}
                                        </div>
                                    );
                                }}
                            />
                            {visibleLines.has('avg_age') && <Line type="monotone" dataKey="avg_age" name="Tous" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />}
                            {visibleLines.has('avg_age_h') && <Line type="monotone" dataKey="avg_age_h" name="Hommes" stroke={HOMME} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />}
                            {visibleLines.has('avg_age_f') && <Line type="monotone" dataKey="avg_age_f" name="Femmes" stroke={FEMME} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            <div className="grid md:grid-cols-2 gap-6 mb-6">
                {/* Age moyen par niveau — tous */}
                <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                    <h3 className="font-semibold text-text mb-1">Age moyen par niveau</h3>
                    <p className="text-xs text-text-secondary mb-4">Tous genres confondus</p>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={ages}>
                            <XAxis dataKey="tranche" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} domain={[0, 50]} unit=" ans" axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} formatter={(v) => `${v} ans`} />
                            <Bar dataKey="avg_age" fill="#8b5cf6" radius={[8, 8, 0, 0]} name="Age moyen" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Age H vs F par niveau */}
                <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                    <h3 className="font-semibold text-text mb-1">Comparaison H/F par niveau</h3>
                    <p className="text-xs text-text-secondary mb-4">Age moyen hommes vs femmes par tranche</p>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={mergedAgeHF}>
                            <XAxis dataKey="tranche" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} domain={[0, 50]} unit=" ans" axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} formatter={(v) => `${v} ans`} />
                            <Legend />
                            <Bar dataKey="hommes" fill={HOMME} radius={[8, 8, 0, 0]} name="Hommes" />
                            <Bar dataKey="femmes" fill={FEMME} radius={[8, 8, 0, 0]} name="Femmes" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Tableau recap */}
            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                <h3 className="font-semibold text-text mb-4">Synthese par niveau</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-text-secondary border-b border-border">
                                <th className="text-left py-2 px-3">Niveau</th>
                                <th className="text-right py-2 px-3">Age moyen</th>
                                <th className="text-right py-2 px-3">Hommes</th>
                                <th className="text-right py-2 px-3">Femmes</th>
                                <th className="text-right py-2 px-3">Ecart H/F</th>
                            </tr>
                        </thead>
                        <tbody>
                            {mergedAgeHF.map((row) => (
                                <tr key={row.tranche} className="border-b border-border/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <td className="py-2.5 px-3 font-medium text-text">{row.tranche}</td>
                                    <td className="py-2.5 px-3 text-right font-mono text-text">{row.tous ?? '-'} ans</td>
                                    <td className="py-2.5 px-3 text-right font-mono text-homme">{row.hommes ?? '-'} ans</td>
                                    <td className="py-2.5 px-3 text-right font-mono text-femme">{row.femmes ?? '-'} ans</td>
                                    <td className="py-2.5 px-3 text-right font-mono text-text-secondary">
                                        {row.hommes && row.femmes ? `${Math.abs(row.hommes - row.femmes).toFixed(1)} ans` : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}
