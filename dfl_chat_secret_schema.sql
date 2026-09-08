-- Ask DFL keeps its provider key in Supabase Vault. Only the service-role
-- identity already present inside Edge Functions may retrieve the plaintext.
create or replace function public.dfl_chat_openai_key()
returns text
language sql
security definer
set search_path = ''
as $$
  select decrypted_secret
    from vault.decrypted_secrets
   where name = 'dfl_chat_openai_key'
   limit 1;
$$;

revoke all on function public.dfl_chat_openai_key() from public, anon, authenticated;
grant execute on function public.dfl_chat_openai_key() to service_role;

