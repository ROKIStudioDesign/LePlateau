-- Work schedule status enum
create type work_schedule_status as enum (
  'office',
  'remote',
  'vacation',
  'sick',
  'absent',
  'rtt'
);

-- Work schedules: one row per user per day
create table work_schedules (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references profiles(id) on delete cascade,
  organization_id  uuid not null references organizations(id) on delete cascade,
  date             date not null,
  status           work_schedule_status not null default 'office',
  note             text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique(user_id, date)
);

-- Schedule templates: default weekly pattern per member
create table schedule_templates (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references profiles(id) on delete cascade,
  organization_id  uuid not null references organizations(id) on delete cascade,
  mon              work_schedule_status not null default 'office',
  tue              work_schedule_status not null default 'office',
  wed              work_schedule_status not null default 'office',
  thu              work_schedule_status not null default 'office',
  fri              work_schedule_status not null default 'office',
  created_at       timestamptz not null default now(),
  unique(user_id)
);

-- Auto-update updated_at on work_schedules
create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger work_schedules_updated_at
  before update on work_schedules
  for each row execute function update_updated_at_column();

-- RLS: work_schedules
alter table work_schedules enable row level security;

-- Members can read all schedules in their org
create policy "org members can read schedules"
  on work_schedules for select
  using (
    organization_id in (
      select organization_id from profiles where id = auth.uid()
    )
  );

-- Members can insert/update only their own schedule
create policy "members can upsert own schedule"
  on work_schedules for insert
  with check (user_id = auth.uid());

create policy "members can update own schedule"
  on work_schedules for update
  using (user_id = auth.uid());

-- Admins can upsert any schedule in their org
create policy "admins can upsert any schedule"
  on work_schedules for all
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
        and organization_id = work_schedules.organization_id
        and role = 'admin'
    )
  );

-- RLS: schedule_templates
alter table schedule_templates enable row level security;

create policy "org members can read templates"
  on schedule_templates for select
  using (
    organization_id in (
      select organization_id from profiles where id = auth.uid()
    )
  );

create policy "members can upsert own template"
  on schedule_templates for insert
  with check (user_id = auth.uid());

create policy "members can update own template"
  on schedule_templates for update
  using (user_id = auth.uid());
