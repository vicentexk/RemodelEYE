-- ============================================================
-- EYE GATE v2 — Migração do banco (rodar no SQL Editor do Supabase)
--
-- COMO USAR:
--   1. Abra https://supabase.com/dashboard → seu projeto
--   2. Menu lateral: SQL Editor → New query
--   3. Cole TODO este arquivo e clique em RUN
-- ============================================================

-- ------------------------------------------------------------
-- 1) NOVAS COLUNAS (gestão de contas)
-- ------------------------------------------------------------
alter table public.usuarios
  add column if not exists bloqueado boolean not null default false;

alter table public.usuarios
  add column if not exists criado_em timestamptz not null default now();

alter table public.alunos
  add column if not exists criado_em timestamptz not null default now();

-- ------------------------------------------------------------
-- 2) ÍNDICES (deixa as consultas do dashboard mais rápidas)
-- ------------------------------------------------------------
create index if not exists idx_logs_aluno
  on public.logs_reconhecimento (aluno_id);

create index if not exists idx_logs_horario
  on public.logs_reconhecimento (horario desc);

create index if not exists idx_usuarios_email
  on public.usuarios (email);

-- ------------------------------------------------------------
-- 3) POLÍTICAS DE SEGURANÇA (RLS)
--
-- ATENÇÃO ⚠️  O app v2 usa a chave "anon" no cliente (igual à v1).
-- Para as novas funções de admin funcionarem de imediato, as
-- políticas abaixo LIBERAM o acesso público às tabelas — o mesmo
-- comportamento de antes, agora explícito e controlado.
--
-- Isso mantém o protótipo 100% funcional, mas NÃO é adequado
-- para produção. Quando forem migrar para Supabase Auth,
-- substituam por políticas por papel (bloco comentado lá embaixo).
-- ------------------------------------------------------------

alter table public.usuarios enable row level security;
alter table public.alunos enable row level security;
alter table public.logs_reconhecimento enable row level security;
alter table public.admins enable row level security;

-- usuários: leitura/criação/atualização públicas (protótipo)
drop policy if exists "usuarios_select" on public.usuarios;
create policy "usuarios_select" on public.usuarios for select using (true);

drop policy if exists "usuarios_insert" on public.usuarios;
create policy "usuarios_insert" on public.usuarios for insert with check (true);

drop policy if exists "usuarios_update" on public.usuarios;
create policy "usuarios_update" on public.usuarios for update using (true) with check (true);

drop policy if exists "usuarios_delete" on public.usuarios;
create policy "usuarios_delete" on public.usuarios for delete using (true);

-- alunos
drop policy if exists "alunos_select" on public.alunos;
create policy "alunos_select" on public.alunos for select using (true);

drop policy if exists "alunos_insert" on public.alunos;
create policy "alunos_insert" on public.alunos for insert with check (true);

drop policy if exists "alunos_update" on public.alunos;
create policy "alunos_update" on public.alunos for update using (true) with check (true);

drop policy if exists "alunos_delete" on public.alunos;
create policy "alunos_delete" on public.alunos for delete using (true);

-- logs
drop policy if exists "logs_select" on public.logs_reconhecimento;
create policy "logs_select" on public.logs_reconhecimento for select using (true);

drop policy if exists "logs_insert" on public.logs_reconhecimento;
create policy "logs_insert" on public.logs_reconhecimento for insert with check (true);

drop policy if exists "logs_delete" on public.logs_reconhecimento;
create policy "logs_delete" on public.logs_reconhecimento for delete using (true);

-- admins
drop policy if exists "admins_select" on public.admins;
create policy "admins_select" on public.admins for select using (true);

-- ============================================================
-- 4) MODO SEGURO (FUTURO — Supabase Auth)
--
-- Quando migrarem para Supabase Auth, REMOVA as políticas
-- acima e use algo como:
--
-- create policy "usuarios_le_proprio"
--   on public.usuarios for select
--   using (auth.uid()::text = id::text or is_admin());
--
-- create policy "admins_gerenciam"
--   on public.usuarios for all
--   using (is_admin()) with check (is_admin());
--
-- ...onde is_admin() é uma função SECURITY DEFINER que consulta
-- o papel do usuário autenticado.
-- ============================================================
