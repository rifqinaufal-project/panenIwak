import { z } from 'zod';
export default defineEventHandler(async event => {
  const user = await requireProfile(event);
  const input = await validatedBody(event, z.object({ id: z.uuid(), fish: z.string().trim().min(1).max(100), size: z.string().trim().min(1).max(50) }));
  const result = await backend(event).rpc('add_product', { p_actor: user.id, p_id: input.id, p_fish: input.fish, p_size: input.size });
  databaseError(result.error);
  return { product: { id: result.data.id, fish: result.data.fish, size: result.data.size } };
});
