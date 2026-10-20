import { z } from 'zod';
export default defineEventHandler(async event => {
  const user = await requireProfile(event);
  const input = await validatedBody(event, z.discriminatedUnion('action', [
    z.object({ action: z.literal('edit'), id: z.uuid(), fish: z.string().trim().min(1).max(100), size: z.string().trim().min(1).max(50) }),
    z.object({ action: z.literal('delete'), id: z.uuid() }),
  ]));
  const result = await backend(event).rpc('manage_product', { p_actor: user.id, p_id: input.id, p_delete: input.action === 'delete', p_fish: input.action === 'edit' ? input.fish : null, p_size: input.action === 'edit' ? input.size : null });
  databaseError(result.error);
  return { ok: true };
});
