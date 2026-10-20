export default defineEventHandler(async event => {
  const user = await requireProfile(event), db = backend(event);
  let batchQuery = db.from('batches').select('*').order('created_at', { ascending: false });
  if (user.role !== 'admin') batchQuery = batchQuery.eq('owner_id', user.id);
  const batches = await batchQuery;
  databaseError(batches.error);
  const products = await db.from('products').select('id,fish,size').order('fish');
  databaseError(products.error);
  let logsQuery = db.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(500);
  if (user.role !== 'admin') {
    const ids = (batches.data ?? []).map(b => b.id);
    logsQuery = ids.length ? logsQuery.or(`actor_id.eq.${user.id},batch_id.in.(${ids.join(',')})`) : logsQuery.eq('actor_id', user.id);
  }
  const logs = await logsQuery;
  databaseError(logs.error);
  return { batches: (batches.data ?? []).map(batch => ({ ...batch.document, id: batch.id, code: batch.code, version: batch.version, ownerId: batch.owner_id, closed: false, staff: '', destination: '' })), products: products.data ?? [], logs: (logs.data ?? []).map(l => ({ id: l.id, timestamp: l.created_at, action: l.action, detail: l.detail, batchId: l.batch_id, username: l.username, actorId: l.actor_id, oldValues: l.old_values, newValues: l.new_values })) };
});
