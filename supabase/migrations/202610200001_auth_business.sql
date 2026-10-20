-- Apply once with Supabase SQL Editor or `supabase db push`.
create table public.profiles (
  id uuid primary key references auth.users(id),
  username text not null unique check (username ~ '^[a-z0-9_]{3,32}$'),
  name text not null check (length(name) between 1 and 100),
  role text not null check (role in ('admin', 'field_staff')),
  is_active boolean not null default true,
  auth_revision integer not null default 0,
  created_at timestamptz not null default now()
);
create sequence public.batch_number_seq;
create table public.batches (
  id uuid primary key,
  code text not null unique default ('PI-' || lpad(nextval('public.batch_number_seq')::text, 6, '0')),
  owner_id uuid not null references public.profiles(id),
  document jsonb not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index batches_owner on public.batches(owner_id);
create table public.products (
  id uuid primary key,
  fish text not null check (length(trim(fish)) between 1 and 100),
  size text not null check (length(trim(size)) between 1 and 50),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create unique index products_fish_size on public.products(lower(fish),lower(size));
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id),
  username text not null,
  action text not null,
  detail text not null,
  batch_id uuid references public.batches(id),
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_time on public.audit_logs(created_at desc);
create index audit_logs_batch on public.audit_logs(batch_id);
create table public.login_attempts (key text primary key, attempts integer not null, started_at timestamptz not null);

alter table public.profiles enable row level security;
alter table public.batches enable row level security;
alter table public.products enable row level security;
alter table public.audit_logs enable row level security;
alter table public.login_attempts enable row level security;
-- Only Nuxt server accesses business tables. No direct browser writes/reads.
revoke all on public.profiles,public.batches,public.products,public.audit_logs,public.login_attempts from anon,authenticated;
revoke all on sequence public.batch_number_seq from anon,authenticated;
grant all on public.profiles,public.batches,public.products,public.audit_logs,public.login_attempts to service_role;
grant usage,select on sequence public.batch_number_seq to service_role;

create function public.write_audit(p_actor uuid, p_action text, p_detail text, p_batch uuid default null, p_old jsonb default null, p_new jsonb default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_username text;
begin
  select username into strict v_username from public.profiles where id=p_actor;
  insert into public.audit_logs(actor_id,username,action,detail,batch_id,old_values,new_values)
    values(p_actor,v_username,p_action,p_detail,p_batch,p_old,p_new);
end $$;

create function public.consume_login_attempt(p_key text) returns boolean language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  insert into public.login_attempts as a(key,attempts,started_at) values(p_key,1,now())
  on conflict(key) do update set
    attempts=case when a.started_at < now()-interval '15 minutes' then 1 else a.attempts+1 end,
    started_at=case when a.started_at < now()-interval '15 minutes' then now() else a.started_at end
  returning attempts into v_count;
  return v_count <= 15;
end $$;

create function public.record_auth_event(p_actor uuid,p_action text,p_detail text) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.profiles where id=p_actor and is_active) then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
  perform public.write_audit(p_actor,p_action,p_detail);
end $$;

-- Profile creation is atomic with creation of the Auth user. app_metadata is admin-only.
create function public.on_auth_user() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_actor uuid;
begin
  if tg_op='INSERT' then
    insert into public.profiles(id,username,name,role) values(new.id,new.raw_app_meta_data->>'username',new.raw_app_meta_data->>'name',new.raw_app_meta_data->>'role');
    v_actor := coalesce((new.raw_app_meta_data->>'audit_actor_id')::uuid,new.id);
    perform public.write_audit(v_actor,'Akun dibuat','Akun ' || (new.raw_app_meta_data->>'username') || ' dibuat',null,null,jsonb_build_object('username',new.raw_app_meta_data->>'username','role',new.raw_app_meta_data->>'role'));
  elsif new.encrypted_password is distinct from old.encrypted_password then
    update public.profiles set auth_revision=auth_revision+1 where id=new.id;
    v_actor := coalesce((new.raw_app_meta_data->>'audit_actor_id')::uuid,new.id);
    perform public.write_audit(v_actor,'Password direset','Password akun ' || (select username from public.profiles where id=new.id) || ' direset');
  end if;
  return new;
end $$;
create trigger auth_user_profile after insert or update of encrypted_password on auth.users for each row execute function public.on_auth_user();

create function public.commit_batch(p_actor uuid,p_id uuid,p_document jsonb,p_version integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_profile public.profiles; v_row public.batches; v_old jsonb; v_new jsonb; v_kind text; v_count integer; v_action text;
begin
  select * into strict v_profile from public.profiles where id=p_actor and is_active;
  -- Lock by UUID also serializes first-insert races and retries.
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
  select * into v_row from public.batches where id=p_id for update;
  if found then
    if v_profile.role <> 'admin' and v_row.owner_id <> p_actor then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
    if v_row.document=p_document then return to_jsonb(v_row); end if;
    if v_row.version<>p_version then raise exception 'VERSION_CONFLICT'; end if;
    v_old:=v_row.document;
    update public.batches set document=p_document,version=version+1,updated_at=now() where id=p_id returning * into v_row;
  else
    if p_version<>0 then raise exception 'VERSION_CONFLICT'; end if;
    insert into public.batches(id,owner_id,document) values(p_id,p_actor,p_document) returning * into v_row;
  end if;
  select count(*),min(i->>'kind') into v_count,v_kind from jsonb_array_elements(p_document->'items') i
    where not exists(select 1 from jsonb_array_elements(coalesce(v_old->'items','[]'::jsonb)) o where o->>'id'=i->>'id');
  v_action:=case when v_old is null then 'Batch dibuat' when v_kind='sale' then 'Penjualan ditambahkan' when v_kind='purchase' then 'Pembelian ditambahkan' when v_kind='expense' then 'Biaya ditambahkan' else 'Batch diperbarui' end;
  perform public.write_audit(p_actor,v_action,v_row.code || ' · ' || (p_document->>'origin') || ' · ' || v_count || ' catatan baru',p_id,v_old,p_document);
  return to_jsonb(v_row);
end $$;

create function public.add_product(p_actor uuid,p_id uuid,p_fish text,p_size text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_product public.products;
begin
  if not exists(select 1 from public.profiles where id=p_actor and is_active) then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
  select * into v_product from public.products where id=p_id;
  if found then
    if v_product.fish=p_fish and v_product.size=p_size then return to_jsonb(v_product); end if;
    raise exception 'VERSION_CONFLICT';
  end if;
  select * into v_product from public.products where lower(fish)=lower(p_fish) and lower(size)=lower(p_size);
  if found then return to_jsonb(v_product); end if;
  insert into public.products(id,fish,size,created_by) values(p_id,p_fish,p_size,p_actor) returning * into v_product;
  perform public.write_audit(p_actor,'Produk ditambahkan',p_fish || ' · Size ' || p_size,null,null,jsonb_build_object('id',p_id,'fish',p_fish,'size',p_size));
  return to_jsonb(v_product);
end $$;

create function public.manage_profile(p_actor uuid,p_target uuid,p_role text,p_active boolean) returns void language plpgsql security definer set search_path = '' as $$
declare v_old public.profiles; v_new public.profiles;
begin
  perform pg_advisory_xact_lock(88762026);
  if not exists(select 1 from public.profiles where id=p_actor and role='admin' and is_active) then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
  select * into strict v_old from public.profiles where id=p_target for update;
  if p_actor=p_target and (not p_active or p_role<>'admin') then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
  update public.profiles set role=p_role,is_active=p_active where id=p_target returning * into v_new;
  perform public.write_audit(p_actor,'Akun diperbarui','Role/status akun ' || v_old.username || ' diperbarui',null,to_jsonb(v_old),to_jsonb(v_new));
end $$;

-- RPCs are callable only by the trusted Nuxt server, never by a public API key.
revoke execute on function public.write_audit(uuid,text,text,uuid,jsonb,jsonb),public.consume_login_attempt(text),public.record_auth_event(uuid,text,text),public.on_auth_user(),public.commit_batch(uuid,uuid,jsonb,integer),public.add_product(uuid,uuid,text,text),public.manage_profile(uuid,uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.consume_login_attempt(text),public.record_auth_event(uuid,text,text),public.commit_batch(uuid,uuid,jsonb,integer),public.add_product(uuid,uuid,text,text),public.manage_profile(uuid,uuid,text,boolean) to service_role;
