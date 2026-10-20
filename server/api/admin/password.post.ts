import { z } from 'zod';
export default defineEventHandler(async event => {
  const actor = await requireAdmin(event);
  const input = await validatedBody(event, z.object({ id: z.uuid(), password: passwordSchema }));
  const result = await backend(event).auth.admin.updateUserById(input.id, { password: input.password, app_metadata: { audit_actor_id: actor.id } });
  if (result.error) throw createError({ statusCode: 400, statusMessage: 'Password gagal direset. Gunakan minimal 8 karakter dan periksa kebijakan password Supabase.' });
  return { ok: true };
});
