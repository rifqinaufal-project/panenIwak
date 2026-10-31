import type { PdfReport } from '#shared/types/export';

// Standard PDF fonts support Latin text; normalize punctuation used by our UI.
const text = (value: string) => value
  .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
  .replace(/[\u2013\u2014\u2212]/g, '-')
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/[\u201c\u201d]/g, '"')
  .replace(/\u00a0/g, ' ');

/** Import PDF code only when exporting, not while loading or rendering the workspace. */
export async function createPdf(report: PdfReport) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ orientation: 'landscape', format: 'a4', unit: 'mm', compress: true });
  doc.setProperties({ title: text(report.title), author: 'Panen Iwak', subject: text(report.subtitle) });
  const margin = 14;
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  let y = 0;

  function header(continued = false) {
    doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(40, 101, 204);
    doc.text('PANEN IWAK', margin, 14);
    doc.setTextColor(32, 34, 38).setFontSize(continued ? 14 : 20);
    doc.text(text(report.title), margin, continued ? 23 : 26);
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(85, 95, 110);
    doc.text(`Dibuat: ${text(report.generatedAt)}`, width - margin, 14, { align: 'right' });
    y = continued ? 31 : 35;
  }
  function ensureSpace(required: number) {
    if (y + required > height - 16) {
      doc.addPage();
      header(true);
    }
  }
  function paragraph(value: string, fontSize = 8) {
    doc.setFont('helvetica', 'normal').setFontSize(fontSize).setTextColor(85, 95, 110);
    const lines: string[] = doc.splitTextToSize(text(value), width - margin * 2);
    for (const line of lines) {
      ensureSpace(5);
      doc.text(line, margin, y);
      y += 4.5;
    }
    y += 2;
  }

  header();
  paragraph(report.subtitle, 9);
  autoTable(doc, {
    startY: y + 2,
    head: [report.summary.map((item) => text(item.label))],
    body: [report.summary.map((item) => text(item.value))],
    theme: 'plain',
    margin: { left: margin, right: margin, top: 34, bottom: 16 },
    styles: { font: 'helvetica', fontSize: 11, cellPadding: 4 },
    headStyles: { fontSize: 8, fontStyle: 'normal', textColor: [85, 95, 110], fillColor: [244, 246, 249] },
    bodyStyles: { fontStyle: 'bold', textColor: [32, 34, 38], fillColor: [244, 246, 249] },
    didDrawPage(data) { y = (data.cursor?.y ?? y) + 8; },
  });
  for (const note of report.notes) paragraph(note);
  if (!report.tables.length) paragraph('Tidak ada batch yang sesuai dengan filter laporan.', 10);

  for (const table of report.tables) {
    ensureSpace(32);
    y += 4;
    doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(32, 34, 38);
    doc.text(text(table.title), margin, y);
    autoTable(doc, {
      startY: y + 5,
      head: [table.head.map(text)],
      body: table.body.map((row) => row.map(text)),
      theme: 'striped',
      margin: { top: 34, left: margin, right: margin, bottom: 16 },
      showHead: 'everyPage',
      rowPageBreak: 'avoid',
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 3, overflow: 'linebreak', textColor: [32, 34, 38] },
      headStyles: { fillColor: [40, 101, 204], textColor: 255, fontSize: 8 },
      alternateRowStyles: { fillColor: [244, 246, 249] },
      columnStyles: { 0: { cellWidth: 43 } },
      didParseCell(data) {
        if (data.column.index >= (table.numericFrom ?? table.head.length)) data.cell.styles.halign = 'right';
      },
      willDrawPage(data) { if (data.pageNumber > 1) header(true); },
      didDrawPage(data) { y = (data.cursor?.y ?? y) + 8; },
    });
  }

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setDrawColor(225, 229, 235).line(margin, height - 12, width - margin, height - 12);
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(85, 95, 110);
    doc.text('Panen Iwak - Data sesuai filter saat ekspor', margin, height - 7);
    doc.text(`Halaman ${page} / ${pages}`, width - margin, height - 7, { align: 'right' });
  }
  return doc;
}

export async function downloadPdf(filename: string, report: PdfReport) {
  const doc = await createPdf(report);
  await doc.save(filename, { returnPromise: true });
}
