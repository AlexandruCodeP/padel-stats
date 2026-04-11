import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const LOGO_BASE64 = 'data:image/jpeg;base64,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';

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

        // Logo (aspect ratio ~4:1 → 36mm × 9mm)
        const LOGO_W = 36;
        const LOGO_H = 9;
        doc.addImage(LOGO_BASE64, 'JPEG', M, (HDR_H - LOGO_H) / 2, LOGO_W, LOGO_H);

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
