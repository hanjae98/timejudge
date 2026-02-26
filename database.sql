-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. users Table: Extended user profiles
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  job_role text,
  fixed_routines jsonb default '[]'::jsonb,
  api_calls_left int default 100,
  timezone text default 'UTC',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for users
alter table public.users enable row level security;
create policy "Users can view own profile." on public.users for select using (auth.uid() = id);
create policy "Users can update own profile." on public.users for update using (auth.uid() = id);

-- Trigger to automatically create users profile on auth.users insert
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. tasks Table: Stores actual tasks to be done
create table if not exists public.tasks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  deadline timestamptz not null,
  category text,
  proficiency text check (proficiency in ('초보', '보통', '능숙')),
  estimated_time_minutes int not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for tasks
alter table public.tasks enable row level security;
create policy "Users can manage own tasks." on public.tasks 
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- 3. time_blocks Table: Split schedules of tasks, mapped in calendar
create table if not exists public.time_blocks (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  is_completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for time_blocks
alter table public.time_blocks enable row level security;
create policy "Users can manage own time blocks." on public.time_blocks 
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
