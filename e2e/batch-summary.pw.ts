import { expect, test } from '@playwright/test';
import { mockWorkspace } from './fixtures/workspace';

test('batch summary shows financial breakdown, weight totals and existing HPP without duplication', async ({ page }, testInfo) => {
  const state = await mockWorkspace(page);
  state.batches[0]!.items[1]!.weight = '110';
  state.batches[0]!.items.push({
    ...state.batches[0]!.items[0]!, id: 'e1', kind: 'expense', weight: '0', price: '200000',
  });
  await page.goto('/batch/b1');
  const finances = page.getByRole('group', { name: 'Ringkasan keuangan', exact: true });
  await expect(finances.locator(':scope > div').nth(0).locator('strong')).toHaveText('Rp3.300.000');
  await expect(finances.locator(':scope > div').nth(1).locator('strong')).toHaveText('Rp2.200.000');
  await expect(finances.locator('.cost-breakdown')).toContainText('Pembelian ikan Rp2.000.000');
  await expect(finances.locator('.cost-breakdown')).toContainText('Biaya perjalanan Rp200.000');
  await expect(finances.locator(':scope > div').nth(2).locator('strong')).toHaveText('Rp1.100.000');
  await expect(finances.locator(':scope > div').nth(3).locator('strong')).toHaveText('33,33%');
  await expect(page.locator('.batch-weight-metrics dd')).toHaveText(['100 kg', '110 kg', '+10 kg', 'Rp300.000']);
  await expect(page.getByRole('region', { name: 'Ringkasan bobot', exact: true })).toContainText('Bukan laba tambahan');
  await expect(page.getByText('Persentase selisih', { exact: true })).toHaveCount(0);
  await expect(page.locator('.batch-weight-estimate')).toHaveCount(0);
  await expect(page.getByText('Estimasi nilai penjualan selisih bobot', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Estimasi nilai modal selisih', { exact: true })).toHaveCount(0);
  await expect(page.getByText('HPP umum / kg beli', { exact: true })).toHaveCount(1);
  await expect(page.getByText('HPP efektif / kg terjual', { exact: true })).toHaveCount(1);
  await expect(page.locator('.detail-hpp-summary strong')).toHaveText(['Rp22.000', 'Rp20.000', 'Rp20.000', 'Rp30.000']);
  for (const width of testInfo.project.name === 'mobile' ? [320, 390, 430] : [1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  }
  await page.screenshot({ path: testInfo.outputPath('batch-summary.png'), fullPage: true });
});

test('partially sold batches describe negative weight differences without declaring a loss or shrinkage', async ({ page }) => {
  await mockWorkspace(page);
  await page.goto('/batch/b1');
  await expect(page.locator('.batch-weight-metrics dd')).toHaveText(['100 kg', '50 kg', '-50 kg', '—']);
  await expect(page.locator('.batch-summary-note')).toContainText('Penjualan masih berjalan; selisih belum berarti susut atau rugi.');
  await expect(page.locator('.batch-weight-estimate')).toHaveCount(0);
  await expect(page.locator('.detail-hpp-summary strong')).toHaveText(['Rp20.000', 'Rp40.000', 'Rp20.000', 'Rp30.000']);
});

test('unsold and empty batches show unavailable ratios instead of invalid numbers', async ({ page }) => {
  const state = await mockWorkspace(page);
  state.batches[0]!.items = state.batches[0]!.items.filter((item) => item.kind !== 'sale');
  await page.goto('/batch/b1');
  await expect(page.locator('.batch-weight-metrics dd')).toHaveText(['100 kg', '0 kg', '-100 kg', '—']);
  await expect(page.locator('.batch-summary-note')).toContainText('Belum ada penjualan.');
  await expect(page.locator('.detail-metrics > div').nth(3).locator('strong')).toHaveText('—');
  await expect(page.locator('.detail-hpp-summary strong')).toHaveText(['Rp20.000', '—', 'Rp20.000', '—']);
  await expect(page.locator('.batch-weight-estimate')).toHaveCount(0);
  state.batches[0]!.items = [];
  await page.reload();
  await expect(page.locator('.batch-weight-metrics dd')).toHaveText(['0 kg', '0 kg', '0 kg', '—']);
  await expect(page.locator('.batch-summary-note')).toContainText('Belum ada pembelian atau penjualan');
  await expect(page.locator('.detail-hpp-summary strong')).toHaveText(['—', '—', '—', '—']);
  await expect(page.locator('main')).not.toContainText(/NaN|Infinity/);
});

test('48 kg estimate fits in the fourth weight metric without a separate explanation block', async ({ page }, testInfo) => {
  const state = await mockWorkspace(page);
  const purchase = state.batches[0]!.items[0]!;
  const sale = state.batches[0]!.items[1]!;
  state.batches[0]!.items = [
    { ...purchase, weight: '1330', price: '30000' },
    { ...purchase, id: 'e1', kind: 'expense', weight: '0', price: '1113000' },
    { ...sale, weight: '1370', price: '30500' },
    { ...sale, id: 's2', weight: '8', price: '39000' },
  ];
  await page.goto('/batch/b1');
  await expect(page.locator('.batch-weight-metrics dd')).toHaveText(['1.330 kg', '1.378 kg', '+48 kg', 'Rp1.466.369']);
  await expect(page.locator('.batch-weight-estimate')).toHaveCount(0);
  for (const width of testInfo.project.name === 'mobile' ? [320, 390, 430] : [1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    const value = page.locator('.batch-weight-sales-value');
    expect(await value.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  }
  await page.screenshot({ path: testInfo.outputPath('compact-weight-summary.png'), fullPage: true });
});
