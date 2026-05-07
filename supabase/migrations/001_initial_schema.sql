-- Enable required extensions
create extension if not exists "uuid-ossp";

-- Enums
create type plan_type as enum ('free', 'pro', 'enterprise');
create type user_role as enum ('admin', 'member');
create type zone_type as enum ('open_space', 'meeting_room', 'focus', 'social', 'break');
create type map_theme as enum ('modern', 'zen', 'startup');

-- Organizations
create table organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  plan plan_type not null default 'free',
  max_users int not null default 5,
  logo_url text,
  created_at timestamptz not null default now()
);

-- Profiles
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  organization_id uuid references organizations(id) on delete set null,
  display_name text not null,
  avatar_url text,
  role user_role not null default 'member',
  ms_access_token text,
  teams_status text,
  created_at timestamptz not null default now()
);

-- Office maps
create table office_maps (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  layout_json jsonb not null default '{}',
  theme map_theme not null default 'modern',
  created_at timestamptz not null default now()
);

-- Zones
create table zones (
  id uuid primary key default uuid_generate_v4(),
  office_map_id uuid not null references office_maps(id) on delete cascade,
  name text not null,
  type zone_type not null default 'open_space',
  x float not null default 0,
  y float not null default 0,
  width float not null default 200,
  height float not null default 150,
  color text not null default '#6366F1',
  max_capacity int,
  auto_mute boolean not null default false,
  created_at timestamptz not null default now()
);

-- Avatar positions
create table avatar_positions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  office_map_id uuid not null references office_maps(id) on delete cascade,
  x float not null default 400,
  y float not null default 300,
  zone_id text,
  is_online boolean not null default false,
  updated_at timestamptz not null default now(),
  unique(user_id, office_map_id)
);

-- LiveKit rooms
create table livekit_rooms (
  id uuid primary key default uuid_generate_v4(),
  zone_id uuid not null references zones(id) on delete cascade,
  room_name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Function to auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger avatar_positions_updated_at
  before update on avatar_positions
  for each row execute function update_updated_at();

-- Enable Realtime on avatar_positions
alter publication supabase_realtime add table avatar_positions;

-- Row Level Security
alter table organizations enable row level security;
alter table profiles enable row level security;
alter table office_maps enable row level security;
alter table zones enable row level security;
alter table avatar_positions enable row level security;
alter table livekit_rooms enable row level security;

-- Helper function: get user's org id
create or replace function get_user_org_id()
returns uuid as $$
  select organization_id from profiles where id = auth.uid()
$$ language sql security definer stable;

-- Helper function: is user admin?
create or replace function is_admin()
returns boolean as $$
  select role = 'admin' from profiles where id = auth.uid()
$$ language sql security definer stable;

-- RLS Policies: organizations
create policy "Members can view their org" on organizations
  for select using (id = get_user_org_id());

create policy "Admins can update their org" on organizations
  for update using (id = get_user_org_id() and is_admin());

create policy "Anyone can create org during onboarding" on organizations
  for insert with check (true);

-- RLS Policies: profiles
create policy "Members can view profiles in their org" on profiles
  for select using (organization_id = get_user_org_id() or id = auth.uid());

create policy "Users can update own profile" on profiles
  for update using (id = auth.uid());

create policy "Users can insert own profile" on profiles
  for insert with check (id = auth.uid());

create policy "Admins can manage profiles in their org" on profiles
  for all using (organization_id = get_user_org_id() and is_admin());

-- RLS Policies: office_maps
create policy "Members can view org office maps" on office_maps
  for select using (organization_id = get_user_org_id());

create policy "Admins can manage office maps" on office_maps
  for all using (organization_id = get_user_org_id() and is_admin());

-- RLS Policies: zones
create policy "Members can view zones in their org maps" on zones
  for select using (
    office_map_id in (
      select id from office_maps where organization_id = get_user_org_id()
    )
  );

create policy "Admins can manage zones" on zones
  for all using (
    office_map_id in (
      select id from office_maps where organization_id = get_user_org_id()
    ) and is_admin()
  );

-- RLS Policies: avatar_positions
create policy "Members can view positions in their org" on avatar_positions
  for select using (
    office_map_id in (
      select id from office_maps where organization_id = get_user_org_id()
    )
  );

create policy "Users can update own position" on avatar_positions
  for all using (user_id = auth.uid());

create policy "Members can insert positions" on avatar_positions
  for insert with check (user_id = auth.uid());

-- RLS Policies: livekit_rooms
create policy "Members can view livekit rooms in their org" on livekit_rooms
  for select using (
    zone_id in (
      select z.id from zones z
      join office_maps m on m.id = z.office_map_id
      where m.organization_id = get_user_org_id()
    )
  );

create policy "Admins can manage livekit rooms" on livekit_rooms
  for all using (
    zone_id in (
      select z.id from zones z
      join office_maps m on m.id = z.office_map_id
      where m.organization_id = get_user_org_id()
    ) and is_admin()
  );
