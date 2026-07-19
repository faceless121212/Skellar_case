"use client";

import { useState } from "react";
import { useTasks } from "@/lib/use-tasks";
import { TaskCard } from "@/components/task-card";
import { planMyDay } from "@/lib/task-store";
import { Loader2, Sun, Sparkles, Trophy } from "lucide-react";
import { toast } from "sonner";

export default function TodayPage() {
  const { tasks, loading, updateTask, fetchTasks } = useTasks("today");
  const { tasks: backlogTasks, updateTask: updateBacklog, fetchTasks: fetchBacklog } = useTasks("backlog");
  const [planning, setPlanning] = useState(false);

  const activeTasks = tasks.filter((t) => t.status !== "done");
  const doneTasks = tasks.filter((t) => t.status === "done");
  const total = tasks.length;
  const progress = total > 0 ? (doneTasks.length / total) * 100 : 0;
  const allDone = total > 0 && activeTasks.length === 0;

  function handlePlanMyDay() {
    setPlanning(true);
    const moved = planMyDay();
    if (moved > 0) {
      toast.success(`${moved} task${moved !== 1 ? "s" : ""} moved to Today`);
      fetchTasks();
      fetchBacklog();
    } else {
      toast.info("No tasks to plan. Confirm some in Inbox first!");
    }
    setPlanning(false);
  }

  async function handleBacklogUpdate(id: string, updates: Partial<import("@/lib/types").Task>) {
    const result = await updateBacklog(id, updates);
    if (updates.status === "today") {
      fetchTasks();
    }
    return result;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Today</h1>
          <p className="text-muted-foreground mt-1">
            {allDone
              ? "All done! Great work."
              : total > 0
                ? `${activeTasks.length} remaining, ${doneTasks.length} completed`
                : "Plan your day to get started"}
          </p>
        </div>
        <button
          onClick={handlePlanMyDay}
          disabled={planning}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-200 hover:opacity-90 active:scale-95 disabled:opacity-50 shrink-0"
        >
          {planning ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">Plan my day</span>
          <span className="sm:hidden">Plan</span>
        </button>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="space-y-2">
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-right">
            {Math.round(progress)}% complete
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : allDone ? (
        <div className="flex flex-col items-center justify-center py-16 text-center animate-slide-up">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
            <Trophy className="h-7 w-7 text-primary" />
          </div>
          <p className="font-medium text-foreground/80">Day complete!</p>
          <p className="text-sm text-muted-foreground mt-1">
            You finished all {total} task{total !== 1 ? "s" : ""}. Nice work.
          </p>
        </div>
      ) : total === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 mb-4">
            <Sun className="h-7 w-7 text-muted-foreground/50" />
          </div>
          <p className="font-medium text-foreground/80">No tasks for today</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-[260px]">
            Hit &quot;Plan my day&quot; to pull tasks from your backlog, or add some in Capture.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {activeTasks.length > 0 && (
            <div className="space-y-2">
              {activeTasks.map((task, i) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  mode="today"
                  onUpdate={updateTask}
                  index={i}
                />
              ))}
            </div>
          )}

          {doneTasks.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 pt-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium text-muted-foreground px-2">
                  Completed ({doneTasks.length})
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
              {doneTasks.map((task, i) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  mode="today"
                  onUpdate={updateTask}
                  index={i}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Backlog section */}
      {backlogTasks.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium text-muted-foreground px-2">
              Backlog ({backlogTasks.length})
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
          {backlogTasks.map((task, i) => (
            <TaskCard
              key={task.id}
              task={task}
              mode="backlog"
              onUpdate={handleBacklogUpdate}
              index={i}
            />
          ))}
        </div>
      )}
    </div>
  );
}
