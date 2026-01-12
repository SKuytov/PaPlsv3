-- Blade Lifecycle Tracking System - FIXED VERSION
-- Migration: 005-blade-lifecycle-tracking-FIXED.sql
-- Created: 2026-01-12
-- Fixed: 2026-01-12 - Removed dependency on user_roles table
-- Purpose: Create tables for tracking blade/knife lifecycle, usage, and maintenance

-- ============================================
-- Create blade_types table
-- ============================================
create table if not exists blade_types (
  id uuid primary key default gen_random_uuid(),
  name varchar(255) not null,
  code varchar(50) unique not null,
  description text,
  machine_type varchar(100) not null, -- 'cotton_pad_cutter', 'wet_wipes_1', 'wet_wipes_2', 'cotton_felt_1', 'cotton_felt_2'
  manufacturer varchar(255),
  cost_per_unit decimal(10, 2),
  expected_lifecycle_hours integer, -- Expected hours before blade needs replacement
  sharpening_interval_hours integer, -- Hours between sharpening cycles
  max_sharpenings integer, -- Maximum times a blade can be sharpened
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

-- ============================================
-- Create blades (individual units) table
-- ============================================
create table if not exists blades (
  id uuid primary key default gen_random_uuid(),
  blade_type_id uuid not null references blade_types(id),
  serial_number varchar(100) unique not null,
  asset_number varchar(100),
  purchase_date date not null,
  installation_date date,
  status varchar(50) not null default 'new', -- 'new', 'active', 'in_maintenance', 'dull', 'damaged', 'retired'
  total_usage_hours decimal(10, 2) default 0,
  total_sharpenings integer default 0,
  last_sharpening_date timestamp with time zone,
  last_usage_date timestamp with time zone,
  current_machine_id uuid,
  location_notes text,
  notes text,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

-- ============================================
-- Create blade_usage_logs table
-- ============================================
create table if not exists blade_usage_logs (
  id uuid primary key default gen_random_uuid(),
  blade_id uuid not null references blades(id) on delete cascade,
  machine_id uuid,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone,
  duration_hours decimal(10, 2),
  cut_count integer, -- Number of cuts made
  material_processed varchar(255), -- Description of material processed
  operator_id uuid references auth.users(id),
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- ============================================
-- Create blade_sharpening_history table
-- ============================================
create table if not exists blade_sharpening_history (
  id uuid primary key default gen_random_uuid(),
  blade_id uuid not null references blades(id) on delete cascade,
  sharpening_number integer not null,
  sharpening_date timestamp with time zone not null default now(),
  sharpened_by uuid references auth.users(id),
  sharpening_method varchar(100), -- 'manual', 'automated', 'professional_service'
  duration_minutes integer,
  notes text,
  next_sharpening_scheduled_date date,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- ============================================
-- Create blade_maintenance_logs table
-- ============================================
create table if not exists blade_maintenance_logs (
  id uuid primary key default gen_random_uuid(),
  blade_id uuid not null references blades(id) on delete cascade,
  maintenance_type varchar(100) not null, -- 'sharpening', 'inspection', 'repair', 'cleaning', 'storage'
  status varchar(50) not null, -- 'scheduled', 'in_progress', 'completed', 'failed'
  start_date timestamp with time zone not null,
  end_date timestamp with time zone,
  technician_id uuid references auth.users(id),
  description text,
  findings text,
  recommendations text,
  cost decimal(10, 2),
  parts_replaced text,
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- ============================================
-- Create blade_alerts table
-- ============================================
create table if not exists blade_alerts (
  id uuid primary key default gen_random_uuid(),
  blade_id uuid not null references blades(id) on delete cascade,
  alert_type varchar(100) not null, -- 'replacement_due', 'sharpening_due', 'damage_detected', 'lifecycle_exceeded', 'usage_anomaly'
  severity varchar(50) not null default 'medium', -- 'low', 'medium', 'high', 'critical'
  message text not null,
  is_resolved boolean default false,
  resolved_at timestamp with time zone,
  resolved_by uuid references auth.users(id),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- ============================================
-- Create indexes for better query performance
-- ============================================
create index if not exists idx_blades_serial_number on blades(serial_number);
create index if not exists idx_blades_blade_type_id on blades(blade_type_id);
create index if not exists idx_blades_current_machine_id on blades(current_machine_id);
create index if not exists idx_blades_status on blades(status);
create index if not exists idx_blade_usage_logs_blade_id on blade_usage_logs(blade_id);
create index if not exists idx_blade_usage_logs_machine_id on blade_usage_logs(machine_id);
create index if not exists idx_blade_usage_logs_start_time on blade_usage_logs(start_time);
create index if not exists idx_blade_sharpening_blade_id on blade_sharpening_history(blade_id);
create index if not exists idx_blade_maintenance_blade_id on blade_maintenance_logs(blade_id);
create index if not exists idx_blade_maintenance_status on blade_maintenance_logs(status);
create index if not exists idx_blade_alerts_blade_id on blade_alerts(blade_id);
create index if not exists idx_blade_alerts_is_resolved on blade_alerts(is_resolved);

-- ============================================
-- Enable Row Level Security
-- ============================================
alter table blade_types enable row level security;
alter table blades enable row level security;
alter table blade_usage_logs enable row level security;
alter table blade_sharpening_history enable row level security;
alter table blade_maintenance_logs enable row level security;
alter table blade_alerts enable row level security;

-- ============================================
-- Create RLS Policies (Simplified - No user_roles dependency)
-- ============================================

-- blade_types: Read for all authenticated users
create policy "blade_types_select_authenticated" on blade_types
  for select
  using (auth.role() = 'authenticated');

create policy "blade_types_insert_authenticated" on blade_types
  for insert
  with check (auth.role() = 'authenticated');

create policy "blade_types_update_authenticated" on blade_types
  for update
  using (auth.role() = 'authenticated');

-- blades: Read and write for all authenticated users
create policy "blades_select_authenticated" on blades
  for select
  using (auth.role() = 'authenticated');

create policy "blades_insert_authenticated" on blades
  for insert
  with check (auth.role() = 'authenticated');

create policy "blades_update_authenticated" on blades
  for update
  using (auth.role() = 'authenticated');

-- blade_usage_logs: Read and write for all authenticated
create policy "blade_usage_logs_select_authenticated" on blade_usage_logs
  for select
  using (auth.role() = 'authenticated');

create policy "blade_usage_logs_insert_authenticated" on blade_usage_logs
  for insert
  with check (auth.role() = 'authenticated');

-- blade_sharpening_history: Read and write for all authenticated
create policy "blade_sharpening_select_authenticated" on blade_sharpening_history
  for select
  using (auth.role() = 'authenticated');

create policy "blade_sharpening_insert_authenticated" on blade_sharpening_history
  for insert
  with check (auth.role() = 'authenticated');

-- blade_maintenance_logs: Read and write for all authenticated
create policy "blade_maintenance_select_authenticated" on blade_maintenance_logs
  for select
  using (auth.role() = 'authenticated');

create policy "blade_maintenance_insert_authenticated" on blade_maintenance_logs
  for insert
  with check (auth.role() = 'authenticated');

create policy "blade_maintenance_update_authenticated" on blade_maintenance_logs
  for update
  using (auth.role() = 'authenticated');

-- blade_alerts: Read and write for all authenticated
create policy "blade_alerts_select_authenticated" on blade_alerts
  for select
  using (auth.role() = 'authenticated');

create policy "blade_alerts_update_authenticated" on blade_alerts
  for update
  using (auth.role() = 'authenticated');
