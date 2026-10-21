import Decimal from 'decimal.js';

export type AuditFieldChange = { key: string; label: string; before: string | null; after: string | null };
export type AuditChangeGroup = { key: string; title: string; kind: 'added' | 'removed' | 'updated'; fields: AuditFieldChange[] };
export type AuditDiff = { groups: AuditChangeGroup[]; incomplete: boolean };
type Snapshot = Record<string, unknown>;
type Field = { key: string; label: string; format?: 'money' | 'weight' | 'date' | 'role' | 'active' | 'kind' | 'size' };
const AuditDecimal = Decimal.clone({ precision: 40 });

const rootFields: Field[] = [
  { key: 'origin', label: 'Asal perjalanan' },
  { key: 'date', label: 'Tanggal perjalanan', format: 'date' },
  { key: 'fish', label: 'Jenis ikan' },
  { key: 'size', label: 'Size' },
  { key: 'username', label: 'Username' },
  { key: 'name', label: 'Nama lengkap' },
  { key: 'role', label: 'Role', format: 'role' },
  { key: 'is_active', label: 'Status akun', format: 'active' },
];
const kindLabels: Record<string, string> = { purchase: 'Pembelian', expense: 'Biaya perjalanan', sale: 'Penjualan' };
const asSnapshot = (value: unknown): Snapshot | null => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Snapshot : null;

/** Read-only presentation of known business fields; never serialize arbitrary keys/secrets. */
export function createAuditDiff(before: unknown, after: unknown): AuditDiff {
  const result: AuditDiff = { groups: [], incomplete: false };
  const old = asSnapshot(before), next = asSnapshot(after);
  if ((before != null && !old) || (after != null && !next)) return { groups: [], incomplete: true };

  function number(value: unknown): Decimal | null {
    try {
      if ((typeof value !== 'number' && typeof value !== 'string') || value === '') throw new Error();
      const decimal = new AuditDecimal(value);
      // Bound legacy/malformed exponents before expanding them to display strings.
      if (!decimal.isFinite() || decimal.e > 30 || decimal.e < -12) throw new Error();
      return decimal;
    } catch { result.incomplete = true; return null; }
  }
  function decimalText(decimal: Decimal) {
    const [whole = '0', fraction] = decimal.toFixed().split('.');
    return whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (fraction ? `,${fraction}` : '');
  }
  function format(value: unknown, field: Field): string | null {
    if (value == null) return null;
    if (field.format === 'money' || field.format === 'weight') {
      const decimal = number(value);
      return decimal ? field.format === 'money' ? `Rp${decimalText(decimal)}` : `${decimalText(decimal)} kg` : 'Data tidak valid';
    }
    if (field.format === 'active') {
      if (typeof value === 'boolean') return value ? 'Aktif' : 'Nonaktif';
      result.incomplete = true; return 'Data tidak valid';
    }
    if (typeof value !== 'string') { result.incomplete = true; return 'Data tidak valid'; }
    if (field.format === 'date') {
      const date = new Date(`${value}T12:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
        result.incomplete = true; return 'Tanggal tidak valid';
      }
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
    }
    if (field.format === 'role') return value === 'admin' ? 'Admin' : value === 'field_staff' ? 'Staf lapangan' : value;
    if (field.format === 'kind') return kindLabels[value] ?? value;
    if (field.format === 'size' && value === '') return 'Campur semua size';
    return value || 'Belum diisi';
  }
  function changedFields(a: Snapshot | null, b: Snapshot | null, fields: Field[]) {
    return fields.flatMap(field => {
      const before = format(a?.[field.key], field), after = format(b?.[field.key], field);
      return before === after ? [] : [{ key: field.key, label: field.label, before, after }];
    });
  }
  function changeKind(a: Snapshot | null, b: Snapshot | null): AuditChangeGroup['kind'] {
    return !a ? 'added' : !b ? 'removed' : 'updated';
  }

  const fields = changedFields(old, next, rootFields);
  const sample = next ?? old;
  const title = sample && ('origin' in sample || 'items' in sample) ? 'Data batch'
    : sample && ('fish' in sample || 'size' in sample) ? 'Produk ikan' : 'Akun pengguna';
  if (fields.length) result.groups.push({ key: 'fields', title, kind: changeKind(old, next), fields });

  if (!(old && 'items' in old) && !(next && 'items' in next)) return result;
  // A missing collection in an existing snapshot is not proof of deletion/addition.
  if ((old && !Array.isArray(old.items)) || (next && !Array.isArray(next.items))) {
    result.incomplete = true; return result;
  }
  function indexItems(value: unknown): { rows: Map<string, Snapshot>; incomplete: boolean } {
    const rows = new Map<string, Snapshot>(), duplicates = new Set<string>();
    let incomplete = false;
    for (const valueItem of Array.isArray(value) ? value : []) {
      const item = asSnapshot(valueItem);
      if (!item || typeof item.id !== 'string' || !item.id) { incomplete = true; continue; }
      if (rows.has(item.id)) { duplicates.add(item.id); incomplete = true; }
      rows.set(item.id, item);
    }
    for (const id of duplicates) rows.delete(id);
    return { rows, incomplete };
  }
  const oldItems = indexItems(old?.items), nextItems = indexItems(next?.items);
  const incompleteItems = oldItems.incomplete || nextItems.incomplete;
  result.incomplete ||= incompleteItems;
  function total(item: Snapshot | null): string | null {
    if (!item) return null;
    if (!['purchase', 'expense', 'sale'].includes(String(item.kind))) { result.incomplete = true; return 'Data tidak valid'; }
    const price = number(item.price);
    const weight = item.kind === 'expense' ? new Decimal(1) : number(item.weight);
    return price && weight ? `Rp${decimalText(price.times(weight))}` : 'Data tidak valid';
  }
  for (const id of new Set([...oldItems.rows.keys(), ...nextItems.rows.keys()])) {
    const a = oldItems.rows.get(id) ?? null, b = nextItems.rows.get(id) ?? null;
    // Match only stable IDs. Never guess that an unidentifiable legacy row was added/removed.
    if (incompleteItems && (!a || !b)) continue;
    const row = b ?? a!;
    const sameKind = !a || !b || a.kind === b.kind;
    const expense = row.kind === 'expense';
    const fields: Field[] = [
      { key: 'kind', label: 'Jenis transaksi', format: 'kind' },
      { key: 'fish', label: sameKind ? expense ? 'Kategori biaya' : 'Jenis ikan' : 'Jenis ikan / kategori' },
      { key: 'size', label: 'Size', format: row.kind === 'sale' ? 'size' : undefined },
      { key: 'weight', label: 'Bobot', format: 'weight' },
      { key: 'price', label: sameKind ? expense ? 'Jumlah biaya' : 'Harga per kg' : 'Harga / jumlah biaya', format: 'money' },
      { key: 'date', label: 'Tanggal transaksi', format: 'date' },
      { key: 'description', label: 'Keterangan' },
    ];
    const changes = changedFields(a, b, fields.filter(field => !expense || !sameKind || !['weight', 'size'].includes(field.key)));
    const before = total(a), after = total(b);
    if (before !== after && (!expense || !sameKind)) {
      const noteIndex = changes.findIndex(field => field.key === 'description');
      changes.splice(noteIndex < 0 ? changes.length : noteIndex, 0, { key: 'total', label: 'Nilai transaksi', before, after });
    }
    if (!changes.length) continue;
    const fish = typeof row.fish === 'string' && row.fish ? ` · ${row.fish}` : '';
    const size = !expense && typeof row.size === 'string' ? row.size ? ` · Size ${row.size}` : row.kind === 'sale' ? ' · Campur semua size' : '' : '';
    result.groups.push({ key: `item:${id}`, title: `${kindLabels[String(row.kind)] ?? 'Transaksi'}${fish}${size}`, kind: changeKind(a, b), fields: changes });
  }
  return result;
}
