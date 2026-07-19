export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = "pending" | "backlog" | "today" | "done";
export type TaskSource = "voice" | "text";
export type PlanMode = "focus" | "admin" | "balanced";

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  user_id: string;
  raw_input: string;
  title: string;
  priority: TaskPriority;
  due_date: string | null;
  scheduled_time: string | null;
  status: TaskStatus;
  source: TaskSource;
  created_at: string;
  completed_at: string | null;
  notes?: string;
  subtasks?: Subtask[];
  tags?: string[];
  estimated_minutes?: number;
}

export interface ParsedTask {
  title: string;
  priority: TaskPriority;
  due_date: string | null;
  scheduled_time: string | null;
  tags?: string[];
  estimated_minutes?: number;
}
