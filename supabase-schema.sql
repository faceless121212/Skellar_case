-- Run this in the Supabase SQL Editor to set up the database

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create custom types
create type task_priority as enum ('low', 'medium', 'high');
create type task_status as enum ('backlog', 'today', 'done');
create type task_source as enum ('voice', 'text');

-- Create tasks table
create table tasks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  raw_input text not null,
  title text not null,
  priority task_priority not null default 'medium',
  due_date date,
  scheduled_time time,
  status task_status not null default 'backlog',
  source task_source not null default 'text',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- Create index for common queries
create index idx_tasks_user_status on tasks(user_id, status);
create index idx_tasks_user_due_date on tasks(user_id, due_date);

-- Enable Row Level Security
alter table tasks enable row level security;

-- RLS policies: users can only access their own tasks
create policy "Users can view own tasks"
  on tasks for select
  using (auth.uid() = user_id);

create policy "Users can insert own tasks"
  on tasks for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tasks"
  on tasks for update
  using (auth.uid() = user_id);

create policy "Users can delete own tasks"
  on tasks for delete
  using (auth.uid() = user_id);
