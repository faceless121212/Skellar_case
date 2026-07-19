"use client";

import { useState, useMemo, useEffect } from "react";
import { useTasks } from "@/lib/use-tasks";
import { TaskCard } from "@/components/task-card";
import { planMyDay, carryOverUnfinished, autoCompleteOverdue, updateTask as storeUpdateTask } from "@/lib/task-store";
import { getSelectedModel } from "@/lib/settings";
import { Loader2, Sun, Sparkles, Trophy, Clock } from "lucide-react";
import { toast } from "sonner";
import type { Task } from "@/lib/types";

export default function TodayPage() {
  const { tasks, loading, updateTask, fetchTasks } = useTasks("today");
  const { tasks: backlogTasks, updateTask: updateBacklog, fetchTasks: fetchBacklog } = useTasks("backlog");
  const [planning, setPlanning] = useState(false);

  useEffect(() => {
    const completed = autoCompleteOverdue();
    if (completed > 0) fetchTasks();
  }, []);

  const activeTasks = tasks.filter((t) => t.status !== "done");
  const doneTasks = tasks.filter((t) => t.status === "done");
  const total = tasks.length;
  const progress = total > 0 ? (doneTasks.length / total) * 100 : 0;
  const allDone = total > 0 && activeTasks.length === 0;

  const totalMinutes = useMemo(() => {
    return activeTasks.reduce((sum, t) => sum + (t.estimated_minutes ?? 0), 0);
  }, [activeTasks]);

  async function handlePlanMyDay() {
    setPlanning(true);

    const carried = carryOverUnfinished();
    if (carried > 0) {
      toast.info(`${carried} overdue task${carried !== 1 ? "s" : ""} carried over to today`);
    }
    const moved = planMyDay();
    if (moved > 0) {
      toast.success(`${moved} task${moved !== 1 ? "s" : ""} moved to Today`);
      fetchTasks();
      fetchBacklog();
    } else if (carried === 0 && tasks.length === 0) {
      toast.info("No tasks to plan. Confirm some in Inbox first!");
      setPlanning(false);
      return;
    } else {
      fetchTasks();
    }

    const currentTasks = [...tasks, ...(moved > 0 ? [] : [])].filter((t) => t.status !== "done");
    fetchTasks();

    await new Promise((r) => setTimeout(r, 100));
    const freshTasks = activeTasks.length > 0 ? activeTasks : currentTasks;

    if (freshTasks.length > 0) {
      try {
        const res = await fetch("/api/plan-day", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tasks: freshTasks.map((t) => ({
              id: t.id,
              title: t.title,
              priority: t.priority,
              due_date: t.due_date,
              scheduled_time: t.scheduled_time,
              estimated_minutes: t.estimated_minutes,
              tags: t.tags,
              status: t.status,
            })),
            model: getSelectedModel(),
          }),
        });

        const data = await res.json();
        if (data.planned && Array.isArray(data.planned)) {
          for (const p of data.planned) {
            storeUpdateTask(p.id, {
              priority: p.priority,
              scheduled_time: p.scheduled_time,
              estimated_minutes: p.estimated_minutes,
            });
          }
          toast.success("AI prioritized and scheduled your tasks");
          fetchTasks();
        }
      } catch {
        toast.info("Tasks moved but AI scheduling unavailable");
      }
    }

    setPlanning(false);
  }

  async function handleBacklogUpdate(id: string, updates: Partial<Task>) {
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
                ? `${activeTasks.length} task${activeTasks.length !== 1 ? "s" : ""} to do, ${doneTasks.length} done`
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

      {/* Progress bar + time estimate */}
      {total > 0 && (
        <div className="space-y-1.5">
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                progress === 100
                  ? "bg-emerald-500"
                  : progress >= 75
                    ? "bg-green-500"
                    : progress >= 50
                      ? "bg-yellow-500"
                      : progress >= 25
                        ? "bg-orange-500"
                        : progress > 0
                          ? "bg-red-500"
                          : "bg-muted-foreground/20"
              }`}
              style={{ width: `${Math.max(progress, 2)}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            {totalMinutes > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                ~{totalMinutes >= 60 ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60 > 0 ? ` ${totalMinutes % 60}m` : ""}` : `${totalMinutes}m`} left
              </span>
            )}
            <p className="text-[11px] text-muted-foreground ml-auto font-medium">
              {doneTasks.length}/{total} done
            </p>
          </div>
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
