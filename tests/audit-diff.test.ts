import { describe, expect, test } from 'bun:test';
import { createAuditDiff } from '../shared/utils/audit-diff';

const purchase = { id: 'p1', kind: 'purchase', fish: 'Nila', size: '8–10', weight: '100', price: '20000', description: '', date: '2026-10-22' };
const sale = { ...purchase, id: 's1', kind: 'sale', size: '', weight: '50', price: '30000' };
const expense = { ...purchase, id: 'e1', kind: 'expense', fish: 'BBM', size: '', weight: '0', price: '150000' };
const batch = (items: unknown[]) => ({ origin: 'Lamongan', date: '2026-10-22', items });

describe('readable audit diffs', () => {
  test('batch metadata changes show only changed fields', () => {
    const diff = createAuditDiff(batch([purchase]), { ...batch([purchase]), origin: 'Gresik' });
    expect(diff.incomplete).toBe(false);
    expect(diff.groups).toHaveLength(1);
    expect(diff.groups[0]).toEqual({ key: 'fields', title: 'Data batch', kind: 'updated', fields: [{ key: 'origin', label: 'Asal perjalanan', before: 'Lamongan', after: 'Gresik' }] });
  });

  test('transaction edits match IDs, not array positions', () => {
    const diff = createAuditDiff(batch([purchase, sale]), batch([sale, { ...purchase, weight: '125' }]));
    expect(diff.groups).toHaveLength(1);
    expect(diff.groups[0]?.key).toBe('item:p1');
    expect(diff.groups[0]?.kind).toBe('updated');
    expect(diff.groups[0]?.fields).toEqual([
      { key: 'weight', label: 'Bobot', before: '100 kg', after: '125 kg' },
      { key: 'total', label: 'Nilai transaksi', before: 'Rp2.000.000', after: 'Rp2.500.000' },
    ]);
  });

  test('numeric strings and numeric v-model values compare by decimal value', () => {
    expect(createAuditDiff(batch([purchase]), batch([{ ...purchase, weight: 100, price: '20000.000' }])).groups).toEqual([]);
  });

  test('added/deleted sales are separate and unsized sales remain mixed', () => {
    const added = createAuditDiff(batch([purchase]), batch([purchase, sale])).groups[0]!;
    expect(added.kind).toBe('added');
    expect(added.title).toBe('Penjualan · Nila · Campur semua size');
    expect(added.fields.find(field => field.key === 'size')?.after).toBe('Campur semua size');
    expect(added.fields.every(field => field.before === null)).toBe(true);
    const removed = createAuditDiff(batch([purchase, sale]), batch([purchase])).groups[0]!;
    expect(removed.kind).toBe('removed');
    expect(removed.fields.every(field => field.after === null)).toBe(true);
  });

  test('creation/deletion retains batch metadata and each transaction', () => {
    const created = createAuditDiff(null, batch([purchase, expense]));
    const deleted = createAuditDiff(batch([purchase, expense]), null);
    expect(created.groups.map(group => group.kind)).toEqual(['added', 'added', 'added']);
    expect(deleted.groups.map(group => group.kind)).toEqual(['removed', 'removed', 'removed']);
    expect(created.groups[0]?.fields.find(field => field.key === 'date')?.after).toBe('22 Okt 2026');
  });

  test('expenses use category and a single amount, never price times a weight', () => {
    const row = createAuditDiff(batch([expense]), batch([{ ...expense, price: '175000' }])).groups[0]!;
    expect(row.title).toBe('Biaya perjalanan · BBM');
    expect(row.fields).toEqual([{ key: 'price', label: 'Jumlah biaya', before: 'Rp150.000', after: 'Rp175.000' }]);
    const created = createAuditDiff(null, batch([{ ...expense, weight: '999' }])).groups[1]!;
    expect(created.fields.some(field => ['weight', 'size', 'total'].includes(field.key))).toBe(false);
    expect(created.fields.find(field => field.key === 'fish')?.label).toBe('Kategori biaya');
  });

  test('product snapshots with asymmetric technical columns do not invent removals', () => {
    const diff = createAuditDiff({ id: 'x', fish: 'Nila', size: '8–10', created_by: 'staff1', created_at: 'yesterday' }, { id: 'x', fish: 'Lele', size: '8–10' });
    expect(diff.groups[0]?.title).toBe('Produk ikan');
    expect(diff.groups[0]?.fields).toEqual([{ key: 'fish', label: 'Jenis ikan', before: 'Nila', after: 'Lele' }]);
  });

  test('account roles and booleans become readable labels without exposing secrets/IDs', () => {
    const diff = createAuditDiff({ username: 'budi', role: 'field_staff', is_active: true, password: 'secret-a', auth_revision: 1, id: 'private-id' }, { username: 'budi', role: 'admin', is_active: false, encrypted_password: 'secret-b', auth_revision: 2, access_token: 'secret-c' });
    expect(diff.groups[0]?.fields).toEqual([
      { key: 'role', label: 'Role', before: 'Staf lapangan', after: 'Admin' },
      { key: 'is_active', label: 'Status akun', before: 'Aktif', after: 'Nonaktif' },
    ]);
    expect(JSON.stringify(diff)).not.toMatch(/secret-|private-id|auth_revision/);
  });

  test('unknown fields and authentication-only logs never become raw JSON', () => {
    expect(createAuditDiff(null, null)).toEqual({ groups: [], incomplete: false });
    expect(createAuditDiff({ password: 'secret', nested: { token: 'secret' } }, { password: 'new-secret' }).groups).toEqual([]);
  });

  test('decimal formatting preserves fractions and large exact transaction totals', () => {
    const row = createAuditDiff(null, batch([{ ...purchase, weight: '0.125', price: '22000.5' }])).groups[1]!;
    expect(row.fields.find(field => field.key === 'weight')?.after).toBe('0,125 kg');
    expect(row.fields.find(field => field.key === 'price')?.after).toBe('Rp22.000,5');
    expect(row.fields.find(field => field.key === 'total')?.after).toBe('Rp2.750,0625');
    const large = createAuditDiff(null, batch([{ ...purchase, weight: '999999999999', price: '999999999999' }])).groups[1]!;
    expect(large.fields.find(field => field.key === 'total')?.after).toBe('Rp999.999.999.998.000.000.000.001');
  });

  test('malformed legacy snapshots are flagged without throwing or inventing zero amounts', () => {
    for (const before of ['legacy text', [], false, 42]) expect(createAuditDiff(before, batch([purchase]))).toEqual({ groups: [], incomplete: true });
    for (const price of ['NaN', 'Infinity', '1e9999999', { secret: 'hidden' }]) {
      const diff = createAuditDiff(null, batch([{ ...purchase, price }]));
      expect(diff.incomplete).toBe(true);
      expect(JSON.stringify(diff)).not.toMatch(/Rp0|hidden|Infinity|NaN/);
    }
    expect(createAuditDiff(null, { items: false }).incomplete).toBe(true);
    expect(createAuditDiff({ date: '2026-02-30' }, { date: '2026-10-22' }).incomplete).toBe(true);
  });

  test('missing or duplicate item IDs are not guessed from array order', () => {
    const diff = createAuditDiff(batch([{ ...purchase, id: undefined }]), batch([purchase]));
    expect(diff.incomplete).toBe(true);
    expect(diff.groups).toEqual([]);
    const duplicate = createAuditDiff(batch([purchase, purchase]), batch([purchase]));
    expect(duplicate.incomplete).toBe(true);
    expect(duplicate.groups).toEqual([]);
  });

  test('missing item collections in existing documents are not treated as deletions', () => {
    expect(createAuditDiff(batch([purchase]), { origin: 'Lamongan', date: '2026-10-22' })).toEqual({ groups: [], incomplete: true });
  });

  test('no-op writes and reordering do not appear as edits; inputs stay unchanged', () => {
    const before = batch([purchase, sale]), after = batch([sale, purchase]);
    const original = JSON.stringify([before, after]);
    expect(createAuditDiff(before, after).groups).toEqual([]);
    expect(JSON.stringify([before, after])).toBe(original);
  });
});
