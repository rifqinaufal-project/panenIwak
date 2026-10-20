import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { batchSchema, usernameSchema, passwordSchema } from '../server/utils/validation';

const db = new PGlite();
test('password requires at least eight characters', () => {
  assert.equal(passwordSchema.safeParse('Abcd1234').success, true);
  assert.equal(passwordSchema.safeParse('Abcd123').success, false);
});
const admin = '10000000-0000-4000-8000-000000000001';
const staff = '10000000-0000-4000-8000-000000000002';
const other = '10000000-0000-4000-8000-000000000003';
const batchId = '20000000-0000-4000-8000-000000000001';
const purchaseId = '30000000-0000-4000-8000-000000000001';
const saleId = '30000000-0000-4000-8000-000000000002';
const purchase = { id: purchaseId, kind: 'purchase', fish: 'Bandeng', size: '15', weight: '20', price: '25000', date: '2026-10-20', description: '' };
const document = { origin: 'Lamongan', date: '2026-10-20', items: [purchase] };
const commit = (actor: string, doc = document, version = 0) => db.query<{ result: any }>('select public.commit_batch($1,$2,$3::jsonb,$4) as result', [actor, batchId, JSON.stringify(doc), version]);
before(async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth; create table auth.users(id uuid primary key,raw_app_meta_data jsonb,encrypted_password text);`);
  await db.exec(await readFile(new URL('../supabase/migrations/202610200001_auth_business.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202610200002_defer_auth_profile.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202610200003_delete_batch.sql', import.meta.url), 'utf8'));
  for (const [id, username, role] of [[admin, 'admin_utama', 'admin'], [staff, 'budi', 'field_staff'], [other, 'dedi', 'field_staff']]) {
    await db.query('insert into auth.users(id,raw_app_meta_data,encrypted_password) values($1,$2::jsonb,$3)', [id, JSON.stringify({ username, name: username, role, audit_actor_id: id === admin ? null : admin }), 'mock-hash']);
  }
});
after(async () => { await db.close(); });
test('username is canonical and rejects emails/spaces', () => {
  assert.equal(usernameSchema.parse(' BUDI_01 '), 'budi_01');
  assert.equal(usernameSchema.safeParse('budi@example.com').success, false);
  assert.equal(usernameSchema.safeParse('budi santoso').success, false);
});
test('profile creation reads metadata populated after auth user insertion', async () => {
  const id = '10000000-0000-4000-8000-000000000004';
  await db.transaction(async tx => {
    await tx.query('insert into auth.users(id,raw_app_meta_data,encrypted_password) values($1,$2::jsonb,$3)', [id, '{}', 'initial-hash']);
    await tx.query('update auth.users set raw_app_meta_data=$1::jsonb where id=$2', [JSON.stringify({ username: 'new_admin', name: 'New Admin', role: 'admin' }), id]);
  });
  const result = await db.query<any>('select username,role from public.profiles where id=$1', [id]);
  assert.equal(result.rows[0].username, 'new_admin');
  assert.equal(result.rows[0].role, 'admin');
});
test('sale supports mixed size and numeric v-model values; invalid money rejected', () => {
  const input = { id: batchId, ...document, items: [{ ...purchase, weight: 20 }, { ...purchase, id: saleId, kind: 'sale', size: '', weight: 10, price: '32000.' }] };
  const parsed = batchSchema.parse(input);
  assert.equal(parsed.items[1]?.size, ''); assert.equal(parsed.items[1]?.price, '32000');
  assert.equal(batchSchema.safeParse({ ...input, items: [{ ...purchase, price: 'NaN' }] }).success, false);
  assert.equal(batchSchema.safeParse({ ...input, items: [{ ...purchase, id: saleId, kind: 'sale', fish: 'Nila' }] }).success, false);
});
test('batch writes are atomic, actor is sourced from profile, retries do not duplicate', async () => {
  const created = (await commit(staff)).rows[0]!.result;
  assert.equal(created.owner_id, staff); assert.equal(created.version, 1);
  const retry = (await commit(staff)).rows[0]!.result;
  assert.equal(retry.id, batchId); assert.equal(retry.version, 1);
  const logs = await db.query<{ username: string; count: number }>('select username,count(*)::int as count from public.audit_logs where batch_id=$1 group by username', [batchId]);
  assert.equal(logs.rows[0]?.username, 'budi'); assert.equal(logs.rows[0]?.count, 1);
});
test('staff cannot write another user batch; stale version does not overwrite', async () => {
  await assert.rejects(commit(other), /ACCESS_DENIED/);
  await assert.rejects(commit(staff, { ...document, origin: 'Tuban' }, 0), /VERSION_CONFLICT/);
  const row = (await db.query<any>('select document from public.batches where id=$1', [batchId])).rows[0];
  assert.equal(row.document.origin, 'Lamongan');
});
test('admin corrections keep before/after values and admin username', async () => {
  await commit(admin, { ...document, origin: 'Gresik' }, 1);
  const log = (await db.query<any>('select * from public.audit_logs where batch_id=$1 order by created_at desc,id desc', [batchId])).rows.find(l => l.username === 'admin_utama');
  assert.equal(log.old_values.origin, 'Lamongan'); assert.equal(log.new_values.origin, 'Gresik');
});
test('deactivated staff loses access, admin cannot disable or demote itself', async () => {
  await assert.rejects(db.query('select public.manage_profile($1,$1,$2,false)', [admin, 'admin']), /ACCESS_DENIED/);
  await db.query('select public.manage_profile($1,$2,$3,false)', [admin, staff, 'field_staff']);
  await assert.rejects(commit(staff, { ...document, origin: 'Surabaya' }, 2));
  await db.query('select public.manage_profile($1,$2,$3,true)', [admin, staff, 'field_staff']);
});
test('password reset increments session revision; audit never stores password hash', async () => {
  await db.query('update auth.users set encrypted_password=$1,raw_app_meta_data=raw_app_meta_data || $2::jsonb where id=$3', ['new-secret-hash', JSON.stringify({ audit_actor_id: admin }), staff]);
  assert.equal((await db.query<any>('select auth_revision from public.profiles where id=$1', [staff])).rows[0].auth_revision, 1);
  const logs = (await db.query<any>("select * from public.audit_logs where action='Password direset'")).rows;
  assert.equal(logs[0].username, 'admin_utama'); assert.ok(!JSON.stringify(logs).includes('secret-hash'));
});
test('public client cannot invoke trusted write RPC or read private tables', async () => {
  await db.exec('set role authenticated');
  try {
    await assert.rejects(db.query('select * from public.profiles'), /permission denied/);
    await assert.rejects(commit(admin), /permission denied/);
  } finally { await db.exec('reset role'); }
});
test('login attempts are limited in the database, not process memory', async () => {
  for (let i = 0; i < 15; i++) assert.equal((await db.query<any>("select public.consume_login_attempt('test-key') as ok")).rows[0].ok, true);
  assert.equal((await db.query<any>("select public.consume_login_attempt('test-key') as ok")).rows[0].ok, false);
});
test('editing and deleting transactions retains auditable before/after documents', async () => {
  const id = '20000000-0000-4000-8000-000000000009';
  const save = (doc: unknown, version: number) => db.query<any>('select public.commit_batch($1,$2,$3::jsonb,$4) as result', [admin, id, JSON.stringify(doc), version]);
  await save(document, 0);
  const corrected = { ...document, items: [{ ...purchase, fish: 'Bandeng koreksi', price: '27000' }] };
  const edited = await save(corrected, 1);
  assert.equal(edited.rows[0].result.document.items[0].fish, 'Bandeng koreksi');
  assert.equal(edited.rows[0].result.document.items[0].id, purchaseId);
  const deleted = await save({ ...document, items: [] }, 2);
  assert.equal(deleted.rows[0].result.document.items.length, 0);
  const logs = await db.query<any>('select * from public.audit_logs where batch_id=$1', [id]);
  assert.equal(logs.rows.length, 3);
  assert.ok(logs.rows.some(l => l.old_values?.items?.[0]?.fish === 'Bandeng koreksi' && l.new_values.items.length === 0));
  assert.ok(logs.rows.every(l => l.username === 'admin_utama'));
});
test('batch deletion checks ownership/version, retains data and audit, and prevents edits', async () => {
  const id = '20000000-0000-4000-8000-000000000010';
  await db.query('select public.commit_batch($1,$2,$3::jsonb,0)', [staff, id, JSON.stringify(document)]);
  await assert.rejects(db.query('select public.delete_batch($1,$2,1)', [other, id]), /ACCESS_DENIED/);
  await assert.rejects(db.query('select public.delete_batch($1,$2,2)', [admin, id]), /VERSION_CONFLICT/);
  await db.query('select public.delete_batch($1,$2,1)', [admin, id]);
  await db.query('select public.delete_batch($1,$2,1)', [admin, id]);
  const row = (await db.query<any>('select * from public.batches where id=$1', [id])).rows[0];
  assert.ok(row.deleted_at); assert.equal(row.document.items.length, 1);
  assert.equal((await db.query('select id from public.batches where id=$1 and deleted_at is null', [id])).rows.length, 0);
  await assert.rejects(db.query('select public.commit_batch($1,$2,$3::jsonb,2)', [admin, id, JSON.stringify({ ...document, origin: 'Changed' })]), /ACCESS_DENIED/);
  const logs = await db.query<any>("select * from public.audit_logs where batch_id=$1 and action='Batch dihapus'", [id]);
  assert.equal(logs.rows.length, 1); assert.equal(logs.rows[0].username, 'admin_utama');
});
