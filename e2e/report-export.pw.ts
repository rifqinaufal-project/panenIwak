import { readFile } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';
import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import { mockWorkspace } from './fixtures/workspace';

async function downloaded(page: Page, button: Locator, filename: string, info: TestInfo) {
  const pending = page.waitForEvent('download');
  await button.click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe(filename);
  const path = info.outputPath(filename);
  await download.saveAs(path);
  return readFile(path);
}

// Inspect PDF text streams without adding a PDF reader to the production app.
function pdfContent(bytes: Buffer) {
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
  const streams = [...bytes.toString('latin1').matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)];
  return streams.map((match) => {
    try { return inflateSync(Buffer.from(match[1]!, 'latin1')).toString('latin1'); }
    catch { return match[1]!; }
  }).join('\n');
}

test('dashboard downloads real PDF and CSV using the selected period', async ({ page }, info) => {
  const state = await mockWorkspace(page);
  state.batches.push({ ...state.batches[0]!, id: 'old', code: 'EXCLUDED-OLD', date: '2000-01-01' });
  await page.goto('/dashboard');
  const heading = page.locator('.page-heading');
  const pdf = await downloaded(page, heading.getByRole('button', { name: 'Unduh laporan PDF', exact: true }), 'panen-iwak-ringkasan.pdf', info);
  const content = pdfContent(pdf);
  expect(content).toContain('Ringkasan usaha');
  expect(content).toContain('PI-0018');
  expect(content).toContain('Rp1.500.000');
  expect(content).not.toContain('EXCLUDED-OLD');
  const csv = await downloaded(page, heading.getByRole('button', { name: 'Unduh laporan CSV', exact: true }), 'panen-iwak-ringkasan.csv', info);
  expect(csv.toString('utf8')).toContain('"PI-0018"');
  expect(csv.toString('utf8')).not.toContain('EXCLUDED-OLD');
  await expect(page.locator('.chart-section').getByRole('button', { name: 'Unduh ringkasan PDF', exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('dashboard-exports.png') });
});

test('report PDF and CSV preserve the batch filter and downloads work on mobile', async ({ page }, info) => {
  const state = await mockWorkspace(page);
  state.batches.push({ ...state.batches[0]!, id: 'other', code: 'EXCLUDED-BATCH', origin: 'Gresik' });
  await page.goto('/laporan');
  await page.getByRole('combobox', { name: 'Batch', exact: true }).selectOption('b1');
  const pdf = await downloaded(page, page.getByRole('button', { name: 'Ekspor detail PDF', exact: true }), 'panen-iwak-laporan-detail.pdf', info);
  const content = pdfContent(pdf);
  expect(content).toContain('Laporan usaha');
  expect(content).toContain('PI-0018');
  expect(content).toContain('Rp1.500.000');
  expect(content).toContain('HPP');
  expect(content).not.toContain('EXCLUDED-BATCH');
  const csv = await downloaded(page, page.getByRole('button', { name: 'Ekspor detail CSV', exact: true }), 'panen-iwak-laporan-detail.csv', info);
  expect(csv.toString('utf8')).toContain('"PI-0018"');
  expect(csv.toString('utf8')).toContain('"Aktif"');
  expect(csv.toString('utf8')).not.toContain('EXCLUDED-BATCH');
  for (const width of info.project.name === 'mobile' ? [320, 390, 430] : [1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  }
  await page.screenshot({ path: info.outputPath('report-exports.png') });
});

test('empty date selections generate a valid PDF explaining that no batches match', async ({ page }, info) => {
  await mockWorkspace(page);
  await page.goto('/laporan');
  await page.getByLabel('Dari tanggal', { exact: true }).fill('2000-01-01');
  await page.getByLabel('Sampai tanggal', { exact: true }).fill('2000-01-02');
  const pdf = await downloaded(page, page.locator('.page-heading').getByRole('button', { name: 'Unduh laporan PDF', exact: true }), 'panen-iwak-laporan-detail.pdf', info);
  const content = pdfContent(pdf);
  expect(content).toContain('2000-01-01');
  expect(content).toContain('2000-01-02');
  expect(content).toContain('Tidak ada batch');
  expect(content).not.toContain('PI-0018');
});
