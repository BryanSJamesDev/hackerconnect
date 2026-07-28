-- HackerConnect backend schema on InsForge.
-- Applied directly via the /api/database/advance/rawsql endpoint (see scripts/setup-insforge.ts)
-- since it lets us provision schema non-interactively with the project API key.

create table if not exists public.agent_intents (
  id text primary key,
  name text not null,
  description text not null,
  reads text[] not null default '{}',
  writes text[] not null default '{}',
  config jsonb not null default '{}'
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  qualification text not null,
  interests text[] not null default '{}',
  bio text not null default '',
  experience_level int not null default 1,
  events_attended int not null default 0,
  hackathons_won int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event_date timestamptz not null,
  location text not null default '',
  discovered_via text not null default 'gmail',
  created_at timestamptz not null default now()
);

create table if not exists public.event_attendance (
  event_id uuid not null references public.events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  primary key (event_id, profile_id)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  won boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  primary key (project_id, profile_id)
);

create table if not exists public.chemistry_edges (
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  score numeric not null default 0,
  github_collabs int not null default 0,
  slack_interactions int not null default 0,
  events_attended_together int not null default 0,
  hackathons_won_together int not null default 0,
  last_updated timestamptz not null default now(),
  primary key (user_a, user_b),
  constraint chemistry_edges_order check (user_a < user_b)
);

create table if not exists public.event_feedback (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  teammate_id uuid not null references public.profiles(id) on delete cascade,
  outcome text not null check (outcome in ('won', 'fun', 'neutral', 'friction')),
  note text,
  created_at timestamptz not null default now()
);
