"use client";

import { useState } from "react";
import { Check, X, Pencil, ArrowRight, Clock, Calendar } from "lucide-react";
import type { Task, TaskPriority } from "@/lib/types";

const priorityConfig: Record<TaskPriority, { dot: string; bg: string; label: string }> = {
  high: { dot: "bg-red-500", bg: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400", label: "High" },
  medium: { dot: "bg-amber-500", bg: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400", label: "Medium" },
  low: { dot: "bg-emerald-500", bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400", label: "Low" },
};

interface TaskCardProps {
  task: Task;
  mode: "inbox" | "today" | "backlog";
  onUpdate: (id: string, updates: Partial<Task>) => Promise<boolean | undefined>;
  onDelete?: (id: string) => Promise<boolean | undefined>;
  index?: number;
}

export function TaskCard({ task, mode, onUpdate, onDelete, index = 0 }: TaskCardProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [dueDate, setDueDate] = useState(task.due_date ?? "");
  const [scheduledTime, setScheduledTime] = useState(task.scheduled_time ?? "");
  const isDone = task.status === "done";
  const config = priorityConfig[task.priority];

  function handleSave() {
    onUpdate(task.id, {
      title,
      priority,
      due_date: dueDate || null,
      scheduled_time: scheduledTime || null,
    });
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="rounded-xl border-2 border-primary/20 bg-card p-4 space-y-3 shadow-sm animate-fade-in">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
          autoFocus
        />
        <div className="flex flex-wrap gap-2">
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <input
            type="time"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Save
          </button>
          <button
            onClick={() => setEditing(false)}
            className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        group rounded-xl border bg-card p-4 transition-all duration-200
        hover:shadow-sm hover:border-border/80
        ${isDone ? "opacity-60" : ""}
      `}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start gap-3">
        {mode === "today" && (
          <button
            onClick={() => onUpdate(task.id, { status: isDone ? "today" : "done" })}
            className={`
              mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200
              ${isDone
                ? "border-primary bg-primary text-primary-foreground"
                : "border-muted-foreground/30 hover:border-primary hover:bg-primary/10"
              }
            `}
          >
            {isDone && <Check className="h-3 w-3 stroke-[3]" />}
          </button>
        )}

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium leading-snug ${isDone ? "line-through text-muted-foreground" : ""}`}>
            {task.title}
          </p>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${config.bg}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
              {config.label}
            </span>

            {task.due_date && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {task.due_date}
              </span>
            )}

            {task.scheduled_time && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                {task.scheduled_time}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {mode === "inbox" && (
            <>
              <ActionButton onClick={() => setEditing(true)} title="Edit">
                <Pencil className="h-3.5 w-3.5" />
              </ActionButton>
              <ActionButton onClick={() => onUpdate(task.id, { status: "today" })} title="Add to today" accent>
                <ArrowRight className="h-3.5 w-3.5" />
              </ActionButton>
              <ActionButton onClick={() => onDelete?.(task.id)} title="Discard" destructive>
                <X className="h-3.5 w-3.5" />
              </ActionButton>
            </>
          )}
          {mode === "today" && !isDone && (
            <ActionButton onClick={() => setEditing(true)} title="Edit">
              <Pencil className="h-3.5 w-3.5" />
            </ActionButton>
          )}
          {mode === "backlog" && (
            <>
              <ActionButton onClick={() => onUpdate(task.id, { status: "today" })} title="Add to today" accent>
                <ArrowRight className="h-3.5 w-3.5" />
              </ActionButton>
              <ActionButton onClick={() => setEditing(true)} title="Edit">
                <Pencil className="h-3.5 w-3.5" />
              </ActionButton>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  onClick,
  title,
  children,
  accent,
  destructive,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  accent?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`
        flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 active:scale-90
        ${destructive
          ? "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          : accent
            ? "text-muted-foreground hover:text-primary hover:bg-primary/10"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        }
      `}
    >
      {children}
    </button>
  );
}
