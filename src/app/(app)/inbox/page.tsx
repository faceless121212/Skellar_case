"use client";

import { useState, useMemo } from "react";
import { useTasks } from "@/lib/use-tasks";
import { TaskCard } from "@/components/task-card";
import { Loader2, Inbox as InboxIcon, Filter, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { TaskPriority } from "@/lib/types";

export default function InboxPage() {
  const { tasks, loading, updateTask, deleteTask, fetchTasks } = useTasks("pending");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">("all");
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    tasks.forEach((t) => t.tags?.forEach((tag) => tags.add(tag)));
    return Array.from(tags).sort();
  }, [tasks]);

  const filtered = useMemo(() => {
    let result = tasks;
    if (priorityFilter !== "all") {
      result = result.filter((t) => t.priority === priorityFilter);
    }
    if (tagFilter) {
      result = result.filter((t) => t.tags?.includes(tagFilter));
    }
    return result;
  }, [tasks, priorityFilter, tagFilter]);

  async function confirmAll() {
    let count = 0;
    for (const task of filtered) {
      await updateTask(task.id, { status: "backlog" });
      count++;
    }
    toast.success(`${count} task${count !== 1 ? "s" : ""} confirmed`);
    fetchTasks();
  }

  const hasFilters = priorityFilter !== "all" || tagFilter !== null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Inbox</h1>
          <p className="text-muted-foreground mt-1">
            {tasks.length > 0
              ? `${tasks.length} task${tasks.length !== 1 ? "s" : ""} to review`
              : "Review and organize your parsed tasks"}
          </p>
        </div>
        {filtered.length > 0 && (
          <button
            onClick={confirmAll}
            className="flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition-colors shrink-0"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span className="hidden sm:inline">Confirm all</span>
            <span className="sm:hidden">All</span>
          </button>
        )}
      </div>

      {/* Filters */}
      {tasks.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-3.5 w-3.5 text-muted-foreground/60" />

          {(["all", "high", "medium", "low"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors ${
                priorityFilter === p
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "border-border/60 text-muted-foreground hover:bg-muted"
              }`}
            >
              {p === "all" ? "All" : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}

          {allTags.length > 0 && (
            <>
              <span className="text-muted-foreground/30">|</span>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors ${
                    tagFilter === tag
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "border-border/60 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </>
          )}

          {hasFilters && (
            <button
              onClick={() => { setPriorityFilter("all"); setTagFilter(null); }}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors underline"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 mb-4">
            <InboxIcon className="h-7 w-7 text-muted-foreground/50" />
          </div>
          <p className="font-medium text-foreground/80">Inbox is empty</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-[240px]">
            Go to Capture and dump your thoughts. AI will parse them into tasks here.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground animate-fade-in">
          No tasks match this filter.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((task, i) => (
            <TaskCard
              key={task.id}
              task={task}
              mode="inbox"
              onUpdate={updateTask}
              onDelete={deleteTask}
              index={i}
            />
          ))}
        </div>
      )}
    </div>
  );
}
