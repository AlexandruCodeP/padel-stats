import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const LOGO_BASE64 = 'data:image/png;base64,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';

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

        // Logo (aspect ratio ~2.4:1 → 28mm × 12mm)
        const LOGO_W = 28;
        const LOGO_H = 12;
        doc.addImage(LOGO_BASE64, 'PNG', M, (HDR_H - LOGO_H) / 2, LOGO_W, LOGO_H);

        const TEXT_X = M + LOGO_W + 4;

        doc.setTextColor(...VOLT);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('CLASSEMENT OFFICIEL FFT', TEXT_X, 15);

        doc.setTextColor(...SLATE3);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`${moisLabel} — ${genreLabel}`, TEXT_X, 21.5);

        doc.setTextColor(...SLATE4);
        doc.setFontSize(7.5);
        const totalStr = players.length.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        doc.text(
            `Total : ${totalStr} joueurs  -  Exporte le ${exportDate}`,
            TEXT_X, 28
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

        // ── Post-processing: watermark + page numbers ──
        self.postMessage({ type: 'progress', message: 'Finalisation...' });
        const totalPages = doc.internal.getNumberOfPages();
        const watermarkState = new doc.GState({ opacity: 0.06 });
        const opaqueState = new doc.GState({ opacity: 1 });

        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);

            // ── Watermark "PADEL MAGAZINE" (repeated grid) ──
            doc.saveGraphicsState();
            doc.setGState(watermarkState);
            doc.setTextColor(150, 150, 150);
            doc.setFontSize(38);
            doc.setFont('helvetica', 'bold');
            const wmSpacingX = 120;
            const wmSpacingY = 80;
            for (let wy = -40; wy < H + 40; wy += wmSpacingY) {
                for (let wx = -40; wx < W + 80; wx += wmSpacingX) {
                    doc.text('PADEL MAGAZINE', wx, wy, { angle: 45 });
                }
            }
            doc.setGState(opaqueState);
            doc.restoreGraphicsState();

            // ── Page numbers ──
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
