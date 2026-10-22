import type { Page } from '@playwright/test';

export async function mockWorkspace(
  page: Page,
  options: {
    staff?: boolean;
    loggedOut?: boolean;
    logs?: unknown[];
    holdAuth?: Promise<void>;
    holdWorkspace?: Promise<void>;
    holdUsers?: Promise<void>;
  } = {},
) {
  const date = new Date().toISOString().slice(0, 10);
  const user = {
    id: 'visual-admin',
    name: 'Andra',
    username: 'andra',
    role: options.staff ? 'field_staff' : 'admin',
    is_active: true,
  };
  const state = {
    loggedIn: !options.loggedOut,
    failSave: false,
    failWorkspace: false,
    failUsers: false,
    failLogin: false,
    failRegister: false,
    failBatchId: '',
    holdSave: undefined as Promise<void> | undefined,
    saves: 0,
    logins: 0,
    registrations: 0,
    users: [user],
    batches: [
      {
        id: 'b1',
        code: 'PI-0018',
        origin: 'Lamongan',
        destination: '',
        staff: '',
        date,
        closed: false,
        version: 1,
        items: [
          {
            id: 'p1',
            kind: 'purchase',
            fish: 'Nila',
            size: '8–10',
            weight: '100',
            price: '20000',
            description: '',
            date,
          },
          {
            id: 's1',
            kind: 'sale',
            fish: 'Nila',
            size: '',
            weight: '50',
            price: '30000',
            description: '',
            date,
          },
        ],
      },
    ],
    products: [{ id: 'prod1', fish: 'Nila', size: '8–10' }],
  };
  // Every API call, including writes, is intercepted. No production records/accounts.
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === '/api/auth/me') {
      if (options.holdAuth) await options.holdAuth;
      return route.fulfill({
        status: state.loggedIn ? 200 : 401,
        json: state.loggedIn ? { user } : { statusMessage: 'Unauthorized' },
      });
    }
    if (path === '/api/auth/login') {
      state.logins++;
      if (state.failLogin)
        return route.fulfill({
          status: 401,
          json: { statusMessage: 'Username atau password contoh salah.' },
        });
      state.loggedIn = true;
      return route.fulfill({ json: { user } });
    }
    if (path === '/api/auth/register') {
      state.registrations++;
      return route.fulfill({
        status: state.failRegister ? 409 : 200,
        json: state.failRegister
          ? { statusMessage: 'Username contoh sudah digunakan.' }
          : { ok: true },
      });
    }
    if (path === '/api/auth/logout') {
      state.loggedIn = false;
      return route.fulfill({ json: {} });
    }
    if (path === '/api/workspace') {
      if (options.holdWorkspace) await options.holdWorkspace;
      if (state.failWorkspace)
        return route.fulfill({
          status: 503,
          json: { statusMessage: 'Data contoh belum dapat dimuat.' },
        });
      return route.fulfill({
        json: { batches: state.batches, products: state.products, logs: options.logs ?? [] },
      });
    }
    if (path === '/api/admin/users' && request.method() === 'GET') {
      if (options.holdUsers) await options.holdUsers;
      return route.fulfill({
        status: state.failUsers ? 503 : 200,
        json: state.failUsers
          ? { statusMessage: 'Daftar pengguna contoh belum tersedia.' }
          : { users: state.users },
      });
    }
    if (request.method() !== 'GET') {
      state.saves++;
      if (state.holdSave) await state.holdSave;
      if (state.failSave)
        return route.fulfill({
          status: 503,
          json: { statusMessage: 'Server contoh tidak tersedia.' },
        });
      const body = request.postDataJSON();
      if (path === '/api/admin/users' && request.method() === 'POST') {
        const { name, username, role } = body;
        state.users.push({ id: `u${state.saves}`, name, username, role, is_active: true });
        return route.fulfill({ json: { ok: true } });
      }
      if (path === '/api/admin/users' && request.method() === 'PATCH') {
        Object.assign(
          state.users.find((user) => user.id === body.id)!,
          { role: body.role, is_active: body.is_active },
        );
        return route.fulfill({ json: { ok: true } });
      }
      if (path === '/api/admin/password') return route.fulfill({ json: { ok: true } });
      if (path === '/api/products/save') {
        state.products = [...state.products.filter((product) => product.id !== body.id), body];
        return route.fulfill({ json: { product: body } });
      }
      if (path === '/api/products/manage') {
        state.products = state.products.filter((product) => product.id !== body.id);
        if (body.action === 'edit')
          state.products.push({ id: body.id, fish: body.fish, size: body.size });
        return route.fulfill({ json: {} });
      }
      if (path === '/api/batches/save') {
        if (body.id === state.failBatchId)
          return route.fulfill({
            status: 503,
            json: { statusMessage: 'Impor batch contoh gagal.' },
          });
        const batch = { ...state.batches[0]!, ...body, version: (body.version ?? 0) + 1 };
        state.batches = [...state.batches.filter((batch) => batch.id !== body.id), batch];
        return route.fulfill({ json: { batch } });
      }
      if (path === '/api/batches/delete') {
        state.batches = state.batches.filter((batch) => batch.id !== body.id);
        return route.fulfill({ json: {} });
      }
    }
    return route.fulfill({
      status: 500,
      json: { statusMessage: `Unexpected mock API: ${request.method()} ${path}` },
    });
  });
  return state;
}

export const menu = (page: Page, name: string) =>
  page.locator('.main-nav').getByRole('button', { name, exact: true });
export const dialog = (page: Page) => page.locator('dialog[open]');
