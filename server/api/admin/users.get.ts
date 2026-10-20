export default defineEventHandler(async event => {
  await requireAdmin(event);
  const result = await backend(event).from('profiles').select('id,username,name,role,is_active').order('created_at');
  databaseError(result.error);
  return { users: result.data ?? [] };
});
