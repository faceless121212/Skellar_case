export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = "pending" | "backlog" | "today" | "done";
export type TaskSource = "voice" | "text";

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
}

export interface ParsedTask {
  title: string;
  priority: TaskPriority;
  due_date: string | null;
  scheduled_time: string | null;
}
