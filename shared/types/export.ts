export type ExportFormat = 'csv' | 'pdf';

export type PdfTable = {
  title: string;
  head: string[];
  body: string[][];
  numericFrom?: number;
};

export type PdfReport = {
  title: string;
  subtitle: string;
  generatedAt: string;
  summary: { label: string; value: string }[];
  notes: string[];
  tables: PdfTable[];
};
