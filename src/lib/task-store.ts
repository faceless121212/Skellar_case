"use client";

import type { Task, TaskStatus, ParsedTask, TaskSource, Subtask } from "@/lib/types";

const STORAGE_KEY = "ai-planner-tasks";
const HISTORY_KEY = "ai-planner-history";

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

export function getTasksByDateRange(start: string, end: string): Task[] {
  const tasks = loadTasks();
  return tasks.filter((t) => {
    if (t.status === "done" && t.completed_at) {
      const doneDate = t.completed_at.split("T")[0];
      return doneDate >= start && doneDate <= end;
    }
    if (t.due_date) {
      return t.due_date >= start && t.due_date <= end;
    }
    if (t.status === "today") return true;
    return false;
  });
}

export function getTaskById(id: string): Task | null {
  const tasks = loadTasks();
  return tasks.find((t) => t.id === id) ?? null;
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
    status: "pending" as TaskStatus,
    source,
    created_at: now,
    completed_at: null,
    notes: "",
    subtasks: [],
    tags: t.tags ?? [],
    estimated_minutes: t.estimated_minutes ?? undefined,
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

  const today = new Date().toISOString().split("T")[0];
  const newDueDate = updates.due_date !== undefined ? updates.due_date : tasks[idx].due_date;
  const newStatus = updates.status !== undefined ? updates.status : tasks[idx].status;
  if (newDueDate && newDueDate !== today && newStatus === "today") {
    updates.status = "pending";
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

export function addSubtask(taskId: string, title: string): Subtask | null {
  const tasks = loadTasks();
  const idx = tasks.findIndex((t) => t.id === taskId);
  if (idx === -1) return null;

  const subtask: Subtask = { id: generateId(), title, done: false };
  const subtasks = tasks[idx].subtasks ?? [];
  tasks[idx] = { ...tasks[idx], subtasks: [...subtasks, subtask] };
  saveTasks(tasks);
  return subtask;
}

export function toggleSubtask(taskId: string, subtaskId: string): boolean {
  const tasks = loadTasks();
  const idx = tasks.findIndex((t) => t.id === taskId);
  if (idx === -1) return false;

  const subtasks = (tasks[idx].subtasks ?? []).map((s) =>
    s.id === subtaskId ? { ...s, done: !s.done } : s
  );
  tasks[idx] = { ...tasks[idx], subtasks };
  saveTasks(tasks);
  return true;
}

export function deleteSubtask(taskId: string, subtaskId: string): boolean {
  const tasks = loadTasks();
  const idx = tasks.findIndex((t) => t.id === taskId);
  if (idx === -1) return false;

  const subtasks = (tasks[idx].subtasks ?? []).filter((s) => s.id !== subtaskId);
  tasks[idx] = { ...tasks[idx], subtasks };
  saveTasks(tasks);
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

export function autoCompleteOverdue(): number {
  const tasks = loadTasks();
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  let completed = 0;

  const updated = tasks.map((t) => {
    if (t.status === "today" && t.scheduled_time && t.due_date) {
      if (t.due_date < todayStr || (t.due_date === todayStr && t.scheduled_time < currentTime)) {
        completed++;
        return { ...t, status: "done" as TaskStatus, completed_at: now.toISOString() };
      }
    }
    return t;
  });

  if (completed > 0) saveTasks(updated);
  return completed;
}

export function carryOverUnfinished(): number {
  const tasks = loadTasks();
  const today = new Date().toISOString().split("T")[0];
  let carried = 0;

  const updated = tasks.map((t) => {
    if (t.status === "today" && t.due_date && t.due_date < today) {
      carried++;
      return { ...t, due_date: today };
    }
    return t;
  });

  saveTasks(updated);
  return carried;
}

interface DayHistory {
  date: string;
  completed: number;
  total: number;
  tasks: { title: string; status: TaskStatus; priority: string }[];
}

export function getDayHistory(days = 7): DayHistory[] {
  const tasks = loadTasks();
  const history: DayHistory[] = [];

  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];

    const dayTasks = tasks.filter((t) => {
      if (t.completed_at && t.completed_at.split("T")[0] === dateStr) return true;
      if (t.due_date === dateStr) return true;
      return false;
    });

    history.push({
      date: dateStr,
      completed: dayTasks.filter((t) => t.status === "done").length,
      total: dayTasks.length,
      tasks: dayTasks.map((t) => ({ title: t.title, status: t.status, priority: t.priority })),
    });
  }

  return history;
}
