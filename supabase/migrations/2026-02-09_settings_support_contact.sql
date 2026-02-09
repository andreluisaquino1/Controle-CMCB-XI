-- ==========================================================================
-- FEAT: Settings (configurações simples) + contato de suporte
-- Data: 2026-02-09
-- ==========================================================================

-- 1) Tabela simples key/value
create table if not exists public.settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now(),
  updated_by uuid null
);

comment on table public.settings is 'Configurações simples do sistema (key/value).';
comment on column public.settings.key is 'Chave única da configuração.';
comment on column public.settings.value is 'Valor textual da configuração.';

-- 2) Atualizar updated_at automaticamente
create or replace function public._touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_settings_touch on public.settings;
create trigger trg_settings_touch
before update on public.settings
for each row execute function public._touch_updated_at();

-- 3) RLS
alter table public.settings enable row level security;

-- Leitura: qualquer usuário autenticado
drop policy if exists "settings_read" on public.settings;
create policy "settings_read"
on public.settings
for select
to authenticated
using (true);

-- Escrita: somente admin/tesouraria (função já existente no projeto)
drop policy if exists "settings_write_admin" on public.settings;
create policy "settings_write_admin"
on public.settings
for all
to authenticated
using (public.check_is_admin_or_tesouraria())
with check (public.check_is_admin_or_tesouraria());

-- 4) Seed: texto de suporte (pode ser editado no painel admin futuramente)
insert into public.settings (key, value)
values (
  'support_contact_text',
  'Entre em contato com a administração solicitando a ativação para acessar o sistema.'
)
on conflict (key) do nothing;
