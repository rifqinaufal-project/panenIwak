import { z } from 'zod';
export default defineEventHandler(async event => {
  const actor = await requireAdmin(event);
  const input = await validatedBody(event, z.object({ username: usernameSchema, name: z.string().trim().min(1).max(100), password: passwordSchema, role: z.enum(['admin', 'field_staff']) }));
  const result = await backend(event).auth.admin.createUser({ email: `${input.username}@users.panen-iwak.invalid`, password: input.password, email_confirm: true, app_metadata: { username: input.username, name: input.name, role: input.role, audit_actor_id: actor.id } });
  if (result.error) throw createError({ statusCode: 409, statusMessage: 'Akun gagal dibuat. Username mungkin sudah dipakai atau password ditolak.' });
  return { ok: true };
});
