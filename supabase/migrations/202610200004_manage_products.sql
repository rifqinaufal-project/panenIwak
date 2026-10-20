begin;
create function public.manage_product(p_actor uuid,p_id uuid,p_fish text,p_size text,p_delete boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_old public.products;
begin
  if not exists(select 1 from public.profiles where id=p_actor and is_active) then
    raise exception 'ACCESS_DENIED' using errcode='42501';
  end if;
  select * into strict v_old from public.products where id=p_id for update;
  if p_delete then
    delete from public.products where id=p_id;
    perform public.write_audit(p_actor,'Produk dihapus',v_old.fish || ' · Size ' || v_old.size,null,to_jsonb(v_old),null);
  else
    update public.products set fish=p_fish,size=p_size where id=p_id;
    perform public.write_audit(p_actor,'Produk diperbarui',v_old.fish || ' → ' || p_fish || ' · Size ' || p_size,null,to_jsonb(v_old),jsonb_build_object('id',p_id,'fish',p_fish,'size',p_size));
  end if;
end $$;
revoke execute on function public.manage_product(uuid,uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.manage_product(uuid,uuid,text,text,boolean) to service_role;
commit;
