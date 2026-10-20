export default defineEventHandler(async event => {
  try {
    const actor = await requireProfile(event);
    await backend(event).rpc('record_auth_event', { p_actor: actor.id, p_action: 'Logout', p_detail: 'Keluar dari aplikasi' });
    if (event.context.accessToken) await backend(event).auth.admin.signOut(event.context.accessToken, 'local');
  } finally { clearAuthCookies(event); }
  return { ok: true };
});
