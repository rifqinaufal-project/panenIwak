export default defineEventHandler(async event => {
  const user = await requireProfile(event), input = await validatedBody(event, batchSchema);
  const { id, version, ...document } = input;
  const result = await backend(event).rpc('commit_batch', { p_actor: user.id, p_id: id, p_document: document, p_version: version });
  databaseError(result.error);
  const row = result.data;
  return { batch: { ...row.document, id: row.id, code: row.code, version: row.version, ownerId: row.owner_id, closed: false, staff: '', destination: '' } };
});
