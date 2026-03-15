import { useState, useEffect } from 'react';
import { Users, User, Trophy, Calendar, FileDown, Loader2 } from 'lucide-react';
import { getStats, getMois, getClassement, getClassementExport } from '../api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import KPICard from '../components/KPICard';
import PlayerCard from '../components/PlayerCard';

export default function Classement() {
    const [stats, setStats] = useState(null);
    const [moisList, setMoisList] = useState([]);
    const [mois, setMois] = useState('');
    const [genre, setGenre] = useState('');
    const [data, setData] = useState(null);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

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
        getClassement(mois, params).then(d => {
            setData(d);
            setLoading(false);
        });
    }, [mois, genre, page]);

    const formatMoisLabel = (m) => {
        if (!m) return '';
        const [y, mo] = m.split('-');
        const months = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        return `${months[parseInt(mo)]} ${y}`;
    };

    const exportPDF = async () => {
        setExporting(true);
        try {
            const players = await getClassementExport(mois, genre || undefined);

            const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const W    = doc.internal.pageSize.getWidth();   // 210 mm
            const H    = doc.internal.pageSize.getHeight();  // 297 mm
            const M    = 20; // margins

            // ── Design tokens ──────────────────────────────────────
            const NAVY     = [15,  23,  42];   // #0F172A
            const VOLT     = [204, 255, 0];    // #CCFF00
            const CORAL    = [253, 164, 175];  // #FDA4AF
            const PINK_BG  = [255, 241, 242];  // #FFF1F2
            const SLATE3   = [203, 213, 225];  // slate-300
            const SLATE4   = [148, 163, 184];  // slate-400
            const SLATE8   = [30,  41,  59];   // slate-800
            const SLATE9   = [15,  23,  42];   // slate-950
            const ROSE8    = [159, 18,  57];   // rose-800
            const ROSE9    = [136, 19,  55];   // rose-900

            const genreLabel = genre === 'H' ? 'Hommes' : genre === 'F' ? 'Femmes' : 'Tous';
            const moisLabel  = formatMoisLabel(mois);
            const exportDate = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
            const HDR_H      = 36; // header height (page 1)
            const MINI_H     = 13; // mini-header height (pages 2+)

            // ════════════════════════════════════════════════════════
            // PAGE 1 — FULL HEADER
            // ════════════════════════════════════════════════════════

            // Navy background
            doc.setFillColor(...NAVY);
            doc.rect(0, 0, W, HDR_H, 'F');

            // Volt accent strip at bottom of header
            doc.setFillColor(...VOLT);
            doc.rect(0, HDR_H - 1.5, W, 1.5, 'F');

            // Logo — blue rounded rect + "PS" in volt
            doc.setFillColor(0, 71, 171); // #0047AB
            doc.rect(M, 8, 12, 12, 'F');
            doc.setTextColor(...VOLT);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text('PS', M + 6, 16.5, { align: 'center' });

            // Title
            doc.setTextColor(...VOLT);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('CLASSEMENT OFFICIEL FFT', M + 16, 15);

            // Subtitle
            doc.setTextColor(...SLATE3);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`${moisLabel} — ${genreLabel}`, M + 16, 21.5);

            // Stats band
            doc.setTextColor(...SLATE4);
            doc.setFontSize(7.5);
            // toLocaleString('fr-FR') produces narrow no-break spaces (U+202F) which
            // are outside Latin-1 and corrupt in jsPDF built-in fonts → use plain string
            const totalStr = players.length.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
            doc.text(
                `Total : ${totalStr} joueurs  -  Exporte le ${exportDate}`,
                M + 16, 28
            );

            // ── Legend (between header and table, right-aligned) ──
            const LEG_Y = HDR_H + 3;
            const LEG_W = 70;
            const LEG_H = 7;
            doc.setFillColor(...PINK_BG);
            doc.rect(W - M - LEG_W, LEG_Y, LEG_W, LEG_H, 'F');
            doc.setFillColor(...CORAL);
            doc.rect(W - M - LEG_W, LEG_Y, 2, LEG_H, 'F');
            doc.setTextColor(...ROSE9);
            doc.setFontSize(6.5);
            doc.setFont('helvetica', 'italic');
            // Note: only Latin-1 chars (U+0000-U+00FF) are safe in built-in jsPDF fonts
            doc.text('(A) Joueur avec classement assimile', W - M - LEG_W + 5, LEG_Y + 4.7);

            // ════════════════════════════════════════════════════════
            // TABLE
            // ════════════════════════════════════════════════════════
            const tableData = players.map(p => {
                // ── Name: no Unicode symbols (jsPDF built-in fonts = Latin-1 only) ──
                const rawName = p.est_anonyme
                    ? 'Joueur anonyme'
                    : `${p.nom || ''} ${p.prenom || ''}`.trim();
                // Assimile indicator via styling only (coral border + pink bg)
                const name = rawName;

                // ── Evolution: parse as number to add correct +/- sign ──
                // p.evolution may be a number OR a string like "2", "-1", "="
                let evol = '=';
                if (p.evolution != null) {
                    const num = parseFloat(String(p.evolution).replace(',', '.'));
                    if (!isNaN(num)) {
                        evol = num > 0 ? `+${num}` : num === 0 ? '=' : String(num);
                    } else {
                        // Already a label like "NC", "="  — strip any non-Latin-1 just in case
                        evol = String(p.evolution).replace(/[^\x00-\xFF]/g, '?');
                    }
                }

                // ── Points: String() avoids toLocaleString non-breaking spaces ──
                const pts = p.points != null ? String(p.points) : '-';

                return [
                    p.rang != null ? String(p.rang) : '-',
                    name,
                    p.est_anonyme ? '-' : (p.nationalite || '-'),
                    p.ligue || '-',
                    pts,
                    evol,
                    p.nb_tournois != null ? String(p.nb_tournois) : '-',
                ];
            });

            autoTable(doc, {
                startY: HDR_H + LEG_H + 6,   // below legend
                head: [['#', 'Joueur', 'Nat.', 'Ligue', 'Points', 'Évol.', 'Tournois']],
                body: tableData,

                styles: {
                    fontSize: 7,
                    cellPadding: { top: 2.2, right: 2, bottom: 2.2, left: 2.5 },
                    lineColor: [226, 232, 240],
                    lineWidth: 0.15,
                    textColor: SLATE8,
                    overflow: 'ellipsize',
                },
                headStyles: {
                    fillColor: [248, 250, 252],   // #F8FAFC
                    textColor: SLATE9,
                    fontStyle: 'bold',
                    fontSize: 7.5,
                    lineWidth: 0.15,
                    lineColor: [226, 232, 240],
                },
                alternateRowStyles: {
                    fillColor: [248, 250, 252],   // zebra stripe
                },
                columnStyles: {
                    // col 0 : 16mm pour loger jusqu'à 6 chiffres (ex: 149 980) en Courier 7pt
                    0: { halign: 'center', cellWidth: 16,   font: 'courier' },
                    1: { cellWidth: 49 },
                    2: { halign: 'center', cellWidth: 11 },
                    3: { cellWidth: 34 },
                    4: { halign: 'right',  cellWidth: 19,   font: 'courier' },
                    5: { halign: 'center', cellWidth: 15,   font: 'courier' },
                    6: { halign: 'center', cellWidth: 15,   font: 'courier' },
                },

                // ── Assimilé row styling ──
                didParseCell: (hookData) => {
                    if (hookData.section !== 'body') return;
                    const player = players[hookData.row.index];
                    if (player?.est_assimile) {
                        hookData.cell.styles.fillColor = PINK_BG;
                        hookData.cell.styles.textColor = ROSE8;
                        if (hookData.column.index === 1) {
                            hookData.cell.styles.fontStyle = 'italic';
                        }
                    }
                },

                // ── Coral left border drawn on top for assimilé rows ──
                didDrawCell: (hookData) => {
                    if (hookData.section !== 'body') return;
                    const player = players[hookData.row.index];
                    if (player?.est_assimile && hookData.column.index === 0) {
                        doc.setFillColor(...CORAL);
                        doc.rect(
                            hookData.cell.x,
                            hookData.cell.y,
                            2,
                            hookData.cell.height,
                            'F'
                        );
                    }
                },

                // ── Header + footer on every page ──
                didDrawPage: (hookData) => {
                    // Mini-header on pages 2+
                    if (hookData.pageNumber > 1) {
                        doc.setFillColor(...NAVY);
                        doc.rect(0, 0, W, MINI_H, 'F');
                        doc.setFillColor(...VOLT);
                        doc.rect(0, MINI_H - 1, W, 1, 'F');
                        doc.setTextColor(...VOLT);
                        doc.setFontSize(8);
                        doc.setFont('helvetica', 'bold');
                        doc.text('CLASSEMENT OFFICIEL FFT', M, 9);
                        doc.setTextColor(...SLATE4);
                        doc.setFontSize(7);
                        doc.setFont('helvetica', 'normal');
                        doc.text(`${moisLabel} — ${genreLabel}`, W - M, 9, { align: 'right' });
                    }

                    // Footer line
                    const footerY = H - 10;
                    doc.setDrawColor(...VOLT);
                    doc.setLineWidth(0.5);
                    doc.line(M, footerY, W - M, footerY);

                    // Footer text
                    doc.setFontSize(6.5);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(...SLATE4);
                    doc.text('Padel Stats France', M, footerY + 4);
                    doc.text(exportDate, W / 2, footerY + 4, { align: 'center' });
                    // Temporary page number — overwritten in post-loop
                    doc.text(`Page ${hookData.pageNumber}`, W - M, footerY + 4, { align: 'right' });
                },

                margin: { top: MINI_H + 2, left: M, right: M, bottom: 16 },
            });

            // ── Post-processing: replace temp page number with "Page X / Y" in volt ──
            const totalPages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                const footerY = H - 10;
                // White mask over temporary number
                doc.setFillColor(255, 255, 255);
                doc.rect(W - M - 34, footerY + 0.5, 36, 6, 'F');
                // Final styled page count
                doc.setFontSize(6.5);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...VOLT);
                doc.text(`Page ${i} / ${totalPages}`, W - M, footerY + 4, { align: 'right' });
            }

            const genreSuffix = genre ? `_${genre}` : '';
            doc.save(`classement_padel_${mois}${genreSuffix}.pdf`);
        } catch (err) {
            console.error('PDF export error:', err);
            alert("Erreur lors de l'export PDF. Veuillez réessayer.");
        } finally {
            setExporting(false);
        }
    };

    return (
        <div>
            {/* Hero header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-6 mb-6">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
                <h1 className="text-2xl font-bold text-text relative">🏆 Classement Padel France</h1>
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
                        onClick={exportPDF}
                        disabled={exporting || !mois}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-primary to-primary-dark text-white hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {exporting ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Export en cours...
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
