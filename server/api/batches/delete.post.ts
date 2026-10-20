import { z } from 'zod';
export default defineEventHandler(async event => {
  const user = await requireProfile(event);
  const input = await validatedBody(event, z.object({ id: z.uuid(), version: z.number().int().positive() }));
  const result = await backend(event).rpc('delete_batch', { p_actor: user.id, p_id: input.id, p_version: input.version });
  databaseError(result.error);
  return { ok: true };
});
