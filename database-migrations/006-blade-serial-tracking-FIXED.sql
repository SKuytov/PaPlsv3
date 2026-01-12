-- Blade Serial Number Counter System - FIXED VERSION
-- Migration: 006-blade-serial-tracking-FIXED.sql
-- Created: 2026-01-12
-- Fixed: 2026-01-12 - Removed dependency on user_roles table
-- Purpose: Track and manage sequential serial number allocation for blade types

-- ============================================
-- Create blade_serial_counter table
-- ============================================
create table if not exists blade_serial_counter (
  id uuid primary key default gen_random_uuid(),
  blade_type_id uuid not null unique references blade_types(id) on delete cascade,
  serial_prefix varchar(10) not null, -- e.g., 'B4', 'B1', 'WW1' etc
  current_counter integer not null default 1, -- Last assigned number
  total_allocated integer not null default 0, -- Total blades allocated (purchased)
  total_active integer not null default 0, -- Currently in use or in stock
  total_retired integer not null default 0, -- Retired/decommissioned
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- ============================================
-- Create blade_purchase_order table
-- ============================================
create table if not exists blade_purchase_order (
  id uuid primary key default gen_random_uuid(),
  blade_type_id uuid not null references blade_types(id),
  order_date date not null default now(),
  quantity_ordered integer not null,
  serial_number_start varchar(20) not null, -- e.g., 'B400001'
  serial_number_end varchar(20) not null,   -- e.g., 'B400060'
  supplier_name varchar(255),
  po_number varchar(100), -- Purchase order reference number
  invoice_number varchar(100),
  unit_cost decimal(10, 2),
  total_cost decimal(12, 2),
  expected_delivery_date date,
  actual_delivery_date date,
  status varchar(50) not null default 'pending', -- pending, received, partial, cancelled
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- ============================================
-- Create blade_retirement_record table
-- ============================================
create table if not exists blade_retirement_record (
  id uuid primary key default gen_random_uuid(),
  blade_id uuid not null unique references blades(id) on delete cascade,
  serial_number varchar(20) not null,
  blade_type_id uuid not null references blade_types(id),
  retirement_date timestamp with time zone not null default now(),
  retirement_reason varchar(100) not null, -- 'lifecycle_exceeded', 'damage', 'wear', 'manual_retirement'
  total_usage_hours decimal(10, 2),
  total_sharpenings integer,
  notes text,
  retired_by uuid references auth.users(id),
  created_at timestamp with time zone default now()
);

-- ============================================
-- Create blade_inventory_summary table
-- ============================================
create table if not exists blade_inventory_summary (
  id uuid primary key default gen_random_uuid(),
  blade_type_id uuid not null unique references blade_types(id),
  total_allocated integer not null default 0, -- All blades ever allocated
  total_active integer not null default 0, -- In service
  total_in_maintenance integer not null default 0, -- Being serviced
  total_dull integer not null default 0, -- Waiting for sharpening
  total_damaged integer not null default 0, -- Cannot use
  total_retired integer not null default 0, -- End of life
  total_new_unused integer not null default 0, -- Never used
  average_usage_hours decimal(10, 2),
  next_serial_number integer, -- Next number to assign (for convenience)
  reorder_point integer, -- Alert when active count falls below this
  last_updated timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- ============================================
-- Create indexes
-- ============================================
create index if not exists idx_blade_serial_counter_blade_type on blade_serial_counter(blade_type_id);
create index if not exists idx_blade_serial_counter_prefix on blade_serial_counter(serial_prefix);
create index if not exists idx_blade_purchase_order_blade_type on blade_purchase_order(blade_type_id);
create index if not exists idx_blade_purchase_order_status on blade_purchase_order(status);
create index if not exists idx_blade_purchase_order_date on blade_purchase_order(order_date);
create index if not exists idx_blade_retirement_serial on blade_retirement_record(serial_number);
create index if not exists idx_blade_retirement_blade_type on blade_retirement_record(blade_type_id);
create index if not exists idx_blade_retirement_date on blade_retirement_record(retirement_date);
create index if not exists idx_blade_inventory_summary_blade_type on blade_inventory_summary(blade_type_id);

-- ============================================
-- Enable Row Level Security
-- ============================================
alter table blade_serial_counter enable row level security;
alter table blade_purchase_order enable row level security;
alter table blade_retirement_record enable row level security;
alter table blade_inventory_summary enable row level security;

-- ============================================
-- Create RLS Policies (Simplified - No user_roles dependency)
-- ============================================

-- blade_serial_counter: Read for all, write for all authenticated
create policy "blade_serial_counter_select_authenticated" on blade_serial_counter
  for select
  using (auth.role() = 'authenticated');

create policy "blade_serial_counter_update_authenticated" on blade_serial_counter
  for update
  using (auth.role() = 'authenticated');

-- blade_purchase_order: Read for all, write for authenticated
create policy "blade_purchase_order_select_authenticated" on blade_purchase_order
  for select
  using (auth.role() = 'authenticated');

create policy "blade_purchase_order_insert_authenticated" on blade_purchase_order
  for insert
  with check (auth.role() = 'authenticated');

create policy "blade_purchase_order_update_authenticated" on blade_purchase_order
  for update
  using (auth.role() = 'authenticated');

-- blade_retirement_record: Read for all, write for authenticated
create policy "blade_retirement_record_select_authenticated" on blade_retirement_record
  for select
  using (auth.role() = 'authenticated');

create policy "blade_retirement_record_insert_authenticated" on blade_retirement_record
  for insert
  with check (auth.role() = 'authenticated');

-- blade_inventory_summary: Read only for authenticated
create policy "blade_inventory_summary_select_authenticated" on blade_inventory_summary
  for select
  using (auth.role() = 'authenticated');

-- ============================================
-- Create Functions for Serial Number Management
-- ============================================

-- Function to generate next serial number for a blade type
create or replace function generate_next_serial_number(blade_type_id_param uuid)
returns varchar as $$
declare
  next_num integer;
  prefix varchar;
  serial_number varchar;
begin
  -- Get the serial prefix and increment counter
  update blade_serial_counter
  set current_counter = current_counter + 1,
      total_allocated = total_allocated + 1,
      updated_at = now()
  where blade_type_id = blade_type_id_param
  returning serial_prefix, current_counter into prefix, next_num;
  
  if prefix is null then
    raise exception 'Blade type not found or serial counter not initialized';
  end if;
  
  -- Generate serial number: prefix + zero-padded counter
  -- Example: B4 + 00043 = B400043
  serial_number := prefix || lpad(next_num::text, 5, '0');
  
  return serial_number;
end;
$$ language plpgsql security definer;

-- Function to retire a blade and update counters
create or replace function retire_blade(
  blade_id_param uuid,
  reason varchar,
  notes_param text default null
)
returns boolean as $$
declare
  blade_record record;
  user_id uuid;
begin
  -- Get current user
  user_id := auth.uid();
  if user_id is null then
    raise exception 'User not authenticated';
  end if;
  
  -- Get blade information
  select id, serial_number, blade_type_id, total_usage_hours, total_sharpenings
  into blade_record
  from blades
  where id = blade_id_param;
  
  if blade_record.id is null then
    raise exception 'Blade not found';
  end if;
  
  -- Create retirement record
  insert into blade_retirement_record (
    blade_id, serial_number, blade_type_id, retirement_reason,
    total_usage_hours, total_sharpenings, notes, retired_by
  ) values (
    blade_id_param, blade_record.serial_number, blade_record.blade_type_id,
    reason, blade_record.total_usage_hours, blade_record.total_sharpenings,
    notes_param, user_id
  );
  
  -- Update blade status to retired
  update blades
  set status = 'retired',
      is_active = false,
      updated_at = now(),
      updated_by = user_id
  where id = blade_id_param;
  
  -- Update inventory counter
  update blade_serial_counter
  set total_retired = total_retired + 1,
      updated_at = now()
  where blade_type_id = blade_record.blade_type_id;
  
  return true;
end;
$$ language plpgsql security definer;

-- Function to create purchase order and auto-generate blades
create or replace function create_purchase_order_with_blades(
  blade_type_id_param uuid,
  quantity_param integer,
  supplier_name_param varchar,
  po_number_param varchar default null,
  unit_cost_param decimal default null
)
returns table(order_id uuid, serial_start varchar, serial_end varchar, blades_created integer) as $$
declare
  serial_start varchar;
  serial_end varchar;
  counter_record record;
  order_id_var uuid;
  i integer;
  current_serial varchar;
  user_id uuid;
begin
  user_id := auth.uid();
  if user_id is null then
    raise exception 'User not authenticated';
  end if;
  
  -- Get current counter state
  select * into counter_record
  from blade_serial_counter
  where blade_type_id = blade_type_id_param
  for update;
  
  if counter_record.id is null then
    raise exception 'Blade type not found';
  end if;
  
  -- Calculate serial number range
  serial_start := counter_record.serial_prefix || lpad((counter_record.current_counter + 1)::text, 5, '0');
  
  -- Create purchase order first
  insert into blade_purchase_order (
    blade_type_id, quantity_ordered, serial_number_start, serial_number_end,
    supplier_name, po_number, unit_cost, total_cost, status, created_by
  ) values (
    blade_type_id_param, quantity_param, serial_start,
    counter_record.serial_prefix || lpad((counter_record.current_counter + quantity_param)::text, 5, '0'),
    supplier_name_param, po_number_param, unit_cost_param,
    case when unit_cost_param is not null then unit_cost_param * quantity_param else null end,
    'received', user_id
  )
  returning blade_purchase_order.id into order_id_var;
  
  -- Create blade records for each quantity
  for i in 1..quantity_param loop
    current_serial := counter_record.serial_prefix || lpad((counter_record.current_counter + i)::text, 5, '0');
    
    insert into blades (
      blade_type_id, serial_number, purchase_date, status,
      created_by, updated_by
    ) values (
      blade_type_id_param, current_serial, now()::date, 'new',
      user_id, user_id
    );
  end loop;
  
  -- Update serial counter
  update blade_serial_counter
  set current_counter = current_counter + quantity_param,
      total_allocated = total_allocated + quantity_param,
      total_active = total_active + quantity_param,
      updated_at = now()
  where blade_type_id = blade_type_id_param;
  
  serial_end := counter_record.serial_prefix || lpad((counter_record.current_counter + quantity_param)::text, 5, '0');
  
  return query select order_id_var, serial_start, serial_end, quantity_param;
end;
$$ language plpgsql security definer;

-- Function to initialize serial counter for new blade type
create or replace function initialize_blade_serial_counter(
  blade_type_id_param uuid,
  serial_prefix_param varchar
)
returns uuid as $$
declare
  counter_id uuid;
begin
  insert into blade_serial_counter (
    blade_type_id, serial_prefix, current_counter
  ) values (
    blade_type_id_param, serial_prefix_param, 0
  )
  returning id into counter_id;
  
  return counter_id;
end;
$$ language plpgsql security definer;

-- ============================================
-- Create Triggers
-- ============================================

-- Trigger to automatically update inventory summary when blade status changes
create or replace function update_inventory_summary()
returns trigger as $$
begin
  update blade_inventory_summary
  set 
    total_active = (select count(*) from blades where blade_type_id = new.blade_type_id and status = 'active'),
    total_new_unused = (select count(*) from blades where blade_type_id = new.blade_type_id and status = 'new'),
    total_in_maintenance = (select count(*) from blades where blade_type_id = new.blade_type_id and status = 'in_maintenance'),
    total_dull = (select count(*) from blades where blade_type_id = new.blade_type_id and status = 'dull'),
    total_damaged = (select count(*) from blades where blade_type_id = new.blade_type_id and status = 'damaged'),
    total_retired = (select count(*) from blades where blade_type_id = new.blade_type_id and status = 'retired'),
    average_usage_hours = (select avg(total_usage_hours) from blades where blade_type_id = new.blade_type_id),
    next_serial_number = (select current_counter from blade_serial_counter where blade_type_id = new.blade_type_id),
    updated_at = now()
  where blade_type_id = new.blade_type_id;
  
  return new;
end;
$$ language plpgsql;

create trigger tr_update_inventory_summary
after insert or update of status on blades
for each row
execute function update_inventory_summary();

-- ============================================
-- Initialize Serial Counters for Existing Blade Types
-- ============================================
insert into blade_serial_counter (blade_type_id, serial_prefix, current_counter)
select id, 
  case 
    when code like 'CUTTER%' then 'B' || substr(code, -1)
    when code like 'WIPES1%' then 'W1' || substr(code, -1)
    when code like 'WIPES2%' then 'W2' || substr(code, -1)
    when code like 'FELT1%' then 'F1' || substr(code, -1)
    when code like 'FELT2%' then 'F2' || substr(code, -1)
    else 'X' || substr(code, -1)
  end as serial_prefix,
  0
from blade_types
where id not in (select blade_type_id from blade_serial_counter)
on conflict do nothing;

-- ============================================
-- Initialize Inventory Summary
-- ============================================
insert into blade_inventory_summary (blade_type_id, total_allocated)
select id, 0
from blade_types
where id not in (select blade_type_id from blade_inventory_summary)
on conflict do nothing;
