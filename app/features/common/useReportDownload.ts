import { ref } from 'vue';
import type { ExportFormat, PdfReport } from '#shared/types/export';
import { downloadCsv } from '../../utils/download-csv';
import { downloadPdf } from '../../utils/download-pdf';

type Exporters = {
  csv: typeof downloadCsv;
  pdf: typeof downloadPdf;
};
type ReportFile = {
  filename: string;
  csvRows: readonly (readonly unknown[])[];
  pdf: PdfReport;
};

export function useReportDownload(
  notify: (message: string) => void,
  exporters: Exporters = { csv: downloadCsv, pdf: downloadPdf },
) {
  const exporting = ref<ExportFormat | null>(null);
  async function download(format: ExportFormat, build: () => ReportFile) {
    if (exporting.value) return;
    exporting.value = format;
    try {
      const file = build();
      if (format === 'pdf') await exporters.pdf(`${file.filename}.pdf`, file.pdf);
      else await exporters.csv(`${file.filename}.csv`, file.csvRows);
      notify(`Laporan ${format.toUpperCase()} sesuai filter berhasil diunduh.`);
    } catch {
      notify(`Gagal menyiapkan laporan ${format.toUpperCase()}. Silakan coba lagi.`);
    } finally {
      exporting.value = null;
    }
  }
  return { exporting, download };
}
