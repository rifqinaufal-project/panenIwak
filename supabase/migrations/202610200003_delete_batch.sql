begin;
alter table public.batches add column deleted_at timestamptz;

create function public.delete_batch(p_actor uuid,p_id uuid,p_version integer)
returns void language plpgsql security definer set search_path = '' as $$
declare v_profile public.profiles; v_batch public.batches;
begin
  select * into strict v_profile from public.profiles where id=p_actor and is_active;
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
  select * into strict v_batch from public.batches where id=p_id for update;
  if v_profile.role <> 'admin' and v_batch.owner_id <> p_actor then
    raise exception 'ACCESS_DENIED' using errcode='42501';
  end if;
  if v_batch.deleted_at is not null then return; end if;
  if v_batch.version <> p_version then raise exception 'VERSION_CONFLICT'; end if;
  update public.batches set deleted_at=now(),updated_at=now(),version=version+1 where id=p_id;
  perform public.write_audit(p_actor,'Batch dihapus',v_batch.code || ' · ' || (v_batch.document->>'origin'),p_id,v_batch.document,null);
end $$;

create function public.prevent_deleted_batch_edit() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.deleted_at is not null then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
  return new;
end $$;
create trigger prevent_deleted_batch_edit before update on public.batches
for each row execute function public.prevent_deleted_batch_edit();
revoke execute on function public.delete_batch(uuid,uuid,integer),public.prevent_deleted_batch_edit() from public,anon,authenticated;
grant execute on function public.delete_batch(uuid,uuid,integer) to service_role;
commit;
