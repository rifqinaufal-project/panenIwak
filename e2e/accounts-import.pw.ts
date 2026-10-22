import { expect, test, type Page } from '@playwright/test';
import { mockWorkspace, menu, dialog } from './fixtures/workspace';

test('registration and login preserve failures, clear successful secrets and keep the destination', async ({
  page,
}) => {
  const state = await mockWorkspace(page, { loggedOut: true });
  await page.goto('/batch/b1');
  await page.getByRole('button', { name: 'Belum punya akun? Daftar akun' }).click();
  await expect(page.getByText('Akun baru langsung menjadi admin', { exact: false })).toBeVisible();
  await page.getByLabel('Nama lengkap', { exact: true }).fill('Budi');
  await page.getByLabel('Username', { exact: true }).fill('budi');
  const password = page.getByLabel('Password', { exact: true });
  await expect(password).toHaveAttribute('minlength', '8');
  await password.fill('test-only-password');
  state.failRegister = true;
  await page.getByRole('button', { name: 'Buat akun', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Username contoh sudah digunakan');
  await expect(password).toHaveValue('test-only-password');
  state.failRegister = false;
  await page.getByRole('button', { name: 'Buat akun', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Silakan masuk');
  await expect(password).toHaveValue('');
  expect(state.logins).toBe(0);
  await expect(page.getByLabel('Username', { exact: true })).toHaveValue('budi');
  await password.fill('test-only-password');
  state.failLogin = true;
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Username atau password contoh salah');
  await expect(password).toHaveValue('test-only-password');
  state.failLogin = false;
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
  await expect(page).toHaveURL('/batch/b1');
  await expect(page.getByRole('heading', { name: 'Lamongan', exact: true })).toBeVisible();
  expect(state.registrations).toBe(2);
  expect(state.logins).toBe(2);
});

test('user loading uses shared skeletons and failed loads can be retried', async ({ page }) => {
  let release!: () => void;
  const holdUsers = new Promise<void>((resolve) => {
    release = resolve;
  });
  const state = await mockWorkspace(page, { holdUsers });
  state.failUsers = true;
  await page.goto('/pengguna');
  await expect(page.locator('.users-panel .workspace-loading')).toBeVisible();
  await expect(page.locator('.users-panel table')).toHaveCount(0);
  release();
  await expect(page.locator('.users-panel').getByRole('alert')).toContainText(
    'Daftar pengguna contoh belum tersedia',
  );
  state.failUsers = false;
  await page.getByRole('button', { name: 'Coba muat ulang', exact: true }).click();
  await expect(page.locator('.users-panel tbody tr')).toHaveCount(1);
  await expect(page.locator('.users-panel').getByRole('alert')).toHaveCount(0);
});

test('account creation, role/status and password reset keep write and navigation safeguards', async ({
  page,
}) => {
  const state = await mockWorkspace(page);
  await page.goto('/pengguna');
  const self = page.locator('.users-panel tbody tr').filter({ hasText: '@andra' });
  await expect(self.getByRole('combobox')).toBeDisabled();
  await expect(self.getByRole('button', { name: 'Nonaktifkan', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Tambah pengguna', exact: true }).click();
  await page.getByLabel('Nama lengkap', { exact: true }).fill('Budi');
  await page.getByLabel('Username', { exact: true }).fill('budi');
  await page.getByLabel('Password', { exact: true }).fill('test-only-password');
  state.failSave = true;
  await page.getByRole('button', { name: 'Simpan akun', exact: true }).click();
  await expect(page.locator('.users-panel').getByRole('alert')).toContainText(
    'Server contoh tidak tersedia',
  );
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('test-only-password');
  state.failSave = false;
  let release!: () => void;
  state.holdSave = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.getByRole('button', { name: 'Simpan akun', exact: true }).click();
  await expect.poll(() => state.saves).toBe(2);
  await expect(page.getByLabel('Nama lengkap', { exact: true })).toBeDisabled();
  await menu(page, 'Log').click();
  await expect(page).toHaveURL('/pengguna');
  await expect(
    page.getByText('Tunggu proses penyimpanan selesai sebelum berpindah halaman.', { exact: true }),
  ).toBeVisible();
  release();
  const row = page.locator('.users-panel tbody tr').filter({ hasText: '@budi' });
  await expect(row).toBeVisible();
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await row.getByRole('combobox').selectOption('admin');
  await expect(row.getByRole('combobox')).toHaveValue('admin');
  await row.getByRole('button', { name: 'Nonaktifkan', exact: true }).click();
  await expect(row.getByRole('button', { name: 'Aktifkan', exact: true })).toBeVisible();
  await row.getByRole('button', { name: 'Reset password', exact: true }).click();
  await page.getByLabel('Password baru', { exact: true }).fill('new-test-only-password');
  state.failSave = true;
  await page.getByRole('button', { name: 'Simpan akun', exact: true }).click();
  await expect(page.locator('.users-panel').getByRole('alert')).toContainText(
    'Server contoh tidak tersedia',
  );
  await expect(page.getByLabel('Password baru', { exact: true })).toHaveValue(
    'new-test-only-password',
  );
  await menu(page, 'Log').click();
  await expect(dialog(page)).toBeVisible();
  await dialog(page).getByRole('button', { name: 'Batal', exact: true }).click();
  await expect(page.getByLabel('Password baru', { exact: true })).toHaveValue(
    'new-test-only-password',
  );
  state.failSave = false;
  await page.getByRole('button', { name: 'Simpan akun', exact: true }).click();
  await expect(row).toBeVisible();
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await expect(page.locator('.users-panel').getByRole('alert')).toHaveCount(0);
  expect(state.saves).toBe(6);
});

async function seedLegacy(page: Page, malformed = false) {
  await page.evaluate(async (malformed) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('panen-iwak-demo-v1', 1);
      request.onupgradeneeded = () => {
        for (const name of ['batches', 'products', 'logs'])
          request.result.createObjectStore(name, { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(['batches', 'products', 'logs'], 'readwrite');
        const date = new Date().toISOString().slice(0, 10);
        for (const id of ['legacy1', 'legacy2'])
          transaction.objectStore('batches').put({
            id,
            code: `LOCAL-${id}`,
            origin: id === 'legacy1' ? 'Tuban' : 'Gresik',
            date,
            items: [
              {
                id: `${id}-p1`,
                kind: 'purchase',
                fish: 'Nila',
                size: malformed ? undefined : 'Besar',
                weight: '100',
                price: '20000',
                date,
                description: '',
              },
            ],
          });
        transaction
          .objectStore('products')
          .put({ id: 'legacy-product', fish: 'Nila', size: 'Besar' });
        transaction
          .objectStore('logs')
          .put({ id: 'unverified-log', username: 'not-a-verified-actor' });
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } finally {
      db.close();
    }
  }, malformed);
}

async function readLegacy(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('panen-iwak-demo-v1');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const transaction = db.transaction(['batches', 'products', 'logs'], 'readonly');
      return await Promise.all(
        ['batches', 'products', 'logs'].map(
          (name) =>
            new Promise<unknown[]>((resolve, reject) => {
              const request = transaction.objectStore(name).getAll();
              request.onsuccess = () => resolve(request.result);
              request.onerror = () => reject(request.error);
            }),
        ),
      );
    } finally {
      db.close();
    }
  });
}

test('legacy import preserves local data and partial selections across refresh and retry', async ({
  page,
}) => {
  const state = await mockWorkspace(page);
  await page.goto('/pengguna');
  await seedLegacy(page);
  const original = await readLegacy(page);
  const panel = page.locator('.legacy-import');
  await panel.getByRole('button', { name: 'Periksa data lama', exact: true }).click();
  const first = panel.locator('.legacy-row').filter({ hasText: 'Tuban' }).getByRole('checkbox');
  const second = panel.locator('.legacy-row').filter({ hasText: 'Gresik' }).getByRole('checkbox');
  await expect(first).not.toBeChecked();
  await expect(second).not.toBeChecked();
  expect(state.saves).toBe(0);
  await first.check();
  await panel.getByRole('button', { name: 'Impor data terpilih', exact: true }).click();
  await expect(panel.getByRole('status')).toContainText('1 data berhasil diimpor');
  await expect.poll(() => state.batches.map((batch) => batch.id).includes('legacy1')).toBe(true);
  expect(state.batches.map((batch) => batch.id)).not.toContain('legacy2');
  expect(state.products).toHaveLength(1);
  await second.check();
  await panel
    .getByRole('checkbox', { name: 'Sertakan 1 master produk lokal', exact: true })
    .check();
  state.failBatchId = 'legacy2';
  await panel.getByRole('button', { name: 'Impor data terpilih', exact: true }).click();
  await expect(panel.getByRole('status')).toContainText(
    'Proses dihentikan: Impor batch contoh gagal',
  );
  await expect(second).toBeChecked();
  await expect(first).not.toBeChecked();
  expect(await readLegacy(page)).toEqual(original);
  state.failBatchId = '';
  let release!: () => void;
  state.holdSave = new Promise<void>((resolve) => {
    release = resolve;
  });
  await panel.getByRole('button', { name: 'Impor data terpilih', exact: true }).click();
  await expect.poll(() => state.saves).toBe(4);
  await menu(page, 'Log').click();
  await expect(page).toHaveURL('/pengguna');
  await expect(second).toBeDisabled();
  release();
  await expect(panel.getByRole('status')).toContainText('2 data berhasil diimpor');
  await expect(second).not.toBeChecked();
  expect(state.batches.filter((batch) => batch.id === 'legacy1')).toHaveLength(1);
  expect(state.batches.filter((batch) => batch.id === 'legacy2')).toHaveLength(1);
  expect(state.products.filter((product) => product.id === 'legacy-product')).toHaveLength(1);
  expect(await readLegacy(page)).toEqual(original);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
});

test('missing and malformed legacy data never trigger imports or change the source', async ({
  page,
}) => {
  const state = await mockWorkspace(page);
  await page.goto('/pengguna');
  let panel = page.locator('.legacy-import');
  await panel.getByRole('button', { name: 'Periksa data lama', exact: true }).click();
  await expect(panel.getByRole('status')).toContainText('Tidak ada database lokal lama');
  await expect(
    panel.getByRole('button', { name: 'Impor data terpilih', exact: true }),
  ).toBeDisabled();
  await seedLegacy(page, true);
  const original = await readLegacy(page);
  await menu(page, 'Log').click();
  await menu(page, 'Pengguna').click();
  panel = page.locator('.legacy-import');
  await panel.getByRole('button', { name: 'Periksa data lama', exact: true }).click();
  await expect(panel.getByRole('status')).toContainText(
    'Data lama tidak dapat dibaca. Data asli tidak diubah.',
  );
  expect(state.saves).toBe(0);
  expect(await readLegacy(page)).toEqual(original);
});
