import type Decimal from 'decimal.js';

export const today = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
export const idr = (value: Decimal.Value) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  })
    .format(Number.isFinite(Number(value)) ? Number(value) : 0)
    .replace(/\s/g, '');
export const kg = (value: Decimal.Value) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(Number(value));
export const dateLabel = (value: string) =>
  new Date(`${value}T12:00:00`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
export const logTime = (value: string) =>
  new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
