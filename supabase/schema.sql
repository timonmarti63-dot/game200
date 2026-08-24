-- Krone & Kettenhemd - cloud save schema.
-- Paste this whole file into the Supabase dashboard: SQL Editor -> New query -> Run.
-- One row per logged-in player, holding the same JSON blob the game already
-- keeps locally (equipment, hotbar, backpack, ability unlocks, conquered
-- islands). Row Level Security means each player can only ever read/write
-- their own row - the browser talks to Supabase directly with the public
-- "anon" key, so this is what keeps saves private instead of a secret key.

create table if not exists public.player_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.player_saves enable row level security;

drop policy if exists "Users can view own save" on public.player_saves;
create policy "Users can view own save"
  on public.player_saves for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own save" on public.player_saves;
create policy "Users can insert own save"
  on public.player_saves for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own save" on public.player_saves;
create policy "Users can update own save"
  on public.player_saves for update
  using (auth.uid() = user_id);
