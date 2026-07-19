"use client";

import { useTasks } from "@/lib/use-tasks";
import { TaskCard } from "@/components/task-card";
import { Loader2, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useMemo } from "react";

export default function DonePage() {
  const { tasks, loading, updateTask, deleteTask, fetchTasks } = useTasks("done");

  const grouped = useMemo(() => {
    const groups: Record<string, typeof tasks> = {};
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    for (const task of tasks) {
      const date = task.completed_at?.split("T")[0] ?? task.due_date ?? "unknown";
      let label: string;
      if (date === today) label = "Today";
      else if (date === yesterday) label = "Yesterday";
      else if (date === "unknown") label = "Earlier";
      else {
        const d = new Date(date + "T00:00:00");
        label = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      }
      if (!groups[label]) groups[label] = [];
      groups[label].push(task);
    }
    return groups;
  }, [tasks]);

  async function handleClearAll() {
    let cleared = 0;
    for (const task of tasks) {
      if (await deleteTask(task.id)) cleared++;
    }
    if (cleared > 0) {
      toast.success(`${cleared} completed task${cleared !== 1 ? "s" : ""} cleared`);
      fetchTasks();
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Done</h1>
          <p className="text-muted-foreground mt-1">
            {tasks.length > 0
              ? `${tasks.length} completed task${tasks.length !== 1 ? "s" : ""}`
              : "No completed tasks yet"}
          </p>
        </div>
        {tasks.length > 0 && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground shadow-sm transition-all duration-200 hover:text-destructive hover:border-destructive/30 active:scale-95 shrink-0"
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Clear all</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 mb-4">
            <CheckCircle2 className="h-7 w-7 text-muted-foreground/50" />
          </div>
          <p className="font-medium text-foreground/80">Nothing completed yet</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-[260px]">
            Tasks you mark as done will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([label, groupTasks]) => (
            <div key={label} className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium text-muted-foreground px-2">
                  {label} ({groupTasks.length})
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
              {groupTasks.map((task, i) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  mode="today"
                  onUpdate={updateTask}
                  index={i}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
