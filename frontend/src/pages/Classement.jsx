import { useState, useEffect, useRef } from 'react';
import { Users, User, Trophy, Calendar, FileDown, Loader2, Globe } from 'lucide-react';
import { getStats, getMois, getClassement, getClassementExport } from '../api';
import KPICard from '../components/KPICard';
import PlayerCard from '../components/PlayerCard';
import PdfWorker from '../workers/pdfExport.worker.js?worker';

export default function Classement() {
    const [stats, setStats] = useState(null);
    const [moisList, setMoisList] = useState([]);
    const [mois, setMois] = useState('');
    const [genre, setGenre] = useState('');
    const [data, setData] = useState(null);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(true);
    const [fipOnly, setFipOnly] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState('');
    const workerRef = useRef(null);

    useEffect(() => {
        Promise.all([getStats(), getMois()]).then(([s, m]) => {
            setStats(s);
            setMoisList(m);
            if (m.length > 0) setMois(m[0].mois);
        });
    }, []);

    useEffect(() => {
        if (!mois) return;
        setLoading(true);
        const params = { page, size: 50 };
        if (genre) params.genre = genre;
        if (fipOnly) params.fip_only = true;
        getClassement(mois, params).then(d => {
            setData(d);
            setLoading(false);
        });
    }, [mois, genre, page, fipOnly]);

    const formatMoisLabel = (m) => {
        if (!m) return '';
        const [y, mo] = m.split('-');
        const months = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        return `${months[parseInt(mo)]} ${y}`;
    };

    const exportPDF = async () => {
        setExporting(true);
        setExportProgress('Chargement des donnees...');
        try {
            const players = await getClassementExport(mois, genre || undefined);
            const moisLabel = formatMoisLabel(mois);
            const exportDate = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

            // Terminate any previous worker
            if (workerRef.current) workerRef.current.terminate();

            const worker = new PdfWorker();
            workerRef.current = worker;

            worker.postMessage({ players, genre, mois, moisLabel, exportDate });

            worker.onmessage = (e) => {
                const { type, buffer, message } = e.data;
                if (type === 'progress') {
                    setExportProgress(message);
                } else if (type === 'done') {
                    // Save the PDF from the ArrayBuffer
                    const blob = new Blob([buffer], { type: 'application/pdf' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    const genreSuffix = genre ? `_${genre}` : '';
                    a.download = `classement_padel_${mois}${genreSuffix}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    setExporting(false);
                    setExportProgress('');
                    worker.terminate();
                    workerRef.current = null;
                } else if (type === 'error') {
                    console.error('PDF worker error:', message);
                    alert("Erreur lors de l'export PDF. Veuillez reessayer.");
                    setExporting(false);
                    setExportProgress('');
                    worker.terminate();
                    workerRef.current = null;
                }
            };

            worker.onerror = (err) => {
                console.error('PDF worker crash:', err);
                alert("Erreur lors de l'export PDF. Veuillez reessayer.");
                setExporting(false);
                setExportProgress('');
                workerRef.current = null;
            };
        } catch (err) {
            console.error('PDF export error:', err);
            alert("Erreur lors de l'export PDF. Veuillez reessayer.");
            setExporting(false);
            setExportProgress('');
        }
    };

    return (
        <div>
            {/* Hero header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-6 mb-6">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
                <h1 className="text-2xl font-bold text-text relative">Classement Padel France</h1>
                <p className="text-text-secondary text-sm mt-1 relative">Classement officiel FFT des joueurs de padel</p>
            </div>

            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <KPICard icon={Users} title="Total joueurs" value={stats.total_joueurs} color="primary" />
                    <KPICard icon={User} title="Hommes" value={stats.hommes} color="homme" />
                    <KPICard icon={User} title="Femmes" value={stats.femmes} color="femme" />
                    <KPICard icon={Calendar} title="Mois de donnees" value={stats.mois_disponibles} color="warning" />
                </div>
            )}

            <div className="bg-card rounded-xl border border-border p-4 mb-6">
                <div className="flex flex-wrap items-center gap-3">
                    <select
                        value={mois}
                        onChange={e => { setMois(e.target.value); setPage(0); }}
                        className="px-3 py-2 rounded-lg border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                        {moisList.map(m => (
                            <option key={m.mois} value={m.mois}>{formatMoisLabel(m.mois)}</option>
                        ))}
                    </select>

                    <div className="flex rounded-lg border border-border overflow-hidden">
                        {[
                            { val: '', label: 'Tous' },
                            { val: 'H', label: 'Hommes' },
                            { val: 'F', label: 'Femmes' },
                        ].map(g => (
                            <button
                                key={g.val}
                                onClick={() => { setGenre(g.val); setPage(0); }}
                                className={`px-4 py-2 text-sm font-medium transition-colors ${genre === g.val
                                    ? 'bg-primary text-white'
                                    : 'bg-white text-text-secondary hover:bg-gray-50'
                                    }`}
                            >
                                {g.label}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => { setFipOnly(f => !f); setPage(0); }}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${fipOnly
                            ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                            : 'bg-white text-text-secondary border-border hover:bg-gray-50'
                        }`}
                    >
                        <Globe size={15} />
                        FIP
                    </button>

                    <button
                        onClick={exportPDF}
                        disabled={exporting || !mois}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-primary to-primary-dark text-white hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {exporting ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                {exportProgress || 'Export en cours...'}
                            </>
                        ) : (
                            <>
                                <FileDown size={16} />
                                Exporter PDF
                            </>
                        )}
                    </button>

                    {data && (
                        <span className="text-sm text-text-secondary ml-auto">
                            {data.total.toLocaleString('fr-FR')} joueurs
                        </span>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="bg-card rounded-xl border border-border p-4 animate-pulse">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                                    <div className="h-3 bg-gray-200 rounded w-1/5" />
                                </div>
                                <div className="h-5 bg-gray-200 rounded w-16" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : data ? (
                <>
                    <div className="space-y-2">
                        {data.joueurs.map((j, i) => (
                            <PlayerCard key={j.id} joueur={j} rank={page * 50 + i + 1} />
                        ))}
                    </div>

                    {data.total > 50 && (
                        <div className="flex items-center justify-center gap-2 mt-6">
                            <button
                                onClick={() => setPage(p => Math.max(0, p - 1))}
                                disabled={page === 0}
                                className="px-4 py-2 rounded-lg border border-border text-sm font-medium bg-white disabled:opacity-40 hover:bg-gray-50 transition-colors"
                            >
                                Precedent
                            </button>
                            <span className="text-sm text-text-secondary px-3">
                                Page {page + 1} / {Math.ceil(data.total / 50)}
                            </span>
                            <button
                                onClick={() => setPage(p => p + 1)}
                                disabled={(page + 1) * 50 >= data.total}
                                className="px-4 py-2 rounded-lg border border-border text-sm font-medium bg-white disabled:opacity-40 hover:bg-gray-50 transition-colors"
                            >
                                Suivant
                            </button>
                        </div>
                    )}
                </>
            ) : null}
        </div>
    );
}
