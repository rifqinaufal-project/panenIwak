import { z } from 'zod';
export default defineEventHandler(async event => {
  const actor = await requireAdmin(event);
  const input = await validatedBody(event, z.object({ id: z.uuid(), role: z.enum(['admin', 'field_staff']), is_active: z.boolean() }));
  const result = await backend(event).rpc('manage_profile', { p_actor: actor.id, p_target: input.id, p_role: input.role, p_active: input.is_active });
  databaseError(result.error);
  return { ok: true };
});
