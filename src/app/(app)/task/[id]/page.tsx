"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Check, X, Trash2, Clock, Calendar, Flag, FileText } from "lucide-react";
import { getTaskById, updateTask, addSubtask, toggleSubtask, deleteSubtask, deleteTask } from "@/lib/task-store";
import type { Task, TaskPriority } from "@/lib/types";
import { toast } from "sonner";

const priorityConfig: Record<TaskPriority, { chipActive: string; label: string }> = {
  high: { chipActive: "bg-red-500 text-white border-red-500", label: "High" },
  medium: { chipActive: "bg-amber-500 text-white border-amber-500", label: "Med" },
  low: { chipActive: "bg-emerald-500 text-white border-emerald-500", label: "Low" },
};

const priorities: TaskPriority[] = ["high", "medium", "low"];

function formatDate(dateStr: string): string {
  const today = new Date();
  const date = new Date(dateStr + "T00:00:00");
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [newSubtask, setNewSubtask] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const t = getTaskById(id);
    if (t) {
      setTask(t);
      setTitle(t.title);
      setNotes(t.notes ?? "");
      setPriority(t.priority);
      setDueDate(t.due_date ?? "");
      setScheduledTime(t.scheduled_time ?? "");
    }
  }, [id]);

  function save() {
    if (!task) return;
    const updated = updateTask(task.id, {
      title: title.trim() || task.title,
      notes,
      priority,
      due_date: dueDate || null,
      scheduled_time: scheduledTime || null,
    });
    if (updated) {
      setTask(updated);
      setDirty(false);
      toast.success("Saved");
    }
  }

  function handleAddSubtask() {
    if (!task || !newSubtask.trim()) return;
    const sub = addSubtask(task.id, newSubtask.trim());
    if (sub) {
      setTask(getTaskById(task.id));
      setNewSubtask("");
    }
  }

  function handleToggleSubtask(subtaskId: string) {
    if (!task) return;
    toggleSubtask(task.id, subtaskId);
    setTask(getTaskById(task.id));
  }

  function handleDeleteSubtask(subtaskId: string) {
    if (!task) return;
    deleteSubtask(task.id, subtaskId);
    setTask(getTaskById(task.id));
  }

  function handleDelete() {
    if (!task) return;
    deleteTask(task.id);
    toast.success("Task deleted");
    router.back();
  }

  if (!task) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground animate-fade-in">
        Task not found
      </div>
    );
  }

  const subtasks = task.subtasks ?? [];
  const subtasksDone = subtasks.filter((s) => s.done).length;

  return (
    <div className="space-y-6 animate-fade-in max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            if (dirty) save();
            router.back();
          }}
          className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1" />
        <button
          onClick={handleDelete}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          title="Delete task"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Title */}
      <input
        value={title}
        onChange={(e) => { setTitle(e.target.value); setDirty(true); }}
        onBlur={() => { if (dirty) save(); }}
        className="w-full text-xl sm:text-2xl font-bold bg-transparent focus:outline-none"
        placeholder="Task title..."
      />

      {/* Priority */}
      <div className="flex items-center gap-2">
        <Flag className="h-4 w-4 text-muted-foreground/60" />
        {priorities.map((p) => {
          const pc = priorityConfig[p];
          const isActive = priority === p;
          return (
            <button
              key={p}
              onClick={() => { setPriority(p); setDirty(true); }}
              className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-all active:scale-95 ${
                isActive ? pc.chipActive : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {pc.label}
            </button>
          );
        })}
      </div>

      {/* Date & Time */}
      <div className="flex items-center gap-3 flex-wrap">
        <label className="inline-flex items-center gap-2 rounded-xl border border-border/60 px-3 py-2 text-sm text-muted-foreground hover:border-border transition-colors cursor-pointer">
          <Calendar className="h-4 w-4" />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => { setDueDate(e.target.value); setDirty(true); }}
            onBlur={() => { if (dirty) save(); }}
            className="bg-transparent text-foreground text-sm focus:outline-none"
          />
          {dueDate && (
            <span className="text-xs text-muted-foreground/70">
              {formatDate(dueDate)}
            </span>
          )}
        </label>

        <label className="inline-flex items-center gap-2 rounded-xl border border-border/60 px-3 py-2 text-sm text-muted-foreground hover:border-border transition-colors cursor-pointer">
          <Clock className="h-4 w-4" />
          <input
            type="time"
            value={scheduledTime}
            onChange={(e) => { setScheduledTime(e.target.value); setDirty(true); }}
            onBlur={() => { if (dirty) save(); }}
            className="bg-transparent text-foreground text-sm focus:outline-none"
          />
        </label>
      </div>

      {/* Subtasks */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground/80">
            Subtasks
          </h3>
          {subtasks.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {subtasksDone}/{subtasks.length}
            </span>
          )}
        </div>

        {subtasks.length > 0 && (
          <div className="space-y-1">
            {subtasks.map((sub) => (
              <div key={sub.id} className="flex items-center gap-2 group rounded-lg px-2 py-1.5 hover:bg-muted/50 transition-colors">
                <button
                  onClick={() => handleToggleSubtask(sub.id)}
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all ${
                    sub.done
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-muted-foreground/30 hover:border-primary"
                  }`}
                >
                  {sub.done && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                </button>
                <span className={`flex-1 text-sm ${sub.done ? "line-through text-muted-foreground" : ""}`}>
                  {sub.title}
                </span>
                <button
                  onClick={() => handleDeleteSubtask(sub.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-muted-foreground/50" />
          <input
            value={newSubtask}
            onChange={(e) => setNewSubtask(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddSubtask();
              }
            }}
            placeholder="Add subtask..."
            className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground/40 focus:outline-none py-1.5"
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground/60" />
          <h3 className="text-sm font-semibold text-foreground/80">Notes</h3>
        </div>
        <textarea
          value={notes}
          onChange={(e) => { setNotes(e.target.value); setDirty(true); }}
          onBlur={() => { if (dirty) save(); }}
          placeholder="Add notes..."
          rows={4}
          className="w-full rounded-xl border border-border/60 bg-transparent px-3 py-2.5 text-sm leading-relaxed placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/30 resize-none"
        />
      </div>

      {dirty && (
        <button
          onClick={save}
          className="w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 active:scale-[0.98] transition-all"
        >
          Save changes
        </button>
      )}
    </div>
  );
}
