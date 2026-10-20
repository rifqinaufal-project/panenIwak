-- Run this entire file in Supabase SQL Editor. Existing data is preserved.
begin;

create or replace function public.on_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid;
  v_meta jsonb;
begin
  -- Auth may populate app_metadata after inserting auth.users, in the same
  -- transaction. Read the final row, not the INSERT event's NEW snapshot.
  select raw_app_meta_data into v_meta from auth.users where id=new.id;
  if tg_op='INSERT' then
    if v_meta->>'username' is null or v_meta->>'name' is null or v_meta->>'role' is null then
      raise exception 'Account app_metadata must include username, name and role';
    end if;
    insert into public.profiles(id,username,name,role)
      values(new.id,v_meta->>'username',v_meta->>'name',v_meta->>'role');
    v_actor := coalesce((v_meta->>'audit_actor_id')::uuid,new.id);
    perform public.write_audit(v_actor,'Akun dibuat','Akun ' || (v_meta->>'username') || ' dibuat',null,null,
      jsonb_build_object('username',v_meta->>'username','role',v_meta->>'role'));
  elsif new.encrypted_password is distinct from old.encrypted_password then
    update public.profiles set auth_revision=auth_revision+1 where id=new.id;
    v_actor := coalesce((v_meta->>'audit_actor_id')::uuid,new.id);
    perform public.write_audit(v_actor,'Password direset',
      'Password akun ' || (select username from public.profiles where id=new.id) || ' direset');
  end if;
  return new;
end $$;

drop trigger if exists auth_user_profile on auth.users;
create constraint trigger auth_user_profile
after insert or update on auth.users
deferrable initially deferred
for each row execute function public.on_auth_user();

revoke execute on function public.on_auth_user() from public,anon,authenticated;
commit;
