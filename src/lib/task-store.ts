"use client";

import type { Task, TaskStatus, ParsedTask, TaskSource } from "@/lib/types";

const STORAGE_KEY = "ai-planner-tasks";

function generateId(): string {
  return crypto.randomUUID();
}

function loadTasks(): Task[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTasks(tasks: Task[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

export function getTasks(status?: TaskStatus): Task[] {
  const tasks = loadTasks();
  if (status) return tasks.filter((t) => t.status === status);
  return tasks;
}

export function addTasks(
  parsedTasks: ParsedTask[],
  rawInput: string,
  source: TaskSource
): Task[] {
  const existing = loadTasks();
  const now = new Date().toISOString();
  const newTasks: Task[] = parsedTasks.map((t) => ({
    id: generateId(),
    user_id: "local",
    raw_input: rawInput,
    title: t.title,
    priority: t.priority,
    due_date: t.due_date,
    scheduled_time: t.scheduled_time,
    status: "backlog" as TaskStatus,
    source,
    created_at: now,
    completed_at: null,
  }));

  saveTasks([...newTasks, ...existing]);
  return newTasks;
}

export function updateTask(id: string, updates: Partial<Task>): Task | null {
  const tasks = loadTasks();
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1) return null;

  if (updates.status === "done") {
    updates.completed_at = new Date().toISOString();
  }

  tasks[idx] = { ...tasks[idx], ...updates };
  saveTasks(tasks);
  return tasks[idx];
}

export function deleteTask(id: string): boolean {
  const tasks = loadTasks();
  const filtered = tasks.filter((t) => t.id !== id);
  if (filtered.length === tasks.length) return false;
  saveTasks(filtered);
  return true;
}

export function planMyDay(): number {
  const tasks = loadTasks();
  const today = new Date().toISOString().split("T")[0];

  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  let moved = 0;

  const updated = tasks.map((t) => {
    if (
      t.status === "backlog" &&
      (t.due_date === null || t.due_date <= today)
    ) {
      moved++;
      return { ...t, status: "today" as TaskStatus };
    }
    return t;
  });

  updated.sort((a, b) => {
    const pa = priorityOrder[a.priority] ?? 1;
    const pb = priorityOrder[b.priority] ?? 1;
    return pa - pb;
  });

  saveTasks(updated);
  return moved;
}
