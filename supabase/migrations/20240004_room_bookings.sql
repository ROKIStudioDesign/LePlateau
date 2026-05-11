-- Bookable rooms: the physical/virtual rooms that can be reserved
create table bookable_rooms (
  id               uuid primary key default uuid_generate_v4(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  zone_id          uuid references zones(id) on delete set null,
  name             text not null,
  capacity         int not null default 4,
  equipment        text[] not null default '{}',
  color            text not null default '#6366F1',
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);

-- Room bookings: reservations made by members
create table room_bookings (
  id               uuid primary key default uuid_generate_v4(),
  room_id          uuid not null references bookable_rooms(id) on delete cascade,
  user_id          uuid not null references profiles(id) on delete cascade,
  organization_id  uuid not null references organizations(id) on delete cascade,
  title            text not null,
  date             date not null,
  start_time       time not null,
  end_time         time not null,
  attendees_count  int not null default 1,
  note             text,
  created_at       timestamptz not null default now(),
  constraint valid_time_range check (start_time < end_time)
);

-- Prevent overlapping bookings for the same room on the same day
create or replace function check_booking_overlap()
returns trigger language plpgsql as $$
begin
  if exists (
    select 1 from room_bookings
    where room_id = new.room_id
      and date    = new.date
      and id     != coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
      and start_time < new.end_time
      and end_time   > new.start_time
  ) then
    raise exception 'BOOKING_OVERLAP: This room is already booked during that time slot';
  end if;
  return new;
end;
$$;

create trigger room_booking_no_overlap
  before insert or update on room_bookings
  for each row execute function check_booking_overlap();

-- RLS: bookable_rooms
alter table bookable_rooms enable row level security;

create policy "org members can read rooms"
  on bookable_rooms for select
  using (
    organization_id in (
      select organization_id from profiles where id = auth.uid()
    )
  );

create policy "admins can manage rooms"
  on bookable_rooms for all
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
        and organization_id = bookable_rooms.organization_id
        and role = 'admin'
    )
  );

-- RLS: room_bookings
alter table room_bookings enable row level security;

create policy "org members can read bookings"
  on room_bookings for select
  using (
    organization_id in (
      select organization_id from profiles where id = auth.uid()
    )
  );

create policy "members can create bookings"
  on room_bookings for insert
  with check (
    user_id = auth.uid()
    and organization_id in (
      select organization_id from profiles where id = auth.uid()
    )
  );

create policy "members can cancel own bookings"
  on room_bookings for delete
  using (user_id = auth.uid());

create policy "members can update own bookings"
  on room_bookings for update
  using (user_id = auth.uid());

create policy "admins can manage all bookings"
  on room_bookings for all
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
        and organization_id = room_bookings.organization_id
        and role = 'admin'
    )
  );
