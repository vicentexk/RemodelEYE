-- ============================================================
-- EYE GATE — SETUP COMPLETO DO BANCO (Supabase)
--
-- QUANDO USAR:
--   • Se o projeto foi pausado: restaure em supabase.com/dashboard
--     (botão "Restore project") — depois RODE ESTE SCRIPT por garantia.
--   • Se criou um projeto NOVO: RODE ESTE SCRIPT para criar todas as
--     tabelas. Depois atualize a URL e a KEY em js/config.js
--     (Supabase → Settings → API).
--
-- COMO RODAR:
--   supabase.com/dashboard → seu projeto → SQL Editor → New query
--   → cole tudo → RUN
-- ============================================================

-- ------------------------------------------------------------
-- TABELAS
-- ------------------------------------------------------------

create extension if not exists "pgcrypto";

create table if not exists public.usuarios (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null,
  email     text unique not null,
  senha     text not null,
  tipo      text not null default 'usuario',   -- 'usuario' | 'admin'
  bloqueado boolean not null default false,
  criado_em timestamptz not null default now()
);

create table if not exists public.admins (
  id    uuid primary key default gen_random_uuid(),
  nome  text,
  email text unique not null,
  senha text not null
);

create table if not exists public.alunos (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  matricula  text,
  turma      text,
  foto       text,          -- data URL da miniatura
  descriptor jsonb,         -- array com as 5 poses (128 números cada)
  criado_em  timestamptz not null default now()
);

create table if not exists public.logs_reconhecimento (
  id         uuid primary key default gen_random_uuid(),
  aluno_id   uuid,
  nome_aluno text,
  status     text,          -- 'Entrada' | 'Saída'
  horario    timestamptz not null default now()
);

-- ------------------------------------------------------------
-- COLUNAS DE COMPATIBILIDADE (caso as tabelas já existam antigas)
-- ------------------------------------------------------------
alter table public.usuarios add column if not exists bloqueado boolean not null default false;
alter table public.usuarios add column if not exists criado_em timestamptz not null default now();
alter table public.alunos   add column if not exists criado_em timestamptz not null default now();

-- ------------------------------------------------------------
-- ÍNDICES (performance do dashboard)
-- ------------------------------------------------------------
create index if not exists idx_logs_aluno   on public.logs_reconhecimento (aluno_id);
create index if not exists idx_logs_horario on public.logs_reconhecimento (horario desc);
create index if not exists idx_usuarios_email on public.usuarios (email);

-- ------------------------------------------------------------
-- POLÍTICAS DE ACESSO (RLS) — modo protótipo
-- Libera o acesso pelo app com a chave anon, igual à v1.
-- ⚠️ Para produção real: migrar p/ Supabase Auth + políticas por papel.
-- ------------------------------------------------------------

alter table public.usuarios enable row level security;
alter table public.alunos enable row level security;
alter table public.logs_reconhecimento enable row level security;
alter table public.admins enable row level security;

-- usuarios
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
drop policy if exists "logs_update" on public.logs_reconhecimento;
create policy "logs_update" on public.logs_reconhecimento for update using (true) with check (true);
drop policy if exists "logs_delete" on public.logs_reconhecimento;
create policy "logs_delete" on public.logs_reconhecimento for delete using (true);

-- admins
drop policy if exists "admins_select" on public.admins;
create policy "admins_select" on public.admins for select using (true);

-- ------------------------------------------------------------
-- PRONTO ✅  Agora crie sua conta admin dentro do app:
--   Tela de login → "Entrar como admin" → pode usar a aba
--   Gestão de contas → "Criar conta admin".
--   (Se o banco estiver vazio, crie a 1ª conta pelo formulário
--   "Criar conta" e promova a admin pelo painel de outro admin,
--   ou insira direto:  insert into usuarios (nome,email,senha,tipo)
--   values ('Admin','admin@escola.com','suaSenha','admin');)
-- ------------------------------------------------------------
