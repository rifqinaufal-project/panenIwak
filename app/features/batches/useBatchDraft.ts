import { computed, reactive, ref } from 'vue';
import Decimal from 'decimal.js';
import type { Batch, ExpenseDraft, PurchaseDraft } from '#shared/types/workspace';
import { draftProductHpps, safeDecimal } from '#shared/utils/finance';
import { buildBatch, validateBatchDraft } from '#shared/utils/transactions';
import { batchPath } from '#shared/utils/workspace-routes';
import { today } from '../../utils/workspace-format';
import type { FinishNavigation } from '../workspace/contracts';

export function useBatchDraft(options: {
  persist: (batch: Batch) => Promise<boolean>;
  setError: (message: string) => void;
  finishNavigation: FinishNavigation;
  notify: (message: string) => void;
}) {
  let productKey = 0;
  const id = ref(crypto.randomUUID());
  const form = reactive({ origin: '', date: today() });
  const newProduct = (): PurchaseDraft => ({
    id: crypto.randomUUID(),
    key: ++productKey,
    fish: '',
    size: '',
    weight: '',
    price: '',
  });
  const newExpense = (): ExpenseDraft => ({
    id: crypto.randomUUID(),
    category: 'BBM',
    description: '',
    price: '',
  });
  const products = ref([newProduct()]),
    expenses = ref<ExpenseDraft[]>([]);
  const total = computed(() =>
    products.value.reduce(
      (sum, product) => sum.plus(safeDecimal(product.weight).times(safeDecimal(product.price))),
      new Decimal(0),
    ),
  );
  const expenseTotal = computed(() =>
    expenses.value.reduce((sum, expense) => sum.plus(safeDecimal(expense.price)), new Decimal(0)),
  );
  const weight = computed(() =>
    products.value.reduce((sum, product) => sum.plus(safeDecimal(product.weight)), new Decimal(0)),
  );
  const hpp = computed(() =>
    weight.value.gt(0) ? total.value.plus(expenseTotal.value).div(weight.value) : null,
  );
  const productHpps = computed(() => draftProductHpps(products.value, expenseTotal.value));
  function reset() {
    id.value = crypto.randomUUID();
    Object.assign(form, { origin: '', date: today() });
    products.value = [newProduct()];
    expenses.value = [];
  }
  function snapshot() {
    return JSON.stringify({ form, products: products.value, expenses: expenses.value });
  }
  async function save() {
    const error = validateBatchDraft(form, products.value, expenses.value);
    options.setError(error);
    if (error) return;
    const batch = buildBatch(id.value, form, products.value, expenses.value);
    if (await options.persist(batch)) {
      await options.finishNavigation(batchPath(batch.id));
      reset();
      options.notify('Batch baru tersimpan di server.');
    }
  }
  return {
    form,
    products,
    expenses,
    total,
    expenseTotal,
    weight,
    hpp,
    productHpps,
    newProduct,
    newExpense,
    reset,
    snapshot,
    save,
  };
}
