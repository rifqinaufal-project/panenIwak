<script setup lang="ts">
import {
  IconFish,
  IconLayoutGrid,
  IconLayersIntersect,
  IconChartBar,
  IconUsers,
  IconChevronDown,
  IconPlus,
  IconArrowUpRight,
  IconArrowDownRight,
  IconArrowRight,
  IconSearch,
  IconBell,
  IconCalendar,
  IconDownload,
  IconDots,
  IconCheck,
  IconWifi,
  IconWifiOff,
  IconArrowLeft,
  IconX,
  IconPackage,
  IconTruck,
  IconReceipt,
  IconRefresh,
  IconShieldCheck,
} from "@tabler/icons-vue";
import Decimal from "decimal.js";
import type { Profile } from '../shared/types/auth';

type Item = {
  id: string;
  kind: "purchase" | "expense" | "sale";
  fish: string;
  size: string;
  weight: string;
  price: string;
  description: string;
  date: string;
};
type Batch = {
  version?: number;
  ownerId?: string;
  id: string;
  code: string;
  origin: string;
  destination: string;
  date: string;
  staff: string;
  closed: boolean;
  items: Item[];
};
const page = ref("Dashboard");
const currentUser = ref<Profile | null>(null);
const authChecked = ref(false);
const signingOut = ref(false);
const managingBatch = ref(false);
const deletingBatch = ref(false);
async function deleteBatch() {
  if (!active.value || deletingBatch.value || savingEntry.value || savingSales.value) return;
  const batch = active.value;
  const confirmed = await confirmDialog.value?.confirm({ title: 'Hapus batch ini?', message: `${batch.code} · ${batch.origin} beserta seluruh pembelian, biaya, dan penjualannya akan dikeluarkan dari daftar dan laporan. Riwayat tetap disimpan. Tidak ada tombol pulihkan di aplikasi.`, label: 'Ya, hapus batch' });
  if (!confirmed || active.value?.id !== batch.id) return;
  deletingBatch.value = true; error.value = '';
  try {
    await $fetch('/api/batches/delete', { method: 'POST', body: { id: batch.id, version: batch.version } });
    batches.value = batches.value.filter(b => b.id !== batch.id);
    selected.value = null; transaction.value = null; managingBatch.value = false;
    await refreshActivity(); notify('Batch dihapus dari daftar dan laporan.');
  } catch (e) { error.value = requestMessage(e); }
  finally { deletingBatch.value = false; }
}
const confirmDialog = ref<{ confirm: (options: { title: string; message: string; label?: string }) => Promise<boolean> } | null>(null);
const savingEntry = ref(false);
const workspaceError = ref('');
const navigation = computed(() => [
  { name: 'Dashboard', icon: IconLayoutGrid, admin: true },
  { name: 'Batch', icon: IconLayersIntersect },
  { name: 'Produk', icon: IconFish },
  { name: 'Laporan', icon: IconChartBar, admin: true },
  { name: 'Log', icon: IconReceipt },
  { name: 'Pengguna', icon: IconUsers, admin: true },
].filter(item => !item.admin || currentUser.value?.role === 'admin'));
function requestMessage(e: any) {
  if (e.status === 401 || e.statusCode === 401) { currentUser.value = null; batches.value = []; catalog.value = []; activityLogs.value = []; }
  return e.data?.statusMessage || 'Permintaan gagal. Periksa koneksi dan coba kembali. Input belum dihapus.';
}
async function refreshActivity() {
  try { activityLogs.value = (await $fetch<{ logs: ActivityLog[] }>('/api/workspace')).logs; }
  catch { notify('Data tersimpan; riwayat belum dapat dimuat ulang.'); }
}
async function loadWorkspace() {
  workspaceError.value = ''; ready.value = false;
  try {
    const data = await $fetch<{ batches: Batch[]; products: CatalogProduct[]; logs: ActivityLog[] }>('/api/workspace');
    batches.value = data.batches; catalog.value = data.products; activityLogs.value = data.logs;
  } catch (e) { workspaceError.value = requestMessage(e); }
  finally { ready.value = true; }
}
async function authenticated(user: Profile) {
  currentUser.value = user; go(user.role === 'admin' ? 'Dashboard' : 'Batch');
  await loadWorkspace();
}
async function logout() {
  if (savingEntry.value || savingSales.value) return;
  if ((transaction.value || showForm.value || showProductForm.value) && !await confirmDialog.value?.confirm({ title: 'Keluar dari akun?', message: 'Isian yang belum disimpan akan hilang saat keluar.', label: 'Keluar' })) return;
  signingOut.value = true;
  try {
    await $fetch('/api/auth/logout', { method: 'POST', body: {} });
    currentUser.value = null; batches.value = []; catalog.value = []; activityLogs.value = [];
    products.value = [newProduct()]; tripExpenses.value = []; saleRows.value = [newSaleRow()];
    selected.value = null; transaction.value = null; showForm.value = false; error.value = ''; notice.value = false;
  } catch (e) { notify(requestMessage(e)); }
  finally { signingOut.value = false; }
}
const tab = ref("Ringkasan");
const period = ref("Bulan ini");
const search = ref("");
const selected = ref<string | null>(null);
const showForm = ref(false);
const transaction = ref<Item["kind"] | null>(null);
let saleKey = 0;
const newSaleRow = (): { id: string; key: number; fish: string; size: string; weight: string; price: string } => ({ id: crypto.randomUUID(), key: ++saleKey, fish: '', size: '', weight: '', price: '' });
const saleRows = ref([newSaleRow()]);
const savingSales = ref(false);
const saleFormTotal = computed(() => saleRows.value.reduce((sum, row) => sum.plus(safeDecimal(row.weight).times(safeDecimal(row.price))), new Decimal(0)));
const saleFormWeight = computed(() => saleRows.value.reduce((sum, row) => sum.plus(safeDecimal(row.weight)), new Decimal(0)));
const transactionGroups = [
  {
    kind: "purchase" as const,
    title: "Pembelian ikan",
    hint: "Produk dan modal pembelian ikan.",
    metric: "purchases" as const,
  },
  {
    kind: "expense" as const,
    title: "Biaya perjalanan",
    hint: "Tol, BBM, es, dan biaya operasional lainnya.",
    metric: "expense" as const,
  },
  {
    kind: "sale" as const,
    title: "Penjualan ikan",
    hint: "Ikan terjual dan pendapatan yang tercatat.",
    metric: "revenue" as const,
  },
];
function startTransaction(kind: Item["kind"]) {
  editingItemId.value = null;
  pendingItemId.value = crypto.randomUUID();
  if (kind === 'sale') saleRows.value = [newSaleRow()];
  transaction.value = kind;
  entry.fish = kind === "expense" ? "BBM" : "";
  entry.size = "";
  entry.weight = "";
  entry.price = "";
  entry.description = "";
  error.value = "";
}
const editingItemId = ref<string | null>(null);
function editItem(item: Item) {
  if (savingEntry.value || savingSales.value) return;
  startTransaction(item.kind);
  editingItemId.value = item.id;
  pendingItemId.value = item.id;
  Object.assign(entry, { fish: item.fish, size: item.size, weight: item.weight, price: item.price, date: item.date, description: item.description });
  if (item.kind === 'sale') saleRows.value = [{ ...newSaleRow(), ...item }];
}
function validSaleReferences(items: Item[]) {
  return items.filter(i => i.kind === 'sale').every(sale => items.some(p => p.kind === 'purchase' && p.fish === sale.fish && (!sale.size || p.size === sale.size)));
}
async function deleteItem(item: Item) {
  if (!active.value || savingEntry.value || savingSales.value) return;
  const batch = JSON.parse(JSON.stringify(active.value)) as Batch;
  batch.items = batch.items.filter(i => i.id !== item.id);
  if (!validSaleReferences(batch.items)) { error.value = 'Pembelian ini masih menjadi acuan penjualan. Sesuaikan atau hapus penjualan terkait terlebih dahulu.'; return; }
  if (!await confirmDialog.value?.confirm({ title: 'Hapus transaksi?', message: `${item.kind === 'expense' ? 'Biaya' : item.kind === 'purchase' ? 'Pembelian' : 'Penjualan'} ${item.fish} akan dihapus. HPP dan laba akan dihitung ulang. Tindakan ini tidak dapat dibatalkan dan tercatat di log.`, label: 'Ya, hapus transaksi' })) return;
  if (!active.value || active.value.id !== batch.id) return;
  error.value = '';
  if (await persist(batch)) {
    batches.value = batches.value.map(b => b.id === batch.id ? batch : b);
    notify('Transaksi dihapus. Perhitungan batch sudah diperbarui.');
  }
}
const online = ref(true);
const ready = ref(false);
const toast = ref("");
const notice = ref(false);
const hoverDay = ref<number | null>(null);
const error = ref("");
const batches = ref<Batch[]>([]);
const reportStart = ref("");
const reportEnd = ref("");
const reportBatch = ref("");
const reportRows = computed(() =>
  batches.value.filter(
    (b) =>
      (!reportStart.value || b.date >= reportStart.value) &&
      (!reportEnd.value || b.date <= reportEnd.value) &&
      (!reportBatch.value || b.id === reportBatch.value),
  ),
);
const reportTotals = computed(() =>
  metrics(reportRows.value.flatMap((b) => b.items)),
);
const expandedReport = ref<string | null>(null);
function exportReport() {
  const rows = [
    [
      "Batch",
      "Tanggal",
      "Asal",
      "Status",
      "Pembelian",
      "Biaya perjalanan",
      "Total biaya",
      "Pendapatan",
      "Laba",
      "Margin (%)",
      "Bobot beli (kg)",
      "Bobot jual (kg)",
      "Selisih (kg)",
      "HPP umum/kg beli",
      "HPP efektif/kg terjual",
    ],
    ...reportRows.value.map((b) => {
      const m = metrics(b.items);
      return [
        b.code,
        b.date,
        b.origin,
        'Berjalan',
        m.purchases.toString(),
        m.expense.toString(),
        m.cost.toString(),
        m.revenue.toString(),
        m.profit.toString(),
        m.margin?.toFixed(2) ?? "",
        m.bought.toString(),
        m.sold.toString(),
        m.difference.toString(),
        m.bought.isZero() ? '' : m.cost.div(m.bought).toFixed(2),
        m.hpp?.toFixed(2) ?? '',
      ];
    }),
  ];
  const url = URL.createObjectURL(
    new Blob(
      [
        "\uFEFF" +
          rows
            .map((row) =>
              row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","),
            )
            .join("\n"),
      ],
      { type: "text/csv;charset=utf-8;" },
    ),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "panen-iwak-laporan-detail.csv";
  a.click();
  URL.revokeObjectURL(url);
  notify("Laporan detail sesuai filter berhasil diunduh.");
}
type ActivityLog = {
  username: string;
  actorId: string;
  oldValues?: unknown;
  newValues?: unknown;
  id: string;
  timestamp: string;
  action: string;
  detail: string;
  batchId?: string;
};
const activityLogs = ref<ActivityLog[]>([]);
const logSearch = ref("");
const filteredLogs = computed(() =>
  activityLogs.value.filter((l) =>
    `${l.username} ${l.action} ${l.detail}`
      .toLowerCase()
      .includes(logSearch.value.toLowerCase()),
  ),
);
const logTime = (value: string) =>
  new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
type CatalogProduct = { id: string; fish: string; size: string };
const catalog = ref<CatalogProduct[]>([]);
const catalogForm = reactive({ fish: "", size: "" });
const catalogError = ref("");
const showProductForm = ref(false);
const managingProducts = ref(false);
const editingProductId = ref<string | null>(null);
const savingProduct = ref(false);
function editCatalogProduct(product: CatalogProduct) {
  editingProductId.value = product.id;
  Object.assign(catalogForm, { fish: product.fish, size: product.size });
  catalogError.value = ''; showProductForm.value = true;
}
async function deleteCatalogProduct(product: CatalogProduct) {
  if (savingProduct.value) return;
  if (!await confirmDialog.value?.confirm({ title: 'Hapus produk ikan?', message: `${product.fish} · Size ${product.size} akan dihapus dari master produk. Transaksi batch lama tidak berubah.`, label: 'Ya, hapus produk' })) return;
  savingProduct.value = true; catalogError.value = '';
  try {
    await $fetch('/api/products/manage', { method: 'POST', body: { action: 'delete', id: product.id } });
    catalog.value = catalog.value.filter(p => p.id !== product.id);
    await refreshActivity(); notify('Produk ikan dihapus.');
  } catch (e) { catalogError.value = requestMessage(e); }
  finally { savingProduct.value = false; }
}
const saleProducts = computed(() => {
  const unique = new Map<string, { fish: string; size: string }>();
  for (const p of active.value?.items ?? [])
    if (p.kind === "purchase")
      unique.set(JSON.stringify([p.fish, p.size]), {
        fish: p.fish,
        size: p.size,
      });
  return [...unique.values()];
});
async function addCatalogProduct() {
  if (savingProduct.value) return;
  catalogError.value = "";
  const fish = catalogForm.fish.trim(),
    size = catalogForm.size.trim();
  if (!fish || !size) {
    catalogError.value = "Isi nama ikan dan size.";
    return;
  }
  if (
    catalog.value.some(
      (p) =>
        p.id !== editingProductId.value &&
        p.fish.toLowerCase() === fish.toLowerCase() &&
        p.size.toLowerCase() === size.toLowerCase(),
    )
  ) {
    catalogError.value =
      "Produk dengan nama ikan dan size tersebut sudah tersedia.";
    return;
  }
  const product = { id: editingProductId.value ?? crypto.randomUUID(), fish, size };
  savingProduct.value = true;
  try {
    if (!online.value) throw new Error('offline');
    if (editingProductId.value) {
      await $fetch('/api/products/manage', { method: 'POST', body: { action: 'edit', ...product } });
      catalog.value = catalog.value.map(p => p.id === product.id ? product : p);
    } else {
      const result = await $fetch<{ product: CatalogProduct }>('/api/products/save', { method: 'POST', body: product });
      if (!catalog.value.some(p => p.id === result.product.id)) catalog.value.push(result.product);
    }
    await refreshActivity();
    catalogForm.fish = "";
    catalogForm.size = "";
    showProductForm.value = false;
    editingProductId.value = null;
    notify("Produk tersimpan di server.");
  } catch (e) {
    catalogError.value = !online.value ? 'Sambungkan internet untuk menyimpan produk. Isian tetap tersedia.' : requestMessage(e);
  } finally { savingProduct.value = false; }
}
let toastTimer: ReturnType<typeof setTimeout>;
const pendingBatchId = ref(crypto.randomUUID());
const pendingItemId = ref<string>(crypto.randomUUID());
const today = () => { const now = new Date(); return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const batchForm = reactive({
  origin: "",
  date: today(),
});
let productKey = 0;
const newProduct = () => ({
  id: crypto.randomUUID(),
  key: ++productKey,
  fish: "",
  size: "",
  weight: "",
  price: "",
});
const products = ref([newProduct()]);
const newExpense = () => ({ id: crypto.randomUUID(), category: 'BBM', description: '', price: '' });
const tripExpenses = ref<
  { id: string; category: string; description: string; price: string }[]
>([]);
function safeDecimal(value: Decimal.Value | null | undefined) {
  try {
    const number = new Decimal(value ?? 0);
    return number.isFinite() && !number.isNegative() ? number : new Decimal(0);
  } catch {
    return new Decimal(0);
  }
}
const draftTotal = computed(() =>
  products.value.reduce(
    (sum, p) => sum.plus(safeDecimal(p.weight).times(safeDecimal(p.price))),
    new Decimal(0),
  ),
);
const draftExpenses = computed(() =>
  tripExpenses.value.reduce(
    (sum, e) => sum.plus(safeDecimal(e.price)),
    new Decimal(0),
  ),
);
const draftWeight = computed(() =>
  products.value.reduce(
    (sum, p) => sum.plus(safeDecimal(p.weight)),
    new Decimal(0),
  ),
);
const draftHpp = computed(() =>
  draftWeight.value.isPositive()
    ? draftTotal.value.plus(draftExpenses.value).div(draftWeight.value)
    : null,
);
const productHpps = computed(() => {
  const groups = new Map<
    string,
    {
      fish: string;
      size: string;
      weight: Decimal;
      cost: Decimal;
      complete: boolean;
    }
  >();
  for (const p of products.value) {
    const fish = p.fish.trim(),
      size = p.size.trim();
    if (!fish || !size) continue;
    const key = JSON.stringify([fish.toLowerCase(), size.toLowerCase()]);
    const row = groups.get(key) ?? {
      fish,
      size,
      weight: new Decimal(0),
      cost: new Decimal(0),
      complete: true,
    };
    const weight = safeDecimal(p.weight),
      price = safeDecimal(p.price);
    row.weight = row.weight.plus(weight);
    row.cost = row.cost.plus(weight.times(price));
    row.complete = row.complete && weight.isPositive() && price.isPositive();
    groups.set(key, row);
  }
  return [...groups.values()].map((row) => {
    const allocation = draftWeight.value.isPositive()
      ? draftExpenses.value.times(row.weight).div(draftWeight.value)
      : new Decimal(0);
    const purchasePerKg = row.weight.isPositive()
      ? row.cost.div(row.weight)
      : null;
    const expensePerKg = draftWeight.value.isPositive()
      ? draftExpenses.value.div(draftWeight.value)
      : null;
    return {
      ...row,
      allocation,
      purchasePerKg,
      expensePerKg,
      hpp:
        row.complete && row.weight.isPositive()
          ? row.cost.plus(allocation).div(row.weight)
          : null,
    };
  });
});
const entry = reactive({
  fish: "",
  size: "",
  weight: "",
  price: "",
  description: "",
  date: today(),
});
const idr = (n: Decimal.Value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  })
    .format(Number.isFinite(Number(n)) ? Number(n) : 0)
    .replace(/\s/g, "");
const kg = (n: Decimal.Value) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(
    Number(n),
  );
const dateLabel = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
function metrics(items: Item[]) {
  let revenue = new Decimal(0),
    purchases = new Decimal(0),
    expense = new Decimal(0),
    bought = new Decimal(0),
    sold = new Decimal(0);
  for (const i of items) {
    const weight = new Decimal(i.weight || 0),
      price = new Decimal(i.price || 0);
    if (i.kind === "purchase") {
      purchases = purchases.plus(weight.times(price));
      bought = bought.plus(weight);
    }
    if (i.kind === "sale") {
      revenue = revenue.plus(weight.times(price));
      sold = sold.plus(weight);
    }
    if (i.kind === "expense") expense = expense.plus(price);
  }
  const cost = purchases.plus(expense),
    profit = revenue.minus(cost);
  return {
    revenue,
    purchases,
    expense,
    cost,
    profit,
    bought,
    sold,
    difference: sold.minus(bought),
    margin: revenue.isZero() ? null : profit.div(revenue).times(100),
    hpp: sold.isZero() ? null : cost.div(sold),
  };
}
const active = computed(() =>
  batches.value.find((b) => b.id === selected.value),
);
const visible = computed(() =>
  batches.value
    .filter((b) =>
      `${b.code} ${b.origin}`
        .toLowerCase()
        .includes(search.value.toLowerCase()),
    )
    .filter((b) => { const now = new Date(); now.setDate(now.getDate() - 6); const start = period.value === 'Minggu ini' ? new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0,10) : today().slice(0,7) + '-01'; return b.date >= start && b.date <= today(); })
    .filter((b) => tab.value !== "Batch aktif" || !b.closed)
    .filter((b) => tab.value !== "Batch selesai" || b.closed),
);
const totals = computed(() => metrics(visible.value.flatMap((b) => b.items)));
const batchTotals = computed(() => metrics(active.value?.items ?? []));
const weightDifferenceValue = computed(() => batchTotals.value.bought.isPositive()
  ? batchTotals.value.difference.times(batchTotals.value.cost).div(batchTotals.value.bought)
  : null);
const detailProductHpps = computed(() => {
  const groups = new Map<
    string,
    { fish: string; size: string; weight: Decimal; cost: Decimal }
  >();
  for (const p of active.value?.items ?? []) {
    if (p.kind !== "purchase") continue;
    const key = JSON.stringify([p.fish.toLowerCase(), p.size.toLowerCase()]);
    const row = groups.get(key) ?? {
      fish: p.fish,
      size: p.size,
      weight: new Decimal(0),
      cost: new Decimal(0),
    };
    row.weight = row.weight.plus(p.weight);
    row.cost = row.cost.plus(new Decimal(p.weight).times(p.price));
    groups.set(key, row);
  }
  const expensePerKg = batchTotals.value.bought.isPositive()
    ? batchTotals.value.expense.div(batchTotals.value.bought)
    : new Decimal(0);
  return [...groups.values()].map((row) => ({
    ...row,
    expensePerKg,
    purchasePerKg: row.weight.isPositive() ? row.cost.div(row.weight) : null,
    hpp: row.weight.isPositive()
      ? row.cost.div(row.weight).plus(expensePerKg)
      : null,
  }));
});
const openCount = computed(() => batches.value.filter((b) => !b.closed).length);
const sampleItem = (
  kind: Item["kind"],
  fish: string,
  weight: number,
  price: number,
  date: string,
): Item => ({
  id: crypto.randomUUID(),
  kind,
  fish,
  size: "Sedang",
  weight: String(weight),
  price: String(price),
  description:
    kind === "expense" ? "BBM, tol, es, dan operasional perjalanan" : "",
  date,
});
function seed(): Batch[] {
  return [
    [
      "0018",
      "Lamongan",
      "Surabaya",
      "2026-10-20",
      "Budi Santoso",
      false,
      850,
      26000,
      720,
      34000,
      1250000,
    ],
    [
      "0017",
      "Gresik",
      "Sidoarjo",
      "2026-10-18",
      "Ahmad Fauzi",
      false,
      640,
      24000,
      490,
      32000,
      850000,
    ],
    [
      "0016",
      "Tuban",
      "Surabaya",
      "2026-10-15",
      "Budi Santoso",
      true,
      920,
      25000,
      935,
      33500,
      1480000,
    ],
    [
      "0015",
      "Lamongan",
      "Malang",
      "2026-10-12",
      "Dedi Kurniawan",
      true,
      780,
      26000,
      792,
      35000,
      1620000,
    ],
    [
      "0014",
      "Gresik",
      "Surabaya",
      "2026-10-08",
      "Ahmad Fauzi",
      true,
      680,
      24000,
      688,
      32500,
      920000,
    ],
  ].map((r) => ({
    id: crypto.randomUUID(),
    code: `PI-${r[0]}`,
    origin: String(r[1]),
    destination: String(r[2]),
    date: String(r[3]),
    staff: String(r[4]),
    closed: Boolean(r[5]),
    items: [
      sampleItem("purchase", "Nila", Number(r[6]), Number(r[7]), String(r[3])),
      sampleItem("sale", "Nila", Number(r[8]), Number(r[9]), String(r[3])),
      sampleItem("expense", "", 0, Number(r[10]), String(r[3])),
    ],
  }));
}
function notify(text: string) {
  toast.value = text;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toast.value = ""), 4500);
}
async function persist(batch: Batch) {
  if (savingEntry.value) return false;
  savingEntry.value = true;
  try {
    if (!online.value) { error.value = 'Belum tersimpan: sambungkan internet untuk menyimpan ke server. Input tetap tersedia.'; return false; }
    const result = await $fetch<{ batch: Batch }>('/api/batches/save', { method: 'POST', body: { id: batch.id, origin: batch.origin, date: batch.date, items: batch.items, version: batch.version ?? 0 } });
    Object.assign(batch, result.batch);
    await refreshActivity();
    return true;
  } catch (e) {
    error.value = requestMessage(e);
    return false;
  } finally { savingEntry.value = false; }
}
function go(name: string) {
  managingBatch.value = false;
  if (currentUser.value?.role !== 'admin' && ['Dashboard', 'Laporan', 'Pengguna'].includes(name)) name = 'Batch';
  showProductForm.value = false;
  page.value = name;
  selected.value = null;
  showForm.value = false;
  transaction.value = null;
  tab.value = "Ringkasan";
  search.value = "";
}
function openBatch(b: Batch) {
  selected.value = b.id;
  page.value = "Batch";
  showForm.value = false;
  transaction.value = null;
  error.value = "";
}
async function createBatch() {
  error.value = "";
  if (!batchForm.origin.trim() || !batchForm.date) {
    error.value = "Lengkapi tanggal dan asal perjalanan.";
    return;
  }
  if (
    !products.value.length ||
    products.value.some(
      (p) =>
        !p.fish.trim() ||
        !p.size.trim() ||
        !new Decimal(p.weight || 0).isPositive() ||
        !new Decimal(p.price || 0).isPositive(),
    )
  ) {
    error.value =
      "Lengkapi jenis ikan, size, bobot, dan harga pada setiap produk.";
    return;
  }
  if (tripExpenses.value.some((e) => !new Decimal(e.price || 0).isPositive())) {
    error.value =
      "Isi jumlah setiap biaya perjalanan dengan nilai lebih dari nol.";
    return;
  }
  const batch: Batch = {
    id: pendingBatchId.value,
    code: `PI-${String(Math.max(18, ...batches.value.map((b) => Number(b.code.slice(3)))) + 1).padStart(4, "0")}`,
    ...batchForm,
    origin: batchForm.origin.trim(),
    destination: "",
    staff: "",
    closed: false,
    items: [
      ...products.value.map((p) => ({
        ...p,
        fish: p.fish.trim(),
        size: p.size.trim(),
        id: p.id,
        kind: "purchase" as const,
        date: batchForm.date,
        description: "",
      })),
      ...tripExpenses.value.map((e) => ({
        id: e.id,
        kind: "expense" as const,
        fish: e.category,
        size: "",
        weight: "0",
        price: e.price,
        description: e.description.trim(),
        date: batchForm.date,
      })),
    ],
  };
  if (await persist(batch)) {
    batches.value.unshift(batch);
    pendingBatchId.value = crypto.randomUUID();
    openBatch(batch);
    products.value = [newProduct()];
    tripExpenses.value = [];
    batchForm.origin = "";
    notify("Batch baru tersimpan di server.");
  }
}
async function saveSales() {
  if (!active.value || savingSales.value) return;
  error.value = '';
  if (!entry.date || !saleRows.value.length) { error.value = 'Isi tanggal dan minimal satu item penjualan.'; return; }
  for (const [index, row] of saleRows.value.entries()) {
    if (!safeDecimal(row.weight).isPositive() || !safeDecimal(row.price).isPositive() || !saleProducts.value.some(p => p.fish === row.fish && (!row.size || p.size === row.size))) {
      error.value = `Item ${index + 1}: pilih ikan dari pembelian, isi bobot dan harga lebih dari nol. Size opsional, tetapi harus sesuai pembelian jika dipilih.`;
      return;
    }
  }
  savingSales.value = true;
  try {
    const batch = JSON.parse(JSON.stringify(active.value)) as Batch;
    if (editingItemId.value) batch.items = batch.items.filter(i => i.id !== editingItemId.value);
    batch.items.push(...saleRows.value.map(row => ({ id: row.id, kind: 'sale' as const, fish: row.fish, size: row.size, weight: row.weight, price: row.price, date: entry.date, description: '' })));
    if (await persist(batch)) {
      batches.value = batches.value.map(b => b.id === batch.id ? batch : b);
      transaction.value = null; saleRows.value = [newSaleRow()];
      notify(editingItemId.value ? 'Perubahan penjualan tersimpan di server.' : 'Semua item penjualan tersimpan di server.');
      editingItemId.value = null;
    }
  } finally { savingSales.value = false; }
}
async function saveEntry() {
  if (!active.value || !transaction.value) return;
  error.value = "";
  if (
    !entry.date ||
    !entry.price ||
    !new Decimal(entry.price).isPositive() ||
    (transaction.value !== "expense" &&
      (!entry.fish.trim() ||
        (transaction.value === 'purchase' && !entry.size.trim()) ||
        !entry.weight ||
        !new Decimal(entry.weight).isPositive()))
  ) {
    error.value =
      "Isi tanggal, ikan, bobot, dan harga yang valid. Size wajib untuk pembelian, opsional untuk penjualan.";
    return;
  }
  if (
    transaction.value === "sale" &&
    !saleProducts.value.some(
      (p) => p.fish === entry.fish && (!entry.size || p.size === entry.size),
    )
  ) {
    error.value = "Pilih ikan dari pembelian batch ini. Jika mengisi size, gunakan size yang tersedia pada pembelian.";
    return;
  }
  const batch = JSON.parse(JSON.stringify(active.value)) as Batch;
  const previous = batch.items.find(i => i.id === editingItemId.value);
  if (editingItemId.value) batch.items = batch.items.filter(i => i.id !== editingItemId.value);
  batch.items.push({
    id: pendingItemId.value,
    kind: transaction.value,
    ...entry,
    weight: transaction.value === "expense" ? "0" : entry.weight,
  });
  if (previous?.kind === 'purchase' && (previous.fish !== entry.fish || previous.size !== entry.size)) {
    const affected = batch.items.filter(s => s.kind === 'sale' && s.fish === previous.fish && (!s.size || s.size === previous.size) && !batch.items.some(p => p.kind === 'purchase' && p.fish === s.fish && (!s.size || p.size === s.size)));
    if (affected.length) {
      if (!await confirmDialog.value?.confirm({ title: 'Sesuaikan penjualan terkait?', message: `${affected.length} penjualan terkait akan mengikuti koreksi nama/size pembelian ini.`, label: 'Simpan koreksi' })) return;
      for (const sale of affected) { sale.fish = entry.fish; if (sale.size) sale.size = entry.size; }
    }
  }
  if (!validSaleReferences(batch.items)) { error.value = 'Penjualan harus tetap memiliki pembelian dengan ikan dan size yang sesuai.'; return; }
  if (previous && previous.kind !== transaction.value) return;
  if (await persist(batch)) {
    batches.value = batches.value.map((b) => (b.id === batch.id ? batch : b));
    transaction.value = null;
    editingItemId.value = null;
    entry.weight = "";
    entry.price = "";
    entry.description = "";
    notify("Transaksi tersimpan di server.");
  }
}
function download() {
  const rows = [
    ["Batch", "Tanggal", "Asal", "Status", "Pendapatan", "Biaya", "Laba"],
    ...visible.value.map((b) => {
      const m = metrics(b.items);
      return [
        b.code,
        b.date,
        b.origin,
        b.closed ? "Selesai" : "Aktif",
        m.revenue.toString(),
        m.cost.toString(),
        m.profit.toString(),
      ];
    }),
  ];
  const url = URL.createObjectURL(
    new Blob(
      [
        "\uFEFF" +
          rows
            .map((row) =>
              row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","),
            )
            .join("\n"),
      ],
      { type: "text/csv;charset=utf-8;" },
    ),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "panen-iwak-ringkasan.csv";
  a.click();
  URL.revokeObjectURL(url);
  notify("Ringkasan CSV berhasil diunduh.");
}
const trend = computed(() => {
  const values = Array.from({ length: 7 }, () => ({ revenue: 0, cost: 0 }));
  for (const b of visible.value)
    for (const i of b.items) {
      const day = new Date(`${i.date}T12:00:00`).getDay();
      const v = Number(
        new Decimal(i.price).times(i.kind === "expense" ? 1 : i.weight),
      );
      const index = (day + 6) % 7;
      if (i.kind === "sale") values[index]!.revenue += v;
      else values[index]!.cost += v;
    }
  return values;
});
const chartMax = computed(
  () =>
    Math.max(1000000, ...trend.value.flatMap((v) => [v.revenue, v.cost])) * 1.2,
);
function chartPath(key: "revenue" | "cost") {
  return trend.value
    .map(
      (v, i) =>
        `${i ? "L" : "M"} ${60 + i * 170} ${225 - (v[key] / chartMax.value) * 190}`,
    )
    .join(" ");
}
const composition = computed(() => [
  { label: "Pembelian ikan", amount: totals.value.purchases, color: "#3777e8" },
  { label: "Biaya perjalanan", amount: totals.value.expense, color: "#a9c6f6" },
]);
onMounted(async () => {
  online.value = navigator.onLine;
  window.addEventListener("online", updateOnline);
  window.addEventListener("offline", updateOnline);
  try { const result = await $fetch<{ user: Profile }>('/api/auth/me'); await authenticated(result.user); }
  catch { currentUser.value = null; }
  finally { authChecked.value = true; }
});
function updateOnline() {
  online.value = navigator.onLine;
}
onBeforeUnmount(() => {
  window.removeEventListener("online", updateOnline);
  window.removeEventListener("offline", updateOnline);
  clearTimeout(toastTimer);
});
</script>

<template>
  <div v-if="!authChecked" class="auth-loading" role="status">Memeriksa sesi…</div>
  <LoginScreen v-else-if="!currentUser" @authenticated="authenticated" />
  <div v-else class="application">
    <header class="topbar">
      <button class="brand" @click="go('Dashboard')">
        <span class="brand-mark"
          ><IconFish :size="26" stroke-width="1.7" /></span
        >panen<span class="brand-light">iwak</span
        ><span class="brand-dot">.</span>
      </button>
      <div class="header-right">
        <span class="connection" :class="{ offline: !online }"
          ><component :is="online ? IconWifi : IconWifiOff" :size="15" />{{
            online ? "Online" : "Offline"
          }}</span
        ><button
          class="icon-button notification"
          aria-label="Lihat pemberitahuan"
          @click="notice = !notice"
        >
          <IconBell :size="20" /><i></i></button
        ><span class="header-divider"></span>
        <div class="profile">
          <span class="avatar">{{ currentUser.name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase() }}</span
          ><span
            ><strong>{{ currentUser.name }}</strong
            ><small>@{{ currentUser.username }} · {{ currentUser.role === 'admin' ? 'Admin' : 'Staf lapangan' }}</small></span
          >
        </div>
        <button class="secondary" :disabled="signingOut" @click="logout">{{ signingOut ? 'Keluar…' : 'Keluar' }}</button>
      </div>
      <div v-if="notice" class="notification-panel">
        <strong>Pusat aktivitas</strong>
        <p>
          Transaksi disimpan ke server dengan identitas @{{ currentUser.username }}.
          Saat offline, penyimpanan ke server belum tersedia. Jangan tutup formulir sebelum tersimpan.
        </p>
        <button class="text-button" @click="notice = false">
          Mengerti <IconCheck :size="16" />
        </button>
      </div>
    </header>
    <nav class="main-nav" aria-label="Navigasi utama">
      <button
        v-for="item in navigation"
        :key="item.name"
        :class="{ active: page === item.name }"
        @click="go(item.name)"
      >
        <component
          :is="item.icon"
          :size="19"
          stroke-width="1.65"
        />{{ item.name
        }}<span v-if="item.name === 'Batch'" class="nav-count">{{
          batches.length
        }}</span></button
      ><span class="nav-caption">Catatan rapi. Hasil pasti.</span>
    </nav>

    <main>
      <div v-if="workspaceError" class="form-error" role="alert">{{ workspaceError }} <button class="secondary" @click="loadWorkspace">Coba muat ulang</button></div>
      <p v-if="!online" class="form-error">Anda offline. Data pada layar belum tentu terbaru; perubahan belum bisa disimpan ke server. Jangan tutup formulir yang belum tersimpan.</p>
      <template v-if="!active && !showForm">
        <div class="page-heading">
          <div>
            <div class="breadcrumb">Ruang usaha <span>/</span> {{ page }}</div>
            <h1>
              {{
                page === "Dashboard"
                  ? "Ringkasan usaha"
                  : page === "Batch"
                    ? "Perjalanan & batch"
                    : page === "Laporan"
                      ? "Laporan usaha"
                      : page === "Produk"
                        ? showProductForm
                          ? "Tambah ikan baru"
                          : "Produk ikan"
                        : page === "Log"
                          ? "Log aktivitas"
                          : "Tim Panen Iwak"
              }}
            </h1>
            <p>
              {{
                page === "Dashboard"
                  ? "Setiap perjalanan, tercatat. Setiap hasil, terlihat."
                  : page === "Batch"
                    ? "Kelola perjalanan dari pembelian hingga penjualan terakhir."
                    : page === "Laporan"
                      ? "Lihat hasil perjalanan dan unduh ringkasan usaha Anda."
                      : page === "Produk"
                        ? "Kelola nama ikan dan size untuk mempermudah pencatatan pembelian."
                        : page === "Log"
                          ? "Riwayat perubahan dan pengguna yang melakukan tindakan."
                          : "Orang-orang di balik setiap perjalanan."
              }}
            </p>
          </div>
          <div class="heading-actions">
            <label
              v-if="page === 'Dashboard' || page === 'Batch'"
              class="period"
              ><IconCalendar :size="17" /><select
                v-model="period"
                aria-label="Periode laporan"
              >
                <option>Bulan ini</option>
                <option>Minggu ini</option></select
              ><IconChevronDown :size="14" /></label
            ><button
              v-if="page === 'Dashboard' || page === 'Laporan'"
              class="icon-button export"
              aria-label="Unduh laporan CSV"
              @click="page === 'Laporan' ? exportReport() : download()"
            >
              <IconDownload :size="19" /></button
            ><button
              v-if="page !== 'Pengguna' && page !== 'Produk' && page !== 'Log'"
              class="primary"
              @click="
                showForm = true;
                error = '';
              "
            >
              <IconPlus :size="18" /> Batch baru
            </button>
          </div>
        </div>

        <template v-if="page === 'Dashboard'">
          <div class="section-tabs">
            <button
              v-for="t in ['Ringkasan']"
              :key="t"
              :class="{ selected: tab === t }"
              @click="tab = t"
            >
              {{ t }}</button
            ><span class="local-caption"
               ><span class="tiny-dot"></span> Data server · @{{ currentUser.username }}</span
            >
          </div>
          <div v-if="!ready" class="metrics loading">
            <div v-for="i in 4" :key="i"><span></span><b></b></div>
          </div>
          <div v-else class="metrics">
            <div class="metric">
              <div class="metric-label">
                Total pendapatan <IconArrowUpRight :size="17" />
              </div>
              <strong>{{ idr(totals.revenue) }}</strong>
              <div class="metric-foot">
                <span class="green"
                  ><IconArrowUpRight :size="14" /> Penjualan tercatat</span
                ><span>{{ kg(totals.sold) }} kg terjual</span>
              </div>
            </div>
            <div class="metric">
              <div class="metric-label">
                Total biaya <IconReceipt :size="17" />
              </div>
              <strong>{{ idr(totals.cost) }}</strong>
              <div class="metric-foot">
                <span>Pembelian + perjalanan</span
                ><span>{{ visible.length }} batch</span>
              </div>
            </div>
            <div class="metric">
              <div class="metric-label">
                Laba operasional berjalan<IconChartBar :size="17" />
              </div>
              <strong>{{ idr(totals.profit) }}</strong>
              <div class="metric-foot">
                <span :class="totals.profit.isNegative() ? 'red' : 'green'"
                  ><IconArrowUpRight :size="14" />Margin
                  {{
                    totals.margin === null ? "—" : kg(totals.margin) + "%"
                  }}</span
                ><span class="estimate"
                  >Berjalan</span
                >
              </div>
            </div>
            <div class="metric">
              <div class="metric-label">
                Selisih bobot <IconPackage :size="17" />
              </div>
              <strong
                >{{ totals.difference.isPositive() ? "+" : ""
                }}{{ kg(totals.difference) }}<em> kg</em></strong
              >
              <div class="metric-foot">
                <span>{{
                  totals.difference.isNegative()
                    ? "Penjualan masih berjalan"
                    : "Tonjolan bobot tercatat"
                }}</span
                ><span class="weight-caption"
                  >{{ kg(totals.bought) }} kg dibeli</span
                >
              </div>
            </div>
          </div>

          <section class="chart-section">
            <div class="section-heading">
              <div>
                <h2>Arus usaha</h2>
                <p>Pendapatan dan biaya dari batch pada periode terpilih</p>
              </div>
              <div class="legend">
                <span><i class="blue"></i>Pendapatan</span
                ><span><i class="orange"></i>Biaya</span
                ><button
                  class="icon-button"
                  aria-label="Unduh data grafik"
                  @click="download"
                >
                  <IconDownload :size="17" />
                </button>
              </div>
            </div>
            <div class="chart">
              <div class="y-labels">
                <span v-for="ratio in [1, 0.75, 0.5, 0.25, 0]" :key="ratio"
                  >{{ Math.round((chartMax * ratio) / 1000000) }} jt</span
                >
              </div>
              <svg
                viewBox="0 0 1140 260"
                preserveAspectRatio="none"
                role="img"
                aria-label="Grafik pendapatan dan biaya per hari"
              >
                <defs>
                  <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#3777e8" stop-opacity=".10" />
                    <stop offset="100%" stop-color="#3777e8" stop-opacity="0" />
                  </linearGradient>
                </defs>
                <line
                  v-for="y in [35, 82.5, 130, 177.5, 225]"
                  :key="y"
                  x1="0"
                  x2="1140"
                  :y1="y"
                  :y2="y"
                  stroke="#edf0f3"
                />
                <path
                  :d="`${chartPath('revenue')} L 1080 225 L 60 225 Z`"
                  fill="url(#area)"
                />
                <path
                  :d="chartPath('revenue')"
                  fill="none"
                  stroke="#3777e8"
                  stroke-width="2.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  vector-effect="non-scaling-stroke"
                />
                <path
                  :d="chartPath('cost')"
                  fill="none"
                  stroke="#e5a167"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  vector-effect="non-scaling-stroke"
                />
                <g
                  v-for="(day, i) in trend"
                  :key="i"
                  @mouseenter="hoverDay = i"
                  @mouseleave="hoverDay = null"
                >
                  <rect
                    :x="i * 163"
                    y="0"
                    width="163"
                    height="260"
                    fill="transparent"
                  />
                  <circle
                    :cx="60 + i * 170"
                    :cy="225 - (day.revenue / chartMax) * 190"
                    :r="hoverDay === i ? 6 : 3"
                    fill="#3777e8"
                    stroke="white"
                    stroke-width="2"
                  />
                </g>
              </svg>
              <div
                v-if="hoverDay !== null"
                class="chart-tooltip"
                :style="{ left: `${Math.min(78, 8 + hoverDay * 13)}%` }"
              >
                <strong>{{
                  [
                    "Senin",
                    "Selasa",
                    "Rabu",
                    "Kamis",
                    "Jumat",
                    "Sabtu",
                    "Minggu",
                  ][hoverDay]
                }}</strong
                ><span
                  >Pendapatan <b>{{ idr(trend[hoverDay]!.revenue) }}</b></span
                ><span
                  >Biaya <b>{{ idr(trend[hoverDay]!.cost) }}</b></span
                >
              </div>
              <div class="x-labels">
                <span
                  v-for="day in [
                    'Sen',
                    'Sel',
                    'Rab',
                    'Kam',
                    'Jum',
                    'Sab',
                    'Min',
                  ]"
                  :key="day"
                  >{{ day }}</span
                >
              </div>
            </div>
          </section>

          <div class="lower-grid">
            <section class="recent-section">
              <div class="section-heading">
                <div>
                  <h2>
                    Perjalanan terbaru
                    <span class="count">{{ visible.length }}</span>
                  </h2>
                  <p>Satu batch, satu cerita perjalanan.</p>
                </div>
                <button class="text-button" @click="go('Batch')">
                  Semua batch <IconArrowRight :size="16" />
                </button>
              </div>
              <div class="mini-table">
                <div class="table-head">
                  <span>Batch / rute</span><span>Status</span
                  ><span>Pendapatan</span><span></span>
                </div>
                <button
                  v-for="b in visible.slice(0, 3)"
                  :key="b.id"
                  class="mini-row"
                  @click="openBatch(b)"
                >
                  <span class="route-cell"
                    ><span class="route-icon"
                      ><IconTruck :size="21" stroke-width="1.5" /></span
                    ><span
                      ><strong>{{ b.origin }}</strong
                      ><small
                        >{{ b.code }} <i>·</i> {{ dateLabel(b.date) }}</small
                      ></span
                    ></span
                  ><span
                    ><span
                      class="badge"
                      :class="b.closed ? 'complete' : 'in-progress'"
                      ><i></i>{{ b.closed ? "Selesai" : "Aktif" }}</span
                    ></span
                  ><strong class="row-money">{{
                    idr(metrics(b.items).revenue)
                  }}</strong
                  ><IconArrowUpRight :size="17" class="row-arrow" />
                </button>
                <div v-if="!visible.length" class="empty">
                  Belum ada batch pada periode ini.
                </div>
              </div>
            </section>
            <section class="cost-section">
              <div class="section-heading">
                <div>
                  <h2>Komposisi biaya</h2>
                  <p>Ke mana modal perjalanan dialokasikan.</p>
                </div>
                <IconChartBar :size="19" class="muted" />
              </div>
              <div class="cost-total">
                <span>Total biaya tercatat</span
                ><strong>{{ idr(totals.cost) }}</strong>
              </div>
              <div class="cost-bar">
                <span
                  v-for="c in composition"
                  :key="c.label"
                  :style="{
                    flex: totals.cost.isZero()
                      ? 1
                      : c.amount.div(totals.cost).toNumber(),
                    background: c.color,
                  }"
                ></span>
              </div>
              <div class="cost-lines">
                <div v-for="c in composition" :key="c.label">
                  <span
                    ><i :style="{ background: c.color }"></i>{{ c.label }}</span
                  ><strong>{{ idr(c.amount) }}</strong
                  ><small
                    >{{
                      totals.cost.isZero()
                        ? 0
                        : c.amount.div(totals.cost).times(100).toFixed(1)
                    }}%</small
                  >
                </div>
              </div>
              <div class="cost-note">
                <IconShieldCheck :size="16" /> Perhitungan menggunakan seluruh
                transaksi tercatat.
              </div>
            </section>
          </div>
        </template>

        <section v-if="page === 'Batch'" class="batch-list">
          <div class="list-toolbar">
            <h2>
              Semua batch <span class="count">{{ visible.length }}</span>
            </h2>
            <label class="search"
              ><IconSearch :size="18" /><input
                v-model="search"
                placeholder="Cari batch atau asal…"
            /></label>
          </div>
          <div class="full-table">
            <div class="full-table-head">
              <span>Batch & asal</span><span>Kode batch</span
              ><span>Tanggal</span><span>Pendapatan</span><span>Status</span>
            </div>
            <button
              v-for="b in visible"
              :key="b.id"
              class="full-table-row"
              @click="openBatch(b)"
            >
              <span class="route-cell"
                ><span class="route-icon"><IconTruck :size="21" /></span
                ><span
                  ><strong>{{ b.origin }}</strong
                  ><small>{{ b.code }}</small></span
                ></span
              ><span>{{ b.code }}</span
              ><span>{{ dateLabel(b.date) }}</span
              ><strong>{{ idr(metrics(b.items).revenue) }}</strong
              ><span
                ><span
                  class="badge"
                  :class="b.closed ? 'complete' : 'in-progress'"
                  ><i></i>{{ b.closed ? "Selesai" : "Aktif" }}</span
                ></span
              >
            </button>
          </div>
          <div v-if="!visible.length" class="empty">
            Tidak ada batch ditemukan. Buat batch baru untuk memulai.
          </div>
        </section>
        <section v-if="page === 'Laporan'" class="reports-page">
          <div class="report-filters form-grid">
            <label
              >Dari tanggal<input v-model="reportStart" type="date" /></label
            ><label
              >Sampai tanggal<input
                v-model="reportEnd"
                type="date"
                :min="reportStart || undefined" /></label
            ><label
              >Batch<select v-model="reportBatch">
                <option value="">Semua batch</option>
                <option v-for="b in batches" :key="b.id" :value="b.id">
                  {{ b.code }} · {{ b.origin }}
                </option>
              </select></label
            >
          </div>
          <p
            v-if="reportStart && reportEnd && reportStart > reportEnd"
            class="form-error"
            role="alert"
          >
            Tanggal akhir harus sama atau setelah tanggal awal.
          </p>
          <div class="report-summary">
            <div>
              <span>Batch dalam laporan</span
              ><strong>{{ reportRows.length }}</strong
              ><small
                >Dihitung dari transaksi saat ini</small
              >
            </div>
            <div>
              <span>Total pendapatan</span
              ><strong>{{ idr(reportTotals.revenue) }}</strong
              ><small>{{ kg(reportTotals.sold) }} kg terjual</small>
            </div>
            <div>
              <span>Total modal</span
              ><strong>{{ idr(reportTotals.cost) }}</strong
              ><small>Pembelian + biaya perjalanan</small>
            </div>
            <div>
              <span>Laba gabungan</span
              ><strong>{{ idr(reportTotals.profit) }}</strong
               ><small>Diperbarui setiap ada transaksi</small>
            </div>
          </div>
          <div class="section-heading report-heading">
            <div>
              <h2>Rekap keuangan per batch</h2>
              <p>
                Pilih rincian untuk melihat seluruh transaksi dan perhitungan
                bobot.
              </p>
            </div>
            <button class="secondary" @click="exportReport">
              <IconDownload :size="17" /> Ekspor detail CSV
            </button>
          </div>
          <div
            class="report-table-scroll"
            tabindex="0"
            aria-label="Tabel laporan, geser untuk melihat semua kolom"
          >
            <table class="report-table">
              <thead>
                <tr>
                  <th>Batch / asal</th>
                  <th>Pembelian</th>
                  <th>Perjalanan</th>
                  <th>Total biaya</th>
                  <th>HPP umum / kg beli</th>
                  <th>HPP efektif / kg terjual</th>
                  <th>Pendapatan</th>
                  <th>Laba</th>
                  <th>Margin</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="b in reportRows" :key="b.id">
                  <td>
                    <strong>{{ b.code }} · {{ b.origin }}</strong
                    ><small
                      >{{ dateLabel(b.date) }} ·
                      Perhitungan berjalan</small
                    >
                  </td>
                  <td>{{ idr(metrics(b.items).purchases) }}</td>
                  <td>{{ idr(metrics(b.items).expense) }}</td>
                  <td>{{ idr(metrics(b.items).cost) }}</td>
                  <td>{{ metrics(b.items).bought.isZero() ? '—' : idr(metrics(b.items).cost.div(metrics(b.items).bought)) }}</td>
                  <td>{{ metrics(b.items).hpp === null ? '—' : idr(metrics(b.items).hpp!) }}</td>
                  <td>{{ idr(metrics(b.items).revenue) }}</td>
                  <td
                    :class="
                      metrics(b.items).profit.isNegative() ? 'red' : 'green'
                    "
                  >
                    {{ idr(metrics(b.items).profit) }}
                  </td>
                  <td>
                    {{
                      metrics(b.items).margin === null
                        ? "—"
                        : kg(metrics(b.items).margin!) + "%"
                    }}
                  </td>
                  <td>
                    <button
                      class="text-button"
                      @click="
                        expandedReport = expandedReport === b.id ? null : b.id
                      "
                    >
                      {{ expandedReport === b.id ? "Tutup rincian" : "Rincian"
                      }}<IconChevronDown :size="14" />
                    </button>
                  </td>
                </tr>
              </tbody>
              <tfoot v-if="reportRows.length">
                <tr>
                  <td>Total</td>
                  <td>{{ idr(reportTotals.purchases) }}</td>
                  <td>{{ idr(reportTotals.expense) }}</td>
                  <td>{{ idr(reportTotals.cost) }}</td>
                  <td>{{ reportTotals.bought.isZero() ? '—' : idr(reportTotals.cost.div(reportTotals.bought)) }}</td>
                  <td>{{ reportTotals.hpp === null ? '—' : idr(reportTotals.hpp) }}</td>
                  <td>{{ idr(reportTotals.revenue) }}</td>
                  <td>{{ idr(reportTotals.profit) }}</td>
                  <td>
                    {{
                      reportTotals.margin === null
                        ? "—"
                        : kg(reportTotals.margin) + "%"
                    }}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div v-if="!reportRows.length" class="empty">
            Tidak ada batch yang sesuai dengan filter laporan.
          </div>
          <template v-for="b in reportRows" :key="b.id"
            ><section v-if="expandedReport === b.id" class="report-detail">
              <div class="section-heading">
                <div>
                  <h2>Rincian {{ b.code }} · {{ b.origin }}</h2>
                  <p>
                    Perhitungan langsung dari transaksi saat ini
                  </p>
                </div>
                <button class="text-button" @click="openBatch(b)">
                  Buka batch <IconArrowUpRight :size="16" />
                </button>
              </div>
              <div class="report-weight">
                <div>
                  <span>Bobot beli</span
                  ><strong>{{ kg(metrics(b.items).bought) }} kg</strong>
                </div>
                <div>
                  <span>Bobot terjual</span
                  ><strong>{{ kg(metrics(b.items).sold) }} kg</strong>
                </div>
                <div>
                  <span>Selisih bobot</span
                  ><strong>{{ kg(metrics(b.items).difference) }} kg</strong>
                </div>
                <div>
                  <span>HPP efektif per kg terjual</span
                  ><strong>{{
                    metrics(b.items).hpp
                      ? idr(metrics(b.items).hpp!)
                      : "Belum tersedia"
                  }}</strong>
                </div>
              </div>
              <div
                class="report-table-scroll"
                tabindex="0"
                aria-label="Rincian transaksi batch"
              >
                <table class="report-table">
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Jenis</th>
                      <th>Ikan / kategori</th>
                      <th>Size</th>
                      <th>Bobot</th>
                      <th>Harga / jumlah biaya</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in b.items" :key="item.id">
                      <td>{{ dateLabel(item.date) }}</td>
                      <td>
                        {{
                          item.kind === "purchase"
                            ? "Pembelian"
                            : item.kind === "sale"
                              ? "Penjualan"
                              : "Biaya perjalanan"
                        }}
                      </td>
                      <td>
                        {{ item.fish || "Operasional"
                        }}<small v-if="item.description">{{
                          item.description
                        }}</small>
                      </td>
                      <td>{{ item.kind === "expense" ? "—" : item.size || 'Campur semua size' }}</td>
                      <td>
                        {{
                          item.kind === "expense"
                            ? "—"
                            : kg(item.weight) + " kg"
                        }}
                      </td>
                      <td>{{ idr(item.price) }}</td>
                      <td>
                        {{
                          idr(
                            new Decimal(item.price).times(
                              item.kind === "expense" ? 1 : item.weight,
                            ),
                          )
                        }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section></template
          >
          <p class="report-disclaimer">
            Semua nilai diperbarui berdasarkan transaksi tersimpan di server.
            HPP efektif memakai bobot terjual. Selisih positif merupakan
            tonjolan bobot, bukan pendapatan tambahan.
          </p>
        </section>
        <section v-if="page === 'Log'" class="activity-page">
          <div class="list-toolbar">
            <h2>
              Riwayat aktivitas
              <span class="count">{{ filteredLogs.length }}</span>
            </h2>
            <label class="search"
              ><IconSearch :size="18" /><input
                v-model="logSearch"
                placeholder="Cari aktivitas atau batch…"
                aria-label="Cari log aktivitas"
            /></label>
          </div>
          <p class="log-notice">
            Menampilkan maksimal 500 aktivitas terbaru yang dapat Anda akses. Username pelaku diverifikasi server. Riwayat lokal lama tidak diklaim sebagai aktivitas akun.
          </p>
          <div v-for="log in filteredLogs" :key="log.id" class="activity-row">
            <span class="route-icon"><IconReceipt :size="19" /></span>
            <div class="activity-content">
              <strong>{{ log.action }}</strong>
              <p>{{ log.detail }}</p>
              <small>@{{ log.username }} · {{ logTime(log.timestamp) }}</small>
              <details v-if="log.oldValues || log.newValues" class="audit-changes"><summary>Lihat data sebelum / sesudah</summary><div v-if="log.oldValues"><strong>Sebelum</strong><pre>{{ JSON.stringify(log.oldValues, null, 2) }}</pre></div><div v-if="log.newValues"><strong>Sesudah</strong><pre>{{ JSON.stringify(log.newValues, null, 2) }}</pre></div></details>
            </div>
            <button
              v-if="log.batchId && batches.some((b) => b.id === log.batchId)"
              class="text-button"
              @click="openBatch(batches.find((b) => b.id === log.batchId)!)"
            >
              Buka batch <IconArrowUpRight :size="15" />
            </button>
          </div>
          <div v-if="!filteredLogs.length" class="empty">
            <IconReceipt :size="30" />
            <h2>
              {{
                logSearch
                  ? "Tidak ada aktivitas yang cocok"
                  : "Belum ada aktivitas tercatat"
              }}
            </h2>
            <p>
              Buat batch, tambahkan transaksi, atau simpan produk untuk mulai
              mencatat aktivitas.
            </p>
          </div>
        </section>
        <section v-if="page === 'Produk'" class="catalog-page">
          <template v-if="showProductForm">
            <button
              class="back"
              @click="
                showProductForm = false;
                catalogError = '';
              "
            >
              <IconArrowLeft :size="17" /> Kembali ke daftar produk
            </button>
            <form
              class="entry-form catalog-form"
              @submit.prevent="addCatalogProduct"
            >
              <h2>Tambah produk ikan</h2>
              <p>
                Setiap produk merupakan pasangan nama ikan dan size. Satu ikan
                dapat memiliki beberapa size.
              </p>
              <div class="form-grid">
                <label
                  >Nama ikan<input
                    v-model="catalogForm.fish"
                    placeholder="Contoh: Nila"
                    required /></label
                ><label
                  >Size<input
                    v-model="catalogForm.size"
                    placeholder="Contoh: 8, 10–12, atau Besar"
                    required
                /></label>
              </div>
              <p v-if="catalogError" class="form-error" role="alert">
                {{ catalogError }}
              </p>
              <div class="form-actions">
                <button
                  type="button"
                  class="secondary"
                  @click="
                    showProductForm = false;
                    catalogError = '';
                  "
                >
                  Batal</button
                ><button class="primary" :disabled="!ready || savingProduct">
                   <IconPlus :size="17" /> {{ savingProduct ? 'Menyimpan…' : editingProductId ? 'Simpan perubahan' : 'Simpan produk' }}
                </button>
              </div>
            </form>
          </template>
          <section v-else class="catalog-list">
            <p v-if="catalogError" class="form-error" role="alert">{{ catalogError }}</p>
            <button class="secondary" :disabled="savingProduct" @click="managingProducts = !managingProducts; catalogError = ''">{{ managingProducts ? 'Selesai kelola produk' : 'Kelola produk' }}</button>
            <div class="list-toolbar">
              <h2>
                Daftar produk <span class="count">{{ catalog.length }}</span>
              </h2>
              <button
                class="primary"
                @click="
                  showProductForm = true;
                  editingProductId = null;
                  catalogForm.fish = ''; catalogForm.size = '';
                  catalogError = '';
                "
              >
                <IconPlus :size="17" /> Tambah ikan baru
              </button>
            </div>
            <div class="catalog-row catalog-head">
              <span>Nama ikan</span><span>Size</span>
            </div>
            <div v-for="p in catalog" :key="p.id" class="catalog-row">
              <strong>{{ p.fish }}</strong
              ><span>{{ p.size }}</span>
              <div v-if="managingProducts" class="transaction-actions"><button class="secondary" :disabled="savingProduct" @click="editCatalogProduct(p)">Edit</button><button class="secondary" :disabled="savingProduct" @click="deleteCatalogProduct(p)">Hapus</button></div>
            </div>
            <div v-if="!catalog.length" class="empty">
              <IconFish :size="30" />
              <h2>Belum ada produk ikan</h2>
              <p>
                Tambahkan nama ikan dan size untuk digunakan saat mencatat
                pembelian.
              </p>
            </div>
          </section>
        </section>
        <template v-if="page === 'Pengguna' && currentUser.role === 'admin'"><UsersPanel :current-user="currentUser" @changed="refreshActivity" /><LegacyImport @imported="loadWorkspace" /></template>
      </template>

      <template v-if="showForm"
        ><button class="back" @click="showForm = false">
          <IconArrowLeft :size="17" /> Kembali ke {{ page.toLowerCase() }}
        </button>
        <div class="page-heading">
          <div>
            <div class="breadcrumb">Perjalanan <span>/</span> Batch baru</div>
            <h1>Mulai perjalanan baru</h1>
            <p>
              Isi tanggal dan asal, lalu catat seluruh produk yang dibeli dalam
              satu batch.
            </p>
          </div>
        </div>
        <form class="entry-form batch-create" @submit.prevent="createBatch">
          <h2>Informasi perjalanan</h2>
          <div class="form-grid">
            <label
              >Tanggal perjalanan<input
                v-model="batchForm.date"
                type="date"
                required /></label
            ><label
              >Asal perjalanan<input
                v-model="batchForm.origin"
                placeholder="Contoh: Lamongan"
                required
            /></label>
          </div>
          <section class="hpp-card" aria-label="Estimasi HPP batch">
            <div class="hpp-overview">
              <div>
                <span class="hpp-label"
                  >HPP estimasi per kg
                  <span class="estimate">Estimasi</span></span
                ><strong class="hpp-value"
                  >{{ draftHpp === null ? "—" : idr(draftHpp)
                  }}<small v-if="draftHpp !== null"> / kg</small></strong
                >
                <p>
                  {{
                    draftHpp === null
                      ? "Isi bobot dan harga produk untuk melihat estimasi HPP."
                      : "Otomatis diperbarui dari pembelian dan biaya perjalanan."
                  }}
                </p>
              </div>
              <span class="hpp-icon"
                ><IconReceipt :size="24" stroke-width="1.5"
              /></span>
            </div>
            <details class="hpp-details" open>
              <summary>
                Rincian pembentuk HPP <IconChevronDown :size="16" />
              </summary>
              <div class="hpp-breakdown">
                <div class="hpp-group-title">Pembelian ikan</div>
                <div
                  v-for="(product, index) in products"
                  :key="product.key"
                  class="hpp-line"
                >
                  <div>
                    <strong
                      >{{ product.fish || `Produk ${index + 1}`
                      }}<span v-if="product.size">
                        · Size {{ product.size }}</span
                      ></strong
                    ><small
                      >{{ kg(product.weight || 0) }} kg ×
                      {{ idr(product.price || 0) }} / kg</small
                    >
                  </div>
                  <strong>{{
                    idr(
                      new Decimal(product.weight || 0).times(
                        product.price || 0,
                      ),
                    )
                  }}</strong>
                </div>
                <div class="hpp-line hpp-subtotal">
                  <span>Total pembelian</span
                  ><strong>{{ idr(draftTotal) }}</strong>
                </div>
                <div class="hpp-group-title">Biaya perjalanan</div>
                <div
                  v-for="(expense, index) in tripExpenses"
                  :key="index"
                  class="hpp-line"
                >
                  <div>
                    <strong>{{ expense.category }}</strong
                    ><small v-if="expense.description">{{
                      expense.description
                    }}</small>
                  </div>
                  <strong>{{ idr(expense.price || 0) }}</strong>
                </div>
                <p v-if="!tripExpenses.length" class="hpp-empty">
                  Belum ada biaya perjalanan. Tambahkan tol, BBM, es, atau biaya
                  lainnya di bawah.
                </p>
                <div class="hpp-line hpp-subtotal">
                  <span>Total biaya perjalanan</span
                  ><strong>{{ idr(draftExpenses) }}</strong>
                </div>
                <div class="hpp-calculation">
                  <div>
                    <span>Total modal batch</span
                    ><strong>{{ idr(draftTotal.plus(draftExpenses)) }}</strong>
                  </div>
                  <div>
                    <span>Total bobot beli</span
                    ><strong>{{ kg(draftWeight) }} kg</strong>
                  </div>
                  <div class="hpp-result">
                    <span>Modal ÷ bobot beli</span
                    ><strong>{{
                      draftHpp === null ? "—" : `${idr(draftHpp)} / kg`
                    }}</strong>
                  </div>
                </div>
              </div>
            </details>
            <section class="product-hpps">
              <h2>HPP estimasi per produk</h2>
              <p>
                Biaya perjalanan dialokasikan sesuai proporsi bobot beli. Ikan
                dan size yang sama digabung.
              </p>
              <div
                v-for="row in productHpps"
                :key="JSON.stringify([row.fish, row.size])"
                class="product-hpp-row"
              >
                <div class="product-hpp-title">
                  <strong>{{ row.fish }} · Size {{ row.size }}</strong
                  ><small>{{ kg(row.weight) }} kg</small>
                </div>
                <div class="product-hpp-amount">
                  {{
                    row.hpp === null
                      ? "Lengkapi bobot dan harga"
                      : idr(row.hpp)
                  }}<small v-if="row.hpp !== null"> / kg</small>
                </div>
                <div class="product-hpp-detail">
                  <span>Harga beli rata-rata / kg</span
                  ><strong>{{
                    row.purchasePerKg === null ? "—" : idr(row.purchasePerKg)
                  }}</strong>
                </div>
                <div class="product-hpp-detail">
                  <span>Biaya perjalanan / kg</span
                  ><strong>{{
                    row.expensePerKg === null ? "—" : idr(row.expensePerKg)
                  }}</strong>
                </div>
                <div class="product-hpp-detail">
                  <span>Alokasi biaya produk</span
                  ><strong>{{ idr(row.allocation) }}</strong>
                </div>
              </div>
              <p v-if="!productHpps.length" class="hpp-empty">
                Pilih ikan dan size untuk melihat rincian HPP per produk.
              </p>
            </section>
            <p class="hpp-note">
              <IconShieldCheck :size="15" /> HPP berbasis bobot beli selalu
              diperbarui. HPP efektif berbasis bobot terjual tersedia di detail
              batch.
            </p>
          </section>
          <section class="draft-section">
            <div class="section-heading">
              <div>
                <h2>Produk yang dibeli</h2>
                <p>
                  Tambahkan kartu untuk setiap jenis ikan atau size yang
                  berbeda.
                </p>
              </div>
              <span class="count">{{ products.length }} produk</span>
            </div>
            <article
              v-for="(product, index) in products"
              :key="product.key"
              class="product-card"
            >
              <div class="section-heading">
                <h2><IconFish :size="18" /> Produk {{ index + 1 }}</h2>
                <button
                  v-if="products.length > 1"
                  type="button"
                  class="icon-button"
                  :aria-label="`Hapus produk ${index + 1}`"
                  @click="products.splice(index, 1)"
                >
                  <IconX :size="16" />
                </button>
              </div>
              <div class="form-grid">
                <ProductPicker
                  v-model:fish="product.fish"
                  v-model:size="product.size"
                  :options="catalog"
                  allow-other
                />
                <label
                  >Bobot (kg)<input
                    v-model="product.weight"
                    type="number"
                    inputmode="decimal"
                    min="0.001"
                    step="0.001"
                    placeholder="0"
                    required
                /></label>
                <label
                  >Harga beli per kg (Rp)<MoneyInput
                    v-model="product.price"
                    required
                /></label>
              </div>
              <div class="product-subtotal">
                <span>Subtotal produk</span
                ><strong>{{
                  idr(
                    new Decimal(product.weight || 0).times(product.price || 0),
                  )
                }}</strong>
              </div>
            </article>
            <button
              type="button"
              class="add-product"
              @click="products.push(newProduct())"
            >
              <IconPlus :size="18" /> Tambah produk
            </button>
          </section>
          <section class="draft-section">
            <div class="section-heading">
              <div>
                <h2>Biaya perjalanan <span class="optional">Opsional</span></h2>
                <p>Catat BBM, tol, es, atau biaya lainnya jika sudah ada.</p>
              </div>
            </div>
            <article
              v-for="(expense, index) in tripExpenses"
              :key="index"
              class="product-card"
            >
              <div class="section-heading">
                <h2>Biaya {{ index + 1 }}</h2>
                <button
                  type="button"
                  class="icon-button"
                  :aria-label="`Hapus biaya ${index + 1}`"
                  @click="tripExpenses.splice(index, 1)"
                >
                  <IconX :size="16" />
                </button>
              </div>
              <div class="form-grid">
                <label
                  >Kategori<select v-model="expense.category">
                    <option>BBM</option>
                    <option>Tol</option>
                    <option>Es</option>
                    <option>Makan</option>
                    <option>Parkir</option>
                    <option>Lainnya</option>
                  </select></label
                ><label
                  >Jumlah (Rp)<MoneyInput
                    v-model="expense.price"
                    required /></label
                ><label class="full-field"
                  >Keterangan (opsional)<input
                    v-model="expense.description"
                    placeholder="Contoh: BBM perjalanan dari Lamongan"
                /></label>
              </div>
            </article>
            <button
              type="button"
              class="add-product"
              @click="
                tripExpenses.push(newExpense())
              "
            >
              <IconPlus :size="18" /> Tambah biaya
            </button>
          </section>
          <div class="draft-summary">
            <div>
              <span>Total pembelian · {{ products.length }} produk</span
              ><strong>{{ idr(draftTotal) }}</strong>
            </div>
            <div>
              <span>Biaya perjalanan</span
              ><strong>{{ idr(draftExpenses) }}</strong>
            </div>
            <div class="draft-grand-total">
              <span>Total modal batch</span
              ><strong>{{ idr(draftTotal.plus(draftExpenses)) }}</strong>
            </div>
          </div>
          <p v-if="error" class="form-error" role="alert">{{ error }}</p>
          <div class="form-actions">
            <button type="button" class="secondary" @click="showForm = false">
              Batal</button
            ><button class="primary">
              <IconCheck :size="17" /> Simpan batch & pembelian
            </button>
          </div>
        </form></template
      >

      <template v-if="active"
        ><button
          class="back"
          @click="
            if (transaction) {
              transaction = null;
              error = '';
            } else if (managingBatch) {
              managingBatch = false;
            } else {
              selected = null;
            }
          "
        >
          <IconArrowLeft :size="17" />
          {{ transaction ? (managingBatch ? 'Kembali ke edit batch' : 'Kembali ke detail batch') : managingBatch ? 'Kembali ke detail batch' : 'Semua batch' }}
        </button>
        <template v-if="!transaction && !managingBatch">
          <div class="page-heading">
            <div>
              <div class="breadcrumb">
                Batch <span>/</span> {{ active.code }}
              </div>
              <h1>
                {{ active.origin }}
              </h1>
              <p>
                {{ dateLabel(active.date) }} <span class="middot">·</span>
                <span
                  class="badge"
                  :class="active.closed ? 'complete' : 'in-progress'"
                  ><i></i>{{ active.closed ? "Selesai" : "Aktif" }}</span
                >
              </p>
            </div>
            <div class="batch-heading-actions">
              <button class="secondary" @click="managingBatch = true; error = ''">Edit batch</button>
              <button class="primary" @click="startTransaction('sale')">
                <IconPlus :size="16" /> Tambah penjualan
              </button>
            </div>
          </div>
          <div class="detail-metrics">
            <div>
              <span>Pendapatan</span
              ><strong>{{ idr(batchTotals.revenue) }}</strong>
            </div>
            <div>
              <span>Total biaya</span
              ><strong>{{ idr(batchTotals.cost) }}</strong>
            </div>
            <div>
              <span>Laba berjalan</span
              ><strong>{{ idr(batchTotals.profit) }}</strong>
            </div>
            <div>
              <span>Selisih bobot saat ini</span
              ><strong>{{ kg(batchTotals.difference) }} kg</strong>
              <div class="weight-value"><span>Estimasi nilai modal selisih</span><b>{{ weightDifferenceValue === null ? 'Belum tersedia' : `${weightDifferenceValue.isPositive() ? '+' : ''}${idr(weightDifferenceValue)}` }}</b></div>
            </div>
          </div>
          <section class="batch-hpp-detail">
            <div class="section-heading">
              <div>
                <h2>HPP batch & produk</h2>
                <p>
                  Dihitung langsung dari seluruh pembelian dan biaya yang
                  tercatat.
                </p>
              </div>
              <span class="local-caption"
                ><IconRefresh :size="14" /> Otomatis diperbarui</span
              >
            </div>
            <div class="detail-hpp-summary">
              <div>
                <span>HPP umum / kg beli</span
                ><strong>{{
                  batchTotals.bought.isPositive()
                    ? idr(batchTotals.cost.div(batchTotals.bought))
                    : "—"
                }}</strong
                ><small
                  >{{ idr(batchTotals.cost) }} ÷ {{ kg(batchTotals.bought) }} kg
                  dibeli</small
                >
              </div>
              <div>
                <span>HPP efektif / kg terjual</span
                ><strong>{{
                  batchTotals.hpp === null ? "—" : idr(batchTotals.hpp)
                }}</strong
                ><small>{{
                  batchTotals.hpp === null
                    ? "Belum ada bobot terjual"
                    : `${idr(batchTotals.cost)} ÷ ${kg(batchTotals.sold)} kg terjual`
                }}</small>
              </div>
            </div>
          </section>
        </template>
        <div v-if="managingBatch && !transaction" class="page-heading">
          <div><div class="breadcrumb">{{ active.code }} <span>/</span> Edit batch</div><h1>Edit transaksi batch</h1><p>Pilih pembelian, biaya, atau penjualan yang ingin dikoreksi atau dihapus.</p></div>
          <div class="batch-heading-actions">
            <button class="secondary" :disabled="deletingBatch" @click="startTransaction('purchase')"><IconPlus :size="16" /> Tambah pembelian</button>
            <button class="secondary" :disabled="deletingBatch" @click="startTransaction('expense')"><IconPlus :size="16" /> Tambah biaya perjalanan</button>
            <button class="secondary" :disabled="deletingBatch" @click="deleteBatch">{{ deletingBatch ? 'Menghapus…' : 'Hapus batch' }}</button>
            <button class="secondary" :disabled="deletingBatch" @click="managingBatch = false; error = ''">Selesai</button>
          </div>
        </div>
        <template v-if="transaction">
          <div class="page-heading">
            <div>
              <div class="breadcrumb">
                Batch <span>/</span> {{ active.code }} <span>/</span>
                {{
                  transaction === "sale"
                    ? "Penjualan"
                    : transaction === "purchase"
                      ? "Pembelian"
                      : "Biaya perjalanan"
                }}
              </div>
              <h1>
                {{
                  transaction === "sale"
                    ? "Catat penjualan ikan"
                    : transaction === "purchase"
                      ? "Catat pembelian ikan"
                      : "Catat biaya perjalanan"
                }}
              </h1>
              <p>
                {{ active.origin }} · {{ active.code }} —
                {{
                  transaction === "sale"
                    ? "Pilih ikan dari pembelian. Size opsional; gunakan campur untuk penjualan gabungan."
                    : "Lengkapi rincian transaksi di bawah ini."
                }}
              </p>
            </div>
          </div>
          <form v-if="transaction === 'sale'" class="entry-form transaction-form sales-form" @submit.prevent="saveSales">
            <fieldset :disabled="savingSales" class="sales-fieldset">
              <h2>{{ editingItemId ? 'Edit penjualan' : 'Rincian penjualan' }}</h2><div class="form-grid"><label>Tanggal penjualan<input v-model="entry.date" type="date" required /></label></div>
              <p v-if="!saleProducts.length" class="form-error">Belum ada pembelian ikan pada batch ini. Catat pembelian terlebih dahulu.</p>
              <article v-for="(row, index) in saleRows" :key="row.key" class="product-card">
                <div class="section-heading"><h2>Item penjualan {{ index + 1 }}</h2><button v-if="saleRows.length > 1" type="button" class="icon-button" :aria-label="`Hapus item penjualan ${index + 1}`" @click="saleRows.splice(index, 1)"><IconX :size="16" /></button></div>
                <div class="form-grid"><ProductPicker v-model:fish="row.fish" v-model:size="row.size" :options="saleProducts" optional-size /><label>Bobot terjual (kg)<input v-model="row.weight" type="number" inputmode="decimal" min="0.001" step="0.001" placeholder="0" required /></label><label>Harga jual per kg (Rp)<MoneyInput v-model="row.price" required /></label></div>
                <div class="product-subtotal"><span>Subtotal item</span><strong>{{ idr(safeDecimal(row.weight).times(safeDecimal(row.price))) }}</strong></div>
              </article>
              <button v-if="!editingItemId" type="button" class="add-product" @click="saleRows.push(newSaleRow())"><IconPlus :size="18" /> Tambah item penjualan</button>
              <div class="draft-summary"><div><span>{{ saleRows.length }} item · total bobot terjual</span><strong>{{ kg(saleFormWeight) }} kg</strong></div><div class="draft-grand-total"><span>Total penjualan</span><strong>{{ idr(saleFormTotal) }}</strong></div></div>
              <p v-if="error" class="form-error" role="alert">{{ error }}</p>
              <div class="form-actions"><button type="button" class="secondary" @click="transaction = null; error = ''">Batal</button><button class="primary" :disabled="savingSales || !saleProducts.length"><IconCheck :size="17" /> {{ savingSales ? 'Menyimpan…' : 'Simpan semua penjualan' }}</button></div>
            </fieldset>
          </form>
          <form v-else class="entry-form transaction-form" @submit.prevent="saveEntry">
            <div class="section-heading">
              <h2>
                {{ editingItemId ? 'Edit' : 'Tambah' }}
                {{
                  transaction === "purchase"
                    ? "pembelian"
                    : "biaya perjalanan"
                }}
              </h2>
              <button
                type="button"
                class="icon-button"
                aria-label="Batal input"
                @click="transaction = null"
              >
                <IconX :size="18" />
              </button>
            </div>
            <div class="form-grid">
              <label
                >Tanggal<input
                  v-model="entry.date"
                  type="date"
                  required /></label
              ><template v-if="transaction !== 'expense'">
                <ProductPicker
                  :key="transaction"
                  v-model:fish="entry.fish"
                  v-model:size="entry.size"
                  :options="catalog"
                  allow-other />
                <label
                  >Bobot (kg)<input
                    v-model="entry.weight"
                    type="number"
                    step="0.001"
                    min="0.001"
                    inputmode="decimal"
                    required /></label></template
              ><label
                >{{
                  transaction === "expense"
                    ? "Jumlah biaya (Rp)"
                    : "Harga per kg (Rp)"
                }}<MoneyInput v-model="entry.price" required /></label
              ><label v-if="transaction === 'expense'"
                >Kategori<select v-model="entry.fish">
                  <option>BBM</option>
                  <option>Tol</option>
                  <option>Makan</option>
                  <option>Es</option>
                  <option>Parkir</option>
                  <option>Lainnya</option>
                </select></label
              ><label v-if="transaction === 'expense'"
                >Keterangan (opsional)<input v-model="entry.description"
              /></label>
            </div>
            <p class="preview-total">
              Total
              {{
                idr(
                  new Decimal(entry.price || 0).times(
                    transaction === "expense" ? 1 : entry.weight || 0,
                  ),
                )
              }}
            </p>
            <p v-if="error" class="form-error" role="alert">{{ error }}</p>
            <div class="form-actions">
              <button
                type="button"
                class="secondary"
                @click="transaction = null"
              >
                Batal</button
              ><button class="primary">
                <IconCheck :size="17" /> Simpan transaksi
              </button>
            </div>
          </form>
        </template>
        <template v-if="!transaction">
          <section
            v-for="group in transactionGroups"
            :key="group.kind"
            class="transactions batch-transaction-group"
          >
            <div class="section-heading">
              <div>
                <h2>
                  {{ group.title }}
                  <span class="count">{{
                    active.items.filter((i) => i.kind === group.kind).length
                  }}</span>
                </h2>
                <p>{{ group.hint }}</p>
                <p v-if="group.kind === 'purchase'" class="purchase-hpp-help">HPP/kg = harga beli rata-rata ikan & size yang sama + alokasi biaya perjalanan per kg beli.</p>
              </div>
              <div class="group-total">
                <span>{{
                  group.kind === "sale" ? "Total pendapatan" : "Total biaya"
                }}</span
                ><strong>{{ idr(batchTotals[group.metric]) }}</strong>
              </div>
            </div>
            <div
              v-for="item in active.items.filter((i) => i.kind === group.kind)"
              :key="item.id"
              class="transaction-row"
            >
              <span class="route-icon"
                ><component
                  :is="
                    item.kind === 'expense'
                      ? IconReceipt
                      : item.kind === 'purchase'
                        ? IconPackage
                        : IconFish
                  "
                  :size="20"
              /></span>
              <div>
                <strong
                  >{{
                    item.kind === "purchase"
                      ? "Pembelian"
                      : item.kind === "sale"
                        ? "Penjualan"
                        : "Biaya"
                  }}
                  {{ item.fish }}</strong
                ><small>{{
                  item.kind === "expense"
                    ? item.description
                    : `${kg(item.weight)} kg · ${idr(item.price)} / kg · ${item.size ? 'Size ' + item.size : 'Campur semua size'}`
                }}</small>
              </div>
              <span class="transaction-date">{{ dateLabel(item.date) }}</span
              ><strong>{{
                idr(
                  new Decimal(item.price).times(
                    item.kind === "expense" ? 1 : item.weight,
                  ),
                )
              }}</strong
              >
              <div v-if="item.kind === 'purchase'" class="purchase-row-hpp">
                <template v-for="row in detailProductHpps.filter(p => p.fish.toLowerCase() === item.fish.toLowerCase() && p.size.toLowerCase() === item.size.toLowerCase())" :key="JSON.stringify([row.fish, row.size])">
                  <span>HPP produk / kg</span><strong>{{ row.hpp === null ? '—' : idr(row.hpp) }}</strong>
                  <small>{{ row.purchasePerKg === null ? '—' : idr(row.purchasePerKg) }} beli + {{ idr(row.expensePerKg) }} biaya</small>
                </template>
              </div><div v-if="managingBatch" class="transaction-actions"><button type="button" class="secondary" :disabled="savingEntry || savingSales" @click="editItem(item)">Edit</button><button type="button" class="secondary" :disabled="savingEntry || savingSales" @click="deleteItem(item)">Hapus</button></div>
            </div>
            <div
              v-if="!active.items.some((i) => i.kind === group.kind)"
              class="empty"
            >
              <IconReceipt :size="32" />
              <h2>Belum ada {{ group.title.toLowerCase() }}.</h2>
              <p>
                {{
                  active.closed
                    ? "Tidak ada catatan pada bagian ini."
                    : "Gunakan tombol tambah di bagian atas untuk mencatat transaksi."
                }}
              </p>
            </div>
          </section></template
        ></template
      >
      <p
        v-if="error && !showForm && !transaction"
        class="form-error"
        role="alert"
      >
        {{ error }}
      </p>
    </main>
    <ConfirmDialog ref="confirmDialog" />
    <footer>
      <span
        ><IconFish :size="16" /> Panen Iwak
        <span class="footer-dot">·</span> Lebih rapi, lebih pasti.</span
      ><span
        >@{{ currentUser.username }} <span class="footer-dot">·</span> Data tersimpan di server</span
      >
    </footer>
    <Transition name="toast"
      ><div v-if="toast" class="toast-message" role="status">
        <IconCheck :size="18" />{{ toast
        }}<button aria-label="Tutup pemberitahuan" @click="toast = ''">
          <IconX :size="16" />
        </button></div
    ></Transition>
  </div>
</template>
