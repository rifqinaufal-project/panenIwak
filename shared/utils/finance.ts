import Decimal from 'decimal.js';

export type FinancialItem = {
  kind: 'purchase' | 'expense' | 'sale';
  weight: Decimal.Value;
  price: Decimal.Value;
};

export function safeDecimal(value: Decimal.Value | null | undefined) {
  try {
    const number = new Decimal(value ?? 0);
    return number.isFinite() && !number.isNegative() ? number : new Decimal(0);
  } catch {
    return new Decimal(0);
  }
}

/** Keep all business arithmetic in Decimal; round only when displaying/exporting. */
export function metrics(items: readonly FinancialItem[]) {
  let revenue = new Decimal(0),
    purchases = new Decimal(0),
    expense = new Decimal(0);
  let bought = new Decimal(0),
    sold = new Decimal(0);
  for (const item of items) {
    const weight = new Decimal(item.weight || 0),
      price = new Decimal(item.price || 0);
    if (item.kind === 'purchase') {
      purchases = purchases.plus(weight.times(price));
      bought = bought.plus(weight);
    }
    if (item.kind === 'sale') {
      revenue = revenue.plus(weight.times(price));
      sold = sold.plus(weight);
    }
    if (item.kind === 'expense') expense = expense.plus(price);
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

type PurchaseInput = { fish: string; size: string; weight: Decimal.Value; price: Decimal.Value };

/** Preview groups preserve incomplete rows, without inventing a valid HPP for them. */
export function draftProductHpps(products: readonly PurchaseInput[], expenses: Decimal.Value) {
  const totalWeight = products.reduce(
    (sum, product) => sum.plus(safeDecimal(product.weight)),
    new Decimal(0),
  );
  const groups = new Map<
    string,
    { fish: string; size: string; weight: Decimal; cost: Decimal; complete: boolean }
  >();
  for (const product of products) {
    const fish = product.fish.trim(),
      size = product.size.trim();
    if (!fish || !size) continue;
    const key = JSON.stringify([fish.toLowerCase(), size.toLowerCase()]);
    const row = groups.get(key) ?? {
      fish,
      size,
      weight: new Decimal(0),
      cost: new Decimal(0),
      complete: true,
    };
    const weight = safeDecimal(product.weight),
      price = safeDecimal(product.price);
    row.weight = row.weight.plus(weight);
    row.cost = row.cost.plus(weight.times(price));
    row.complete = row.complete && weight.gt(0) && price.gt(0);
    groups.set(key, row);
  }
  return [...groups.values()].map((row) => {
    const allocation = totalWeight.gt(0)
      ? new Decimal(expenses).times(row.weight).div(totalWeight)
      : new Decimal(0);
    return {
      ...row,
      allocation,
      purchasePerKg: row.weight.gt(0) ? row.cost.div(row.weight) : null,
      expensePerKg: totalWeight.gt(0) ? new Decimal(expenses).div(totalWeight) : null,
      hpp: row.complete && row.weight.gt(0) ? row.cost.plus(allocation).div(row.weight) : null,
    };
  });
}

/** Sales never allocate costs to sizes: only purchased weights determine product HPP. */
export function productHpps(items: readonly (FinancialItem & { fish: string; size: string })[]) {
  const total = metrics(items);
  const groups = new Map<string, { fish: string; size: string; weight: Decimal; cost: Decimal }>();
  for (const item of items) {
    if (item.kind !== 'purchase') continue;
    const key = JSON.stringify([item.fish.toLowerCase(), item.size.toLowerCase()]);
    const row = groups.get(key) ?? {
      fish: item.fish,
      size: item.size,
      weight: new Decimal(0),
      cost: new Decimal(0),
    };
    row.weight = row.weight.plus(item.weight);
    row.cost = row.cost.plus(new Decimal(item.weight).times(item.price));
    groups.set(key, row);
  }
  const expensePerKg = total.bought.gt(0) ? total.expense.div(total.bought) : new Decimal(0);
  return [...groups.values()].map((row) => ({
    ...row,
    expensePerKg,
    purchasePerKg: row.weight.gt(0) ? row.cost.div(row.weight) : null,
    hpp: row.weight.gt(0) ? row.cost.div(row.weight).plus(expensePerKg) : null,
  }));
}

export function weightDifferenceValue(items: readonly FinancialItem[]) {
  const total = metrics(items);
  return total.bought.gt(0) ? total.difference.times(total.cost).div(total.bought) : null;
}

export const lineTotal = (weight: Decimal.Value, price: Decimal.Value) =>
  safeDecimal(weight).times(safeDecimal(price));
export const itemAmount = (item: FinancialItem) =>
  lineTotal(item.kind === 'expense' ? 1 : item.weight, item.price);
