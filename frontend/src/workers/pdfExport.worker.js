import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

self.onmessage = (e) => {
    const { players, genre, mois, moisLabel, exportDate } = e.data;

    try {
        self.postMessage({ type: 'progress', message: 'Preparation du document...' });

        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const W = doc.internal.pageSize.getWidth();   // 210 mm
        const H = doc.internal.pageSize.getHeight();  // 297 mm
        const M = 20; // margins

        // ── Design tokens ──────────────────────────────────────
        const NAVY     = [15,  23,  42];
        const VOLT     = [204, 255, 0];
        const CORAL    = [253, 164, 175];
        const PINK_BG  = [255, 241, 242];
        const SLATE3   = [203, 213, 225];
        const SLATE4   = [148, 163, 184];
        const SLATE8   = [30,  41,  59];
        const SLATE9   = [15,  23,  42];
        const ROSE8    = [159, 18,  57];
        const ROSE9    = [136, 19,  55];

        const genreLabel = genre === 'H' ? 'Hommes' : genre === 'F' ? 'Femmes' : 'Tous';
        const HDR_H = 36;
        const MINI_H = 13;

        // ════════════════════════════════════════════════════════
        // PAGE 1 — FULL HEADER
        // ════════════════════════════════════════════════════════
        doc.setFillColor(...NAVY);
        doc.rect(0, 0, W, HDR_H, 'F');

        doc.setFillColor(...VOLT);
        doc.rect(0, HDR_H - 1.5, W, 1.5, 'F');

        doc.setFillColor(0, 71, 171);
        doc.rect(M, 8, 12, 12, 'F');
        doc.setTextColor(...VOLT);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('PS', M + 6, 16.5, { align: 'center' });

        doc.setTextColor(...VOLT);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('CLASSEMENT OFFICIEL FFT', M + 16, 15);

        doc.setTextColor(...SLATE3);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`${moisLabel} — ${genreLabel}`, M + 16, 21.5);

        doc.setTextColor(...SLATE4);
        doc.setFontSize(7.5);
        const totalStr = players.length.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        doc.text(
            `Total : ${totalStr} joueurs  -  Exporte le ${exportDate}`,
            M + 16, 28
        );

        // ── Legend ──
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
        doc.text('(A) Joueur avec classement assimile', W - M - LEG_W + 5, LEG_Y + 4.7);

        // ════════════════════════════════════════════════════════
        // TABLE DATA
        // ════════════════════════════════════════════════════════
        self.postMessage({ type: 'progress', message: `Rendu de ${totalStr} joueurs...` });

        const tableData = players.map(p => {
            const rawName = p.est_anonyme
                ? 'Joueur anonyme'
                : `${p.nom || ''} ${p.prenom || ''}`.trim();

            let evol = '=';
            if (p.evolution != null) {
                const num = parseFloat(String(p.evolution).replace(',', '.'));
                if (!isNaN(num)) {
                    evol = num > 0 ? `+${num}` : num === 0 ? '=' : String(num);
                } else {
                    evol = String(p.evolution).replace(/[^\x00-\xFF]/g, '?');
                }
            }

            const pts = p.points != null ? String(p.points) : '-';

            return [
                p.rang != null ? String(p.rang) : '-',
                rawName,
                p.est_anonyme ? '-' : (p.nationalite || '-'),
                p.ligue || '-',
                pts,
                evol,
                p.nb_tournois != null ? String(p.nb_tournois) : '-',
            ];
        });

        // Pre-compute assimilé index set for fast lookup in hooks
        const assimileSet = new Set();
        players.forEach((p, i) => { if (p.est_assimile) assimileSet.add(i); });

        autoTable(doc, {
            startY: HDR_H + LEG_H + 6,
            head: [['#', 'Joueur', 'Nat.', 'Ligue', 'Points', 'Evol.', 'Tournois']],
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
                fillColor: [248, 250, 252],
                textColor: SLATE9,
                fontStyle: 'bold',
                fontSize: 7.5,
                lineWidth: 0.15,
                lineColor: [226, 232, 240],
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252],
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 16, font: 'courier' },
                1: { cellWidth: 49 },
                2: { halign: 'center', cellWidth: 11 },
                3: { cellWidth: 34 },
                4: { halign: 'right',  cellWidth: 19, font: 'courier' },
                5: { halign: 'center', cellWidth: 15, font: 'courier' },
                6: { halign: 'center', cellWidth: 15, font: 'courier' },
            },

            didParseCell: (hookData) => {
                if (hookData.section !== 'body') return;
                if (assimileSet.has(hookData.row.index)) {
                    hookData.cell.styles.fillColor = PINK_BG;
                    hookData.cell.styles.textColor = ROSE8;
                    if (hookData.column.index === 1) {
                        hookData.cell.styles.fontStyle = 'italic';
                    }
                }
            },

            didDrawCell: (hookData) => {
                if (hookData.section !== 'body') return;
                if (assimileSet.has(hookData.row.index) && hookData.column.index === 0) {
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

            didDrawPage: (hookData) => {
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

                const footerY = H - 10;
                doc.setDrawColor(...VOLT);
                doc.setLineWidth(0.5);
                doc.line(M, footerY, W - M, footerY);

                doc.setFontSize(6.5);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...SLATE4);
                doc.text('Padel Stats France', M, footerY + 4);
                doc.text(exportDate, W / 2, footerY + 4, { align: 'center' });
                doc.text(`Page ${hookData.pageNumber}`, W - M, footerY + 4, { align: 'right' });

                // Send progress every page
                if (hookData.pageNumber % 10 === 0) {
                    self.postMessage({ type: 'progress', message: `Page ${hookData.pageNumber} generee...` });
                }
            },

            margin: { top: MINI_H + 2, left: M, right: M, bottom: 16 },
        });

        // ── Post-processing: page numbers ──
        self.postMessage({ type: 'progress', message: 'Finalisation...' });
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            const footerY = H - 10;
            doc.setFillColor(255, 255, 255);
            doc.rect(W - M - 34, footerY + 0.5, 36, 6, 'F');
            doc.setFontSize(6.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...VOLT);
            doc.text(`Page ${i} / ${totalPages}`, W - M, footerY + 4, { align: 'right' });
        }

        // Output as ArrayBuffer (transferable, fast)
        const arrayBuffer = doc.output('arraybuffer');
        self.postMessage(
            { type: 'done', buffer: arrayBuffer },
            [arrayBuffer]  // transfer ownership — zero-copy
        );
    } catch (err) {
        self.postMessage({ type: 'error', message: err.message || 'Erreur inconnue' });
    }
};
