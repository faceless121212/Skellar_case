"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, X, Pencil, ArrowRight } from "lucide-react";
import type { Task, TaskPriority } from "@/lib/types";

const priorityColors: Record<TaskPriority, string> = {
  high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

interface TaskCardProps {
  task: Task;
  mode: "inbox" | "today" | "backlog";
  onUpdate: (id: string, updates: Partial<Task>) => Promise<boolean | undefined>;
  onDelete?: (id: string) => Promise<boolean | undefined>;
}

export function TaskCard({ task, mode, onUpdate, onDelete }: TaskCardProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [dueDate, setDueDate] = useState(task.due_date ?? "");
  const [scheduledTime, setScheduledTime] = useState(task.scheduled_time ?? "");

  function handleSave() {
    onUpdate(task.id, {
      title,
      priority,
      due_date: dueDate || null,
      scheduled_time: scheduledTime || null,
    });
    setEditing(false);
  }

  function handleDone() {
    onUpdate(task.id, { status: "done" });
  }

  function handleAddToToday() {
    onUpdate(task.id, { status: "today" });
  }

  if (editing) {
    return (
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          autoFocus
        />
        <div className="flex flex-wrap gap-2">
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            className="rounded-md border border-input bg-background px-2 py-1 text-sm"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="rounded-md border border-input bg-background px-2 py-1 text-sm"
          />
          <input
            type="time"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            className="rounded-md border border-input bg-background px-2 py-1 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave}>
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4 flex items-start gap-3 group">
      {mode === "today" && (
        <button
          onClick={handleDone}
          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground/40 hover:border-primary hover:bg-primary/10 transition-colors"
          title="Mark as done"
        >
          {task.status === "done" && <Check className="h-3 w-3" />}
        </button>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-medium ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
            {task.title}
          </span>
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${priorityColors[task.priority]}`}>
            {task.priority}
          </span>
        </div>

        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          {task.due_date && <span>{task.due_date}</span>}
          {task.scheduled_time && <span>{task.scheduled_time}</span>}
          {task.source === "voice" && <span>via voice</span>}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {mode === "inbox" && (
          <>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(true)} title="Edit">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleAddToToday} title="Add to today">
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => onDelete?.(task.id)} title="Discard">
              <X className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
        {mode === "today" && task.status !== "done" && (
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(true)} title="Edit">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
        {mode === "backlog" && (
          <>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleAddToToday} title="Add to today">
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(true)} title="Edit">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
