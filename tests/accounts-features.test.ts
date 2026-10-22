import { describe, expect, test } from 'bun:test';
import type { Profile } from '../shared/types/auth';
import type { AuthenticationRepository } from '../app/features/auth/contracts';
import type { UsersRepository } from '../app/features/users/contracts';
import { useAuthentication } from '../app/features/auth/useAuthentication';
import { useUsers } from '../app/features/users/useUsers';
import { requestErrorMessage } from '../app/utils/request-error';

const admin: Profile = {
  id: 'a1',
  name: 'Admin',
  username: 'admin',
  role: 'admin',
  is_active: true,
};
const staff: Profile = {
  id: 's1',
  name: 'Budi',
  username: 'budi',
  role: 'field_staff',
  is_active: true,
};
const unavailable = { data: { statusMessage: 'Server contoh tidak tersedia.' } };
function deferred() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

describe('authentication controller', () => {
  function fixture() {
    const state = {
      fail: false,
      logins: 0,
      registrations: 0,
      authenticated: [] as Profile[],
      hold: undefined as Promise<void> | undefined,
    };
    const repository: Pick<AuthenticationRepository, 'login' | 'register'> = {
      async login() {
        state.logins++;
        await state.hold;
        if (state.fail) throw unavailable;
        return { ...admin };
      },
      async register() {
        state.registrations++;
        await state.hold;
        if (state.fail) throw unavailable;
      },
    };
    const controller = useAuthentication({
      repository,
      authenticated: (user) => state.authenticated.push(user),
    });
    return { state, controller };
  }
  test('failed login retains the form; successful login clears the password and reports the verified profile', async () => {
    const { state, controller } = fixture();
    Object.assign(controller.form, { username: 'admin', password: 'test-only-password' });
    state.fail = true;
    await controller.submit();
    expect(controller.form.password).toBe('test-only-password');
    expect(controller.error.value).toBe('Server contoh tidak tersedia.');
    expect(state.authenticated).toEqual([]);
    expect(controller.busy.value).toBe(false);
    state.fail = false;
    await controller.submit();
    expect(controller.form.password).toBe('');
    expect(state.authenticated).toEqual([admin]);
  });
  test('registration does not auto-login or accept a client-selected admin role', async () => {
    const { state, controller } = fixture();
    controller.toggleMode();
    Object.assign(controller.form, {
      username: 'budi',
      name: 'Budi',
      password: 'test-only-password',
    });
    state.fail = true;
    await controller.submit();
    expect(controller.registering.value).toBe(true);
    expect(controller.form.password).toBe('test-only-password');
    state.fail = false;
    await controller.submit();
    expect(controller.registering.value).toBe(false);
    expect(controller.form.password).toBe('');
    expect(controller.form.username).toBe('budi');
    expect(controller.message.value).toContain('Silakan masuk');
    expect(state.logins).toBe(0);
    expect(state.authenticated).toEqual([]);
    expect(Object.keys(controller.form).sort()).toEqual(['name', 'password', 'username']);
  });
  test('pending submission cannot switch mode or send a second request', async () => {
    const { state, controller } = fixture();
    const hold = deferred();
    state.hold = hold.promise;
    const first = controller.submit();
    expect(controller.busy.value).toBe(true);
    controller.toggleMode();
    await controller.submit();
    expect(controller.registering.value).toBe(false);
    expect(state.logins).toBe(1);
    hold.release();
    await first;
    expect(controller.busy.value).toBe(false);
  });
  test('mode switching clears secrets/messages and separate instances do not share credentials', () => {
    const first = fixture().controller,
      second = fixture().controller;
    first.form.username = 'admin';
    first.form.password = 'test-only-password';
    first.error.value = 'Error';
    first.message.value = 'Message';
    first.toggleMode();
    expect(first.form.username).toBe('admin');
    expect(first.form.password).toBe('');
    expect(first.error.value).toBe('');
    expect(first.message.value).toBe('');
    expect(second.form.username).toBe('');
  });
});

describe('user administration controller', () => {
  function fixture() {
    const state = {
      fail: false,
      failLoad: false,
      confirmed: true,
      changed: 0,
      writes: 0,
      users: [{ ...admin }, { ...staff }],
      hold: undefined as Promise<void> | undefined,
    };
    const write = async () => {
      state.writes++;
      await state.hold;
      if (state.fail) throw unavailable;
    };
    const repository: UsersRepository = {
      async list() {
        if (state.failLoad) throw unavailable;
        return state.users.map((user) => ({ ...user }));
      },
      async create(input) {
        await write();
        const { password: _password, ...fields } = input;
        state.users.push({ id: 'new', ...fields, is_active: true });
      },
      async resetPassword() {
        await write();
      },
      async update(input) {
        await write();
        Object.assign(
          state.users.find((user) => user.id === input.id)!,
          input,
        );
      },
    };
    const controller = useUsers({
      repository,
      currentUser: () => admin,
      confirm: async () => state.confirmed,
      changed: () => state.changed++,
    });
    return { state, controller };
  }
  test('load failure can be retried without leaving a stale error', async () => {
    const { state, controller } = fixture();
    state.failLoad = true;
    await controller.load();
    expect(controller.error.value).toContain('Server contoh');
    expect(controller.loading.value).toBe(false);
    state.failLoad = false;
    await controller.load();
    expect(controller.users.value).toHaveLength(2);
    expect(controller.error.value).toBe('');
  });
  test('create failure preserves draft/dirty state; success clears secrets and refreshes users/audit', async () => {
    const { state, controller } = fixture();
    controller.startCreate();
    Object.assign(controller.form, {
      name: 'Siti',
      username: 'siti',
      password: 'test-only-password',
      role: 'admin',
    });
    state.fail = true;
    await controller.save();
    expect(controller.view.value).toBe('create');
    expect(controller.dirty.value).toBe(true);
    expect(controller.form.password).toBe('test-only-password');
    expect(state.changed).toBe(0);
    state.fail = false;
    await controller.save();
    expect(controller.view.value).toBe('list');
    expect(controller.dirty.value).toBe(false);
    expect(controller.form.password).toBe('');
    expect(controller.form.role).toBe('field_staff');
    expect(controller.users.value).toHaveLength(3);
    expect(state.changed).toBe(1);
  });
  test('successful write and failed list refresh are reported separately without resubmitting the form', async () => {
    const { state, controller } = fixture();
    controller.startCreate();
    Object.assign(controller.form, {
      name: 'Siti',
      username: 'siti',
      password: 'test-only-password',
    });
    state.failLoad = true;
    await controller.save();
    expect(controller.view.value).toBe('list');
    expect(controller.form.password).toBe('');
    expect(controller.message.value).toContain('berhasil disimpan');
    expect(controller.error.value).toContain('Server contoh');
    await controller.save();
    expect(state.writes).toBe(1);
  });
  test('reset failure retains the password; cancelled discard retains it and confirmed discard clears it', async () => {
    const { state, controller } = fixture();
    controller.startReset(staff);
    controller.resetPassword.value = 'test-only-password';
    state.fail = true;
    await controller.save();
    expect(controller.view.value).toBe('reset');
    expect(controller.resetPassword.value).toBe('test-only-password');
    state.confirmed = false;
    await controller.cancelForm();
    expect(controller.dirty.value).toBe(true);
    expect(controller.target.value?.id).toBe('s1');
    state.confirmed = true;
    await controller.cancelForm();
    expect(controller.view.value).toBe('list');
    expect(controller.resetPassword.value).toBe('');
    expect(controller.target.value).toBeNull();
  });
  test('successful reset clears the secret and refreshes audit once', async () => {
    const { state, controller } = fixture();
    controller.startReset(staff);
    controller.resetPassword.value = 'test-only-password';
    await controller.save();
    expect(controller.resetPassword.value).toBe('');
    expect(controller.view.value).toBe('list');
    expect(state.changed).toBe(1);
  });
  test('self role/status changes are blocked; failed changes never mutate the visible list', async () => {
    const { state, controller } = fixture();
    await controller.load();
    await controller.update(admin, 'field_staff', false);
    expect(state.writes).toBe(0);
    state.fail = true;
    await controller.update(staff, 'admin', false);
    expect(controller.users.value.find((user) => user.id === staff.id)).toEqual(staff);
    expect(state.changed).toBe(0);
    state.fail = false;
    await controller.update(staff, 'admin', false);
    expect(controller.users.value.find((user) => user.id === staff.id)).toMatchObject({
      role: 'admin',
      is_active: false,
    });
    expect(state.changed).toBe(1);
  });
  test('pending save blocks duplicate requests, changing forms and cancellation', async () => {
    const { state, controller } = fixture();
    const hold = deferred();
    state.hold = hold.promise;
    controller.startCreate();
    const save = controller.save();
    await controller.save();
    controller.startReset(staff);
    await controller.cancelForm();
    expect(state.writes).toBe(1);
    expect(controller.view.value).toBe('create');
    hold.release();
    await save;
    expect(controller.busy.value).toBe(false);
  });
});

test('request errors show only explicit server messages or a safe fallback', () => {
  for (const failure of [
    null,
    undefined,
    'secret',
    new Error('secret'),
    { password: 'secret' },
    { data: { statusMessage: {} } },
  ]) {
    expect(requestErrorMessage(failure, 'Fallback')).toBe('Fallback');
  }
  expect(requestErrorMessage(unavailable, 'Fallback')).toBe('Server contoh tidak tersedia.');
});
