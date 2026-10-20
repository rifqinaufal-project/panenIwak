import { z } from 'zod';
import type { H3Event } from 'h3';
export const usernameSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,32}$/, 'Username 3–32 karakter: huruf, angka, atau underscore.');
export const passwordSchema = z.string().min(8).max(128);
const date = z.iso.date();
const decimal = z.preprocess(value => typeof value === 'number' || typeof value === 'string' ? String(value).replace(/\.$/, '') : value, z.string().regex(/^\d{1,12}(\.\d{1,3})?$/).refine(v => Number.isFinite(Number(v))));
export const itemSchema = z.object({ id: z.uuid(), kind: z.enum(['purchase', 'expense', 'sale']), fish: z.string().trim().max(100), size: z.string().trim().max(50), weight: decimal, price: decimal, description: z.string().trim().max(1000), date }).superRefine((item, ctx) => {
  if (Number(item.price) <= 0) ctx.addIssue({ code: 'custom', message: 'Harga harus positif.' });
  if (item.kind !== 'expense' && (!item.fish || Number(item.weight) <= 0 || (item.kind === 'purchase' && !item.size))) ctx.addIssue({ code: 'custom', message: 'Ikan, bobot, dan size pembelian wajib diisi.' });
});
export const batchSchema = z.object({ id: z.uuid(), origin: z.string().trim().min(1).max(200), date, items: z.array(itemSchema).max(1000), version: z.number().int().nonnegative().default(0) }).superRefine((batch, ctx) => {
  if (new Set(batch.items.map(i => i.id)).size !== batch.items.length) ctx.addIssue({ code: 'custom', message: 'ID transaksi duplikat.' });
  for (const sale of batch.items.filter(i => i.kind === 'sale')) if (!batch.items.some(i => i.kind === 'purchase' && i.fish === sale.fish && (!sale.size || i.size === sale.size))) ctx.addIssue({ code: 'custom', message: 'Penjualan harus berdasarkan pembelian.' });
});
export async function validatedBody<T>(event: H3Event, schema: z.ZodType<T>): Promise<T> {
  const body = await readBody(event);
  if (JSON.stringify(body)?.length > 1024 * 1024) throw createError({ statusCode: 413, statusMessage: 'Data terlalu besar.' });
  const result = schema.safeParse(body);
  if (!result.success) throw createError({ statusCode: 422, statusMessage: 'Isian tidak valid.', data: { issues: result.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })) } });
  return result.data;
}
