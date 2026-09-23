-- Execute this file once in the Supabase SQL Editor, then execute seed.sql.
create table public.programs (
  id uuid primary key default gen_random_uuid(),
  institution_name text not null,
  practice_scenario text not null,
  city text not null,
  state char(2) not null,
  created_at timestamptz not null default now(),
  unique (institution_name, practice_scenario, city, state)
);

create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  score numeric(5,2) not null check (score >= 0 and score <= 100),
  first_choice_program_id uuid not null references public.programs(id) on delete restrict,
  second_choice_program_id uuid not null references public.programs(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (first_choice_program_id <> second_choice_program_id)
);

create index candidates_first_choice_idx on public.candidates(first_choice_program_id);
create index candidates_second_choice_idx on public.candidates(second_choice_program_id);
create index candidates_score_idx on public.candidates(score desc);

alter table public.programs enable row level security;
alter table public.candidates enable row level security;

-- O ranking é colaborativo e público ao grupo; não há autenticação nesta versão.
create policy "programs podem ser lidos publicamente" on public.programs for select using (true);
create policy "candidates podem ser lidos publicamente" on public.candidates for select using (true);
create policy "candidates podem ser inseridos publicamente" on public.candidates for insert with check (true);
