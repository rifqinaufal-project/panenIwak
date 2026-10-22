import { expect, test } from '@playwright/test';
import { mockWorkspace, menu, dialog } from './fixtures/workspace';

test('menu URLs, browser Back/Forward and refresh keep the selected screen', async ({ page }) => {
  await mockWorkspace(page);
  await page.goto('/laporan');
  await expect(page.getByRole('heading', { name: 'Laporan usaha', exact: true })).toBeVisible();
  await menu(page, 'Log').click();
  await expect(page).toHaveURL('/log');
  await expect(page.getByRole('heading', { name: 'Log aktivitas', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL('/laporan');
  await page.goForward();
  await expect(page).toHaveURL('/log');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Log aktivitas', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
});

test('batch and transaction deep links survive refresh, including edit values', async ({ page }) => {
  await mockWorkspace(page);
  await page.goto('/batch/b1');
  await expect(page.getByRole('heading', { name: 'Lamongan', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit batch', exact: true }).click();
  await expect(page).toHaveURL('/batch/b1/edit');
  await page.locator('.transaction-row').filter({ hasText: 'Pembelian Nila' }).getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page).toHaveURL('/batch/b1/transaksi/p1/edit');
  await expect(page.getByLabel('Bobot (kg)', { exact: true })).toHaveValue('100');
  await page.reload();
  await expect(page.getByLabel('Bobot (kg)', { exact: true })).toHaveValue('100');
  await page.getByRole('button', { name: 'Batal', exact: true }).click();
  await expect(page).toHaveURL('/batch/b1/edit');
  await page.getByRole('button', { name: 'Tambah biaya perjalanan', exact: true }).click();
  await expect(page).toHaveURL('/batch/b1/biaya/baru');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Catat biaya perjalanan', exact: true })).toBeVisible();
});

test('unsaved forms retain values when navigation or Back is cancelled', async ({ page }) => {
  await mockWorkspace(page);
  await page.goto('/batch');
  await page.getByRole('button', { name: 'Batch baru', exact: true }).click();
  const origin = page.getByPlaceholder('Contoh: Lamongan', { exact: true });
  await origin.fill('Gresik');
  await menu(page, 'Log').click();
  await expect(dialog(page)).toBeVisible();
  await dialog(page).getByRole('button', { name: 'Batal', exact: true }).click();
  await expect(page).toHaveURL('/batch/baru');
  await expect(origin).toHaveValue('Gresik');
  await page.evaluate(() => history.back());
  await expect(dialog(page)).toBeVisible();
  await dialog(page).getByRole('button', { name: 'Batal', exact: true }).click();
  await expect(page).toHaveURL('/batch/baru');
  await expect(origin).toHaveValue('Gresik');
  await menu(page, 'Log').click();
  await dialog(page).getByRole('button', { name: 'Ya, tinggalkan', exact: true }).click();
  await expect(page).toHaveURL('/log');
  await menu(page, 'Batch').click();
  await page.getByRole('button', { name: 'Batch baru', exact: true }).click();
  await expect(origin).toHaveValue('');
});

test('product save failures retain the form; success returns to the correct URL', async ({ page }) => {
  const state = await mockWorkspace(page);
  await page.goto('/produk/prod1/edit');
  await expect(page.getByLabel('Nama ikan', { exact: true })).toHaveValue('Nila');
  await page.getByLabel('Nama ikan', { exact: true }).fill('Lele');
  state.failSave = true;
  await page.getByRole('button', { name: 'Simpan perubahan', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Server contoh tidak tersedia.');
  await expect(page).toHaveURL('/produk/prod1/edit');
  await expect(page.getByLabel('Nama ikan', { exact: true })).toHaveValue('Lele');
  state.failSave = false;
  await page.getByRole('button', { name: 'Simpan perubahan', exact: true }).click();
  await expect(page).toHaveURL('/produk');
  await expect(page.locator('.catalog-row').filter({ hasText: 'Lele' })).toBeVisible();
  await expect(dialog(page)).not.toBeVisible();
  expect(state.saves).toBe(2);
});

test('products use a full-width layout and a single add action in the page header', async ({ page }, testInfo) => {
  const state = await mockWorkspace(page);
  state.products.push({ id: 'prod2', fish: 'Bandeng tambak pesisir utara', size: '10–12 ekor per kilogram' });
  await page.goto('/produk');
  const add = page.getByRole('button', { name: 'Tambah ikan baru', exact: true });
  await expect(add).toHaveCount(1);
  await expect(page.locator('.page-heading').getByRole('button', { name: 'Tambah ikan baru', exact: true })).toBeVisible();
  const list = page.locator('.catalog-list');
  for (const width of testInfo.project.name === 'mobile' ? [320, 390, 430] : [1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const buttonBox = (await add.boundingBox())!;
    const listBox = (await list.boundingBox())!;
    const mainBox = (await page.locator('main').boundingBox())!;
    expect(buttonBox.y + buttonBox.height).toBeLessThanOrEqual(listBox.y);
    expect(listBox.width).toBeGreaterThan(mainBox.width * .85);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    expect(await page.locator('.catalog-actions button').evaluateAll(buttons => buttons.every(button => button.getBoundingClientRect().width >= 44 && button.getBoundingClientRect().height >= 44))).toBe(true);
  }
  await page.screenshot({ path: testInfo.outputPath('products.png') });
  await add.click();
  await expect(page).toHaveURL('/produk/baru');
  const formBox = (await page.locator('.catalog-form').boundingBox())!;
  const backBox = (await page.getByRole('button', { name: 'Kembali ke daftar produk' }).boundingBox())!;
  expect(formBox.y).toBeGreaterThanOrEqual(backBox.y + backBox.height);
  expect(formBox.width).toBeGreaterThan((await page.locator('main').boundingBox())!.width * .85);
  await expect(add).toHaveCount(0);
  await page.getByLabel('Nama ikan', { exact: true }).fill('Lele');
  await page.getByLabel('Size', { exact: true }).fill('Besar');
  await page.getByRole('button', { name: 'Simpan produk', exact: true }).click();
  await expect(page).toHaveURL('/produk');
  await expect(page.locator('.catalog-row').filter({ hasText: 'Lele' })).toBeVisible();
  await page.getByRole('button', { name: 'Edit Lele size Besar', exact: true }).click();
  await expect(page.locator('h1')).toHaveText('Edit produk ikan');
  await expect(page.getByLabel('Size', { exact: true })).toHaveValue('Besar');
  expect(state.saves).toBe(1);
});

test('product empty state keeps the add action at the top and deletion requires confirmation', async ({ page }) => {
  const state = await mockWorkspace(page);
  await page.goto('/produk');
  await page.getByRole('button', { name: 'Hapus Nila size 8–10', exact: true }).click();
  await expect(dialog(page)).toContainText('Transaksi batch lama tidak berubah');
  await dialog(page).getByRole('button', { name: 'Batal', exact: true }).click();
  expect(state.saves).toBe(0);
  await expect(page.locator('.catalog-row').filter({ hasText: 'Nila' })).toBeVisible();
  await page.getByRole('button', { name: 'Hapus Nila size 8–10', exact: true }).click();
  await dialog(page).getByRole('button', { name: 'Ya, hapus produk', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Belum ada produk ikan' })).toBeVisible();
  await expect(page.locator('.catalog-head')).toHaveCount(0);
  await expect(page.locator('.page-heading').getByRole('button', { name: 'Tambah ikan baru', exact: true })).toBeVisible();
  expect(state.batches[0]!.items).toHaveLength(2);
  expect(state.saves).toBe(1);
});

test('session and workspace loading use skeleton states, with working error retry', async ({ page }, testInfo) => {
  let releaseAuth!: () => void, releaseWorkspace!: () => void;
  const holdAuth = new Promise<void>(resolve => { releaseAuth = resolve; });
  const holdWorkspace = new Promise<void>(resolve => { releaseWorkspace = resolve; });
  const state = await mockWorkspace(page, { holdAuth, holdWorkspace });
  await page.goto('/produk');
  const status = page.getByRole('status');
  await expect(status).toContainText('Memeriksa sesi masuk Anda');
  await expect(page.locator('.workspace-loading.is-session')).toBeVisible();
  releaseAuth();
  await expect(status).toContainText('Memuat produk…');
  await expect(page.locator('.loading-list .loading-row')).toHaveCount(4);
  await expect(page.locator('.main-nav')).toBeVisible();
  await expect(menu(page, 'Produk')).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('.catalog-list')).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.locator('.skeleton').first().evaluate(element => getComputedStyle(element).animationName)).toBe('none');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  await page.screenshot({ path: testInfo.outputPath('workspace-loading.png') });
  state.failWorkspace = true;
  releaseWorkspace();
  await expect(page.getByRole('alert')).toContainText('Data contoh belum dapat dimuat.');
  await expect(page.locator('.workspace-loading')).toHaveCount(0);
  state.failWorkspace = false;
  await page.getByRole('button', { name: 'Coba muat ulang', exact: true }).click();
  await expect(page.locator('.catalog-row').filter({ hasText: 'Nila' })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('dashboard loading shows overview placeholders before real totals', async ({ page }) => {
  let releaseWorkspace!: () => void;
  const holdWorkspace = new Promise<void>(resolve => { releaseWorkspace = resolve; });
  await mockWorkspace(page, { holdWorkspace });
  await page.goto('/dashboard');
  await expect(page.getByRole('status')).toContainText('Memuat dashboard…');
  await expect(page.locator('.loading-metrics .loading-card')).toHaveCount(4);
  await expect(page.locator('.dashboard-layout')).toHaveCount(0);
  releaseWorkspace();
  await expect(page.locator('.dashboard-layout')).toBeVisible();
  await expect(page.locator('.workspace-loading')).toHaveCount(0);
});

test('saving a purchase returns to management, not a stale transaction URL', async ({ page }) => {
  const state = await mockWorkspace(page);
  await page.goto('/batch/b1/transaksi/p1/edit');
  await page.getByLabel('Bobot (kg)', { exact: true }).fill('120');
  await page.locator('.transaction-form').getByRole('button', { name: /Simpan/ }).click();
  await expect(page).toHaveURL('/batch/b1/edit');
  await expect(dialog(page)).not.toBeVisible();
  expect(state.saves).toBe(1);
  expect(String(state.batches[0]!.items.find(item => item.id === 'p1')?.weight)).toBe('120');
});

test('saved expenses update detail, dashboard and both report HPP columns', async ({ page }) => {
  await mockWorkspace(page);
  await page.goto('/batch/b1/biaya/baru');
  await page.getByLabel('Jumlah biaya (Rp)', { exact: true }).fill('150000');
  await page.getByRole('button', { name: 'Simpan transaksi', exact: true }).click();
  await expect(page).toHaveURL('/batch/b1/edit');
  await page.getByRole('button', { name: 'Selesai', exact: true }).click();
  await expect(page.locator('.detail-hpp-summary > div').nth(0).locator('strong')).toHaveText('Rp21.500');
  await expect(page.locator('.detail-hpp-summary > div').nth(1).locator('strong')).toHaveText('Rp43.000');
  await expect(page.locator('.detail-metrics > div').nth(1).locator('strong')).toHaveText('Rp2.150.000');
  await menu(page, 'Dashboard').click();
  await expect(page.locator('.cost-total strong')).toHaveText('Rp2.150.000');
  await expect(page.locator('.performance-card > strong')).toHaveText('-Rp650.000');
  await menu(page, 'Laporan').click();
  const cells = page.locator('.report-results tbody tr').first().locator('td');
  await expect(cells.nth(3)).toHaveText('Rp2.150.000');
  await expect(cells.nth(4)).toHaveText('Rp21.500');
  await expect(cells.nth(5)).toHaveText('Rp43.000');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
});

test('linked-sale correction stays isolated until confirmed and saved', async ({ page }) => {
  const state = await mockWorkspace(page);
  await page.goto('/batch/b1/transaksi/p1/edit');
  await page.getByRole('combobox', { name: 'Jenis ikan', exact: true }).selectOption('__other');
  await page.getByLabel('Nama ikan lainnya', { exact: true }).fill('Lele');
  await page.getByLabel('Size', { exact: true }).fill('Besar');
  await page.getByRole('button', { name: 'Simpan transaksi', exact: true }).click();
  await expect(dialog(page)).toContainText('1 penjualan terkait');
  await dialog(page).getByRole('button', { name: 'Batal', exact: true }).click();
  expect(state.saves).toBe(0);
  expect(state.batches[0]!.items.map(item => item.fish)).toEqual(['Nila', 'Nila']);
  await expect(page.getByLabel('Nama ikan lainnya', { exact: true })).toHaveValue('Lele');
  await page.getByRole('button', { name: 'Simpan transaksi', exact: true }).click();
  await dialog(page).getByRole('button', { name: 'Simpan koreksi', exact: true }).click();
  await expect(page).toHaveURL('/batch/b1/edit');
  expect(state.saves).toBe(1);
  expect(state.batches[0]!.items.map(item => item.fish)).toEqual(['Lele', 'Lele']);
  expect(state.batches[0]!.items.find(item => item.id === 's1')!.size).toBe('');
  await expect(page.locator('.transaction-row').filter({ hasText: 'Penjualan Lele' })).toContainText('Campur semua size');
});

test('new batches and multi-item sales leave forms only after a successful save', async ({ page }) => {
  const state = await mockWorkspace(page);
  await page.goto('/batch/baru');
  await page.getByPlaceholder('Contoh: Lamongan', { exact: true }).fill('Gresik');
  const product = page.locator('.product-card');
  await product.getByRole('combobox', { name: 'Jenis ikan', exact: true }).selectOption('Nila');
  await product.getByRole('combobox', { name: 'Size', exact: true }).selectOption('8–10');
  await product.getByLabel('Bobot (kg)', { exact: true }).fill('100');
  await product.getByLabel('Harga beli per kg (Rp)', { exact: true }).fill('20000');
  await page.getByRole('button', { name: 'Simpan batch & pembelian', exact: true }).click();
  await expect(page).toHaveURL(/\/batch\/[\w-]+$/);
  await expect(page.getByRole('heading', { name: 'Gresik', exact: true })).toBeVisible();
  const batchUrl = new URL(page.url()).pathname;
  await page.getByRole('button', { name: 'Tambah penjualan', exact: true }).click();
  await expect(page).toHaveURL(`${batchUrl}/penjualan/baru`);
  await page.getByRole('combobox', { name: 'Jenis ikan', exact: true }).selectOption('Nila');
  await page.getByLabel('Bobot terjual (kg)', { exact: true }).fill('50');
  await page.getByLabel('Harga jual per kg (Rp)', { exact: true }).fill('30000');
  await page.getByRole('button', { name: 'Tambah item penjualan', exact: true }).click();
  const secondSale = page.locator('.sales-form .product-card').nth(1);
  await secondSale.getByRole('combobox', { name: 'Jenis ikan', exact: true }).selectOption('Nila');
  await secondSale.getByLabel('Bobot terjual (kg)', { exact: true }).fill('25');
  await secondSale.getByLabel('Harga jual per kg (Rp)', { exact: true }).fill('32000');
  await page.getByRole('button', { name: 'Simpan semua penjualan', exact: true }).click();
  await expect(page).toHaveURL(batchUrl);
  await expect(dialog(page)).not.toBeVisible();
  expect(state.saves).toBe(2);
  expect(state.batches.find(batch => batch.origin === 'Gresik')!.items.filter(item => item.kind === 'sale')).toHaveLength(2);
});

test('missing records do not render unrelated data or writable forms', async ({ page }) => {
  await mockWorkspace(page);
  for (const path of ['/batch/missing', '/batch/b1/transaksi/missing/edit', '/produk/missing/edit']) {
    await page.goto(path);
    await expect(page.locator('.route-error')).toContainText('tidak ditemukan');
    await expect(page.locator('form')).toHaveCount(0);
  }
});

test('staff deep links cannot open admin screens', async ({ page }) => {
  await mockWorkspace(page, { staff: true });
  await page.goto('/laporan');
  await expect(page).toHaveURL('/batch');
  await expect(page.locator('.main-nav > button')).toHaveCount(3);
  await expect(menu(page, 'Laporan')).toHaveCount(0);
  await page.goto('/batch/b1');
  await expect(page.getByRole('heading', { name: 'Lamongan', exact: true })).toBeVisible();
});

test('login preserves an allowed deep link instead of resetting to dashboard', async ({ page }) => {
  await mockWorkspace(page, { loggedOut: true });
  await page.goto('/batch/b1');
  await page.getByLabel('Username', { exact: true }).fill('andra');
  await page.getByLabel('Password', { exact: true }).fill('test-password-only');
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Lamongan', exact: true })).toBeVisible();
  await expect(page).toHaveURL('/batch/b1');
});

test('browser refresh warns about unsaved edits and cancellation retains them', async ({ page }) => {
  await mockWorkspace(page);
  await page.goto('/produk/prod1/edit');
  await page.getByLabel('Nama ikan', { exact: true }).fill('Lele');
  const prompt = page.waitForEvent('dialog');
  await page.evaluate(() => { setTimeout(() => location.reload(), 0); });
  const nativeDialog = await prompt;
  expect(nativeDialog.type()).toBe('beforeunload');
  await nativeDialog.dismiss();
  await expect(page.getByLabel('Nama ikan', { exact: true })).toHaveValue('Lele');
});

test('pending saves block navigation until the response arrives', async ({ page }) => {
  const state = await mockWorkspace(page);
  let release!: () => void;
  state.holdSave = new Promise<void>(resolve => { release = resolve; });
  await page.goto('/produk/prod1/edit');
  await page.getByLabel('Nama ikan', { exact: true }).fill('Lele');
  await page.getByRole('button', { name: 'Simpan perubahan', exact: true }).click();
  await expect.poll(() => state.saves).toBe(1);
  await menu(page, 'Log').click();
  await expect(page).toHaveURL('/produk/prod1/edit');
  await expect(page.getByText('Tunggu proses penyimpanan selesai sebelum berpindah halaman.', { exact: true })).toBeVisible();
  release();
  await expect(page).toHaveURL('/produk');
});

test('user account forms share the unsaved-navigation protection', async ({ page }) => {
  await mockWorkspace(page);
  await page.goto('/pengguna');
  await page.getByRole('button', { name: 'Tambah pengguna', exact: true }).click();
  await page.getByLabel('Nama lengkap', { exact: true }).fill('Budi');
  await menu(page, 'Log').click();
  await expect(dialog(page)).toBeVisible();
  await dialog(page).getByRole('button', { name: 'Batal', exact: true }).click();
  await expect(page.getByLabel('Nama lengkap', { exact: true })).toHaveValue('Budi');
  await page.getByRole('button', { name: 'Kembali ke daftar pengguna', exact: true }).click();
  await expect(dialog(page)).toBeVisible();
  await dialog(page).getByRole('button', { name: 'Ya, tinggalkan', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Akun pengguna/ })).toBeVisible();
});

test('unknown paths return 404 instead of silently showing a dashboard', async ({ page }) => {
  await mockWorkspace(page);
  const response = await page.goto('/bukan-halaman');
  expect(response?.status()).toBe(404);
  await expect(page.locator('.application')).toHaveCount(0);
});

test('mobile touch swipes scroll only the navbar and expose the last menu', async ({ page, context, isMobile }) => {
  test.skip(!isMobile, 'Requires a touch-enabled mobile context');
  await mockWorkspace(page);
  const cdp = await context.newCDPSession(page);
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/dashboard');
    const nav = page.locator('.main-nav');
    await expect(nav.locator('.nav-label:visible')).toHaveCount(6);
    const bounds = (await nav.boundingBox())!;
    const y = bounds.y + 22;
    for (let swipe = 0; swipe < 2; swipe++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: width - 30, y }] });
      for (let step = 1; step <= 10; step++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: width - 30 - (width - 60) * step / 10, y }] });
        await page.evaluate(() => new Promise(requestAnimationFrame));
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
    await expect.poll(() => nav.evaluate(el => el.scrollLeft)).toBeGreaterThan(30);
    await expect.poll(async () => {
      const last = (await menu(page, 'Pengguna').boundingBox())!;
      return last.x >= bounds.x && last.x + last.width <= bounds.x + bounds.width + 1;
    }).toBe(true);
    await expect(page).toHaveURL('/dashboard'); // Swiping over a button must not click it.
    expect(await page.evaluate(() => ({ x: scrollX, y: scrollY, overflow: document.documentElement.scrollWidth - innerWidth }))).toEqual({ x: 0, y: 0, overflow: 0 });
    await menu(page, 'Pengguna').tap();
    await expect(page).toHaveURL('/pengguna');
  }
});

test('mobile-width navbar supports mouse dragging without accidentally selecting a menu', async ({ page }) => {
  await mockWorkspace(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dashboard');
  const nav = page.locator('.main-nav');
  await expect(nav.locator('.nav-label:visible')).toHaveCount(6);
  const bounds = (await nav.boundingBox())!;
  const y = bounds.y + 22;
  await page.mouse.move(350, y);
  await page.mouse.down();
  await page.mouse.move(25, y, { steps: 12 });
  await page.mouse.up();
  await expect.poll(() => nav.evaluate(el => el.scrollLeft)).toBeGreaterThan(100);
  await expect(page).toHaveURL('/dashboard');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  await menu(page, 'Log').click();
  await expect(page).toHaveURL('/log');
  await menu(page, 'Pengguna').click();
  await expect(page).toHaveURL('/pengguna');
});

test('audit details show readable before/after changes without exposing raw snapshots', async ({ page }, testInfo) => {
  const purchase = { id: 'p1', kind: 'purchase', fish: 'Nila', size: '8–10', weight: '100', price: '20000', date: '2026-10-22', description: '' };
  const document = { origin: 'Lamongan', date: '2026-10-22', items: [purchase] };
  const log = { username: 'andra', actorId: 'visual-admin', timestamp: '2026-10-22T09:00:00Z', batchId: 'b1' };
  await mockWorkspace(page, { logs: [
    { ...log, id: 'edit-log', action: 'Batch diperbarui', detail: 'PI-0018 · Koreksi pembelian', oldValues: document, newValues: { ...document, items: [{ ...purchase, weight: '125', price: '21000', description: 'Koreksi nota pembelian. '.repeat(12) }] } },
    { ...log, id: 'account-log', batchId: null, action: 'Akun diperbarui', detail: 'Role/status akun budi diperbarui', oldValues: { username: 'budi', role: 'field_staff', is_active: true, auth_revision: 0 }, newValues: { username: 'budi', role: 'admin', is_active: false, auth_revision: 1, password: 'never-render-this-secret' } },
    { ...log, id: 'delete-log', batchId: 'deleted-batch', action: 'Batch dihapus', detail: 'PI-0019 · Batch dihapus', oldValues: document, newValues: null },
    { ...log, id: 'legacy-log', action: 'Batch diperbarui', detail: 'PI-0018 · Format lama', oldValues: { ...document, items: [{ ...purchase, id: undefined }] }, newValues: document },
    { ...log, id: 'auth-log', batchId: null, action: 'Password direset', detail: 'Password akun budi direset', oldValues: null, newValues: null },
  ] });
  await page.goto('/log');
  const correction = page.locator('.activity-row').filter({ hasText: 'PI-0018 · Koreksi pembelian' });
  await expect(correction.locator('.audit-diff')).toHaveCount(0); // Closed records are not eagerly compared/rendered.
  await correction.getByText('Lihat perubahan', { exact: true }).click();
  const weight = correction.locator('.audit-field').filter({ has: page.locator('dt', { hasText: /^Bobot$/ }) });
  await expect(weight.locator('dd').nth(0)).toContainText('100 kg');
  await expect(weight.locator('dd').nth(1)).toContainText('125 kg');
  await expect(correction.locator('.audit-field').filter({ has: page.locator('dt', { hasText: /^Nilai transaksi$/ }) })).toContainText('Rp2.625.000');
  await expect(correction.getByText('Diubah', { exact: true })).toBeVisible();
  await expect(correction.locator('dt', { hasText: /^Asal perjalanan$/ })).toHaveCount(0);

  const account = page.locator('.activity-row').filter({ hasText: 'Role/status akun budi diperbarui' });
  await account.getByText('Lihat perubahan', { exact: true }).click();
  await expect(account.locator('.audit-diff')).toContainText('Staf lapangan');
  await expect(account.locator('.audit-diff')).toContainText('Nonaktif');
  await expect(page.getByText('never-render-this-secret')).toHaveCount(0);
  await expect(page.getByText('auth_revision')).toHaveCount(0);

  const removed = page.locator('.activity-row').filter({ hasText: 'PI-0019 · Batch dihapus' });
  await removed.getByText('Lihat perubahan', { exact: true }).click();
  await expect(removed.getByText('Dihapus', { exact: true })).toHaveCount(2);
  await expect(removed.getByRole('button', { name: /Buka batch/ })).toHaveCount(0);

  const legacy = page.locator('.activity-row').filter({ hasText: 'PI-0018 · Format lama' });
  await legacy.getByText('Lihat perubahan', { exact: true }).click();
  await expect(legacy.locator('.audit-diff-notice')).toContainText('format data lama tidak lengkap');
  await expect(legacy.locator('.audit-group')).toHaveCount(0);
  await expect(page.locator('.activity-row').filter({ hasText: 'Password akun budi direset' }).locator('details')).toHaveCount(0);
  await expect(page.locator('.audit-changes pre')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  const viewport = page.viewportSize()!;
  if (viewport.width < 768) {
    for (const width of [320, 430]) {
      await page.setViewportSize({ width, height: viewport.height });
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    }
    await page.setViewportSize(viewport);
  }
  await correction.scrollIntoViewIfNeeded();
  const screenshot = testInfo.outputPath('readable-audit-log.png');
  await page.screenshot({ path: screenshot });
  await testInfo.attach('readable-audit-log', { path: screenshot, contentType: 'image/png' });
  await correction.getByRole('button', { name: /Buka batch/ }).click();
  await expect(page).toHaveURL('/batch/b1');
});
