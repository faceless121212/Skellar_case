"use client";

import { useState, useRef, useEffect } from "react";
import { Check, X, Pencil, ArrowRight, Clock, Calendar, CheckCircle2, Flag } from "lucide-react";
import type { Task, TaskPriority } from "@/lib/types";

const priorityConfig: Record<TaskPriority, { dot: string; bg: string; chip: string; chipActive: string; label: string }> = {
  high: {
    dot: "bg-red-500",
    bg: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400",
    chip: "border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30",
    chipActive: "bg-red-500 text-white border-red-500 shadow-sm shadow-red-500/25 dark:bg-red-600 dark:border-red-600",
    label: "High",
  },
  medium: {
    dot: "bg-amber-500",
    bg: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
    chip: "border-amber-200 text-amber-600 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/30",
    chipActive: "bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-500/25 dark:bg-amber-600 dark:border-amber-600",
    label: "Med",
  },
  low: {
    dot: "bg-emerald-500",
    bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
    chip: "border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30",
    chipActive: "bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/25 dark:bg-emerald-600 dark:border-emerald-600",
    label: "Low",
  },
};

const priorities: TaskPriority[] = ["high", "medium", "low"];

interface TaskCardProps {
  task: Task;
  mode: "inbox" | "today" | "backlog";
  onUpdate: (id: string, updates: Partial<Task>) => Promise<boolean | undefined>;
  onDelete?: (id: string) => Promise<boolean | undefined>;
  index?: number;
}

function formatDate(dateStr: string): string {
  const today = new Date();
  const date = new Date(dateStr + "T00:00:00");
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

export function TaskCard({ task, mode, onUpdate, onDelete, index = 0 }: TaskCardProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [dueDate, setDueDate] = useState(task.due_date ?? "");
  const [scheduledTime, setScheduledTime] = useState(task.scheduled_time ?? "");
  const isDone = task.status === "done";
  const config = priorityConfig[task.priority];
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  function handleSave() {
    if (!title.trim()) return;
    onUpdate(task.id, {
      title: title.trim(),
      priority,
      due_date: dueDate || null,
      scheduled_time: scheduledTime || null,
    });
    setEditing(false);
  }

  function handleCancel() {
    setTitle(task.title);
    setPriority(task.priority);
    setDueDate(task.due_date ?? "");
    setScheduledTime(task.scheduled_time ?? "");
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  }

  const isOverdue = task.due_date && task.due_date < new Date().toISOString().split("T")[0] && !isDone;

  if (editing) {
    return (
      <div
        className="rounded-2xl border border-primary/30 bg-card p-4 shadow-md shadow-primary/5 animate-fade-in"
        onKeyDown={handleKeyDown}
      >
        {/* Title input */}
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title..."
          className="w-full bg-transparent text-[15px] font-medium placeholder:text-muted-foreground/40 focus:outline-none pb-3 border-b border-border/50"
        />

        {/* Priority chips */}
        <div className="flex items-center gap-4 pt-3">
          <div className="flex items-center gap-1">
            <Flag className="h-3.5 w-3.5 text-muted-foreground/60 mr-1" />
            {priorities.map((p) => {
              const pc = priorityConfig[p];
              const isActive = priority === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`
                    rounded-full border px-3 py-1 text-[11px] font-semibold transition-all duration-150 active:scale-95
                    ${isActive ? pc.chipActive : pc.chip}
                  `}
                >
                  {pc.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Date & time row */}
        <div className="flex items-center gap-2 pt-3 flex-wrap">
          <label className="relative inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-2.5 py-1.5 text-xs text-muted-foreground hover:border-border transition-colors cursor-pointer">
            <Calendar className="h-3.5 w-3.5" />
            <span>{dueDate ? formatDate(dueDate) : "Add date"}</span>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
            />
            {dueDate && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setDueDate(""); }}
                className="ml-0.5 rounded-full hover:bg-muted p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </label>

          <label className="relative inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-2.5 py-1.5 text-xs text-muted-foreground hover:border-border transition-colors cursor-pointer">
            <Clock className="h-3.5 w-3.5" />
            <span>{scheduledTime ? formatTime(scheduledTime) : "Add time"}</span>
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
            />
            {scheduledTime && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setScheduledTime(""); }}
                className="ml-0.5 rounded-full hover:bg-muted p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 mt-1 border-t border-border/30">
          <p className="text-[10px] text-muted-foreground/50">
            Enter to save &middot; Esc to cancel
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!title.trim()}
              className="rounded-lg bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 active:scale-95 transition-all disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        group rounded-2xl border bg-card p-4 transition-all duration-200
        hover:shadow-sm hover:border-border/80
        ${isDone ? "opacity-50" : ""}
      `}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start gap-3">
        {mode === "today" && (
          <button
            onClick={() => onUpdate(task.id, { status: isDone ? "today" : "done" })}
            className={`
              mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200
              ${isDone
                ? "border-primary bg-primary text-primary-foreground"
                : "border-muted-foreground/25 hover:border-primary hover:bg-primary/5"
              }
            `}
          >
            {isDone && <Check className="h-2.5 w-2.5 stroke-[3]" />}
          </button>
        )}

        <div className="flex-1 min-w-0">
          <p className={`text-[15px] font-medium leading-snug ${isDone ? "line-through text-muted-foreground" : ""}`}>
            {task.title}
          </p>

          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${config.bg}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
              {config.label}
            </span>

            {task.due_date && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                isOverdue
                  ? "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                  : "text-muted-foreground bg-muted/50"
              }`}>
                <Calendar className="h-3 w-3" />
                {formatDate(task.due_date)}
              </span>
            )}

            {task.scheduled_time && (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-muted-foreground bg-muted/50">
                <Clock className="h-3 w-3" />
                {formatTime(task.scheduled_time)}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons — always visible on mobile, hover on desktop */}
        <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
          {mode === "inbox" && (
            <>
              <ActionButton onClick={() => setEditing(true)} title="Edit">
                <Pencil className="h-3.5 w-3.5" />
              </ActionButton>
              <ActionButton onClick={() => onUpdate(task.id, { status: "backlog" })} title="Confirm" accent>
                <CheckCircle2 className="h-3.5 w-3.5" />
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
