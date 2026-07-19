"use client";

import { useState } from "react";
import { useTasks } from "@/lib/use-tasks";
import { TaskCard } from "@/components/task-card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Sun, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function TodayPage() {
  const { tasks, loading, updateTask, fetchTasks } = useTasks("today");
  const [planning, setPlanning] = useState(false);
  const supabase = createClient();

  const activeTasks = tasks.filter((t) => t.status !== "done");
  const doneTasks = tasks.filter((t) => t.status === "done");

  async function handlePlanMyDay() {
    setPlanning(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("/api/tasks/plan", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to plan");

      const data = await res.json();
      if (data.moved > 0) {
        toast.success(`${data.moved} task(s) moved to Today`);
        fetchTasks();
      } else {
        toast.info("No tasks to plan. Add some in Capture first!");
      }
    } catch {
      toast.error("Failed to plan your day");
    } finally {
      setPlanning(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Today</h1>
          <p className="text-muted-foreground mt-1">
            {activeTasks.length} task{activeTasks.length !== 1 ? "s" : ""} to go
            {doneTasks.length > 0 && `, ${doneTasks.length} done`}
          </p>
        </div>
        <Button onClick={handlePlanMyDay} disabled={planning} className="gap-1.5">
          {planning ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Plan my day
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Sun className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">No tasks for today</p>
          <p className="text-sm text-muted-foreground/60">
            Hit &quot;Plan my day&quot; to pull in tasks from your backlog.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeTasks.length > 0 && (
            <div className="space-y-2">
              {activeTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  mode="today"
                  onUpdate={updateTask}
                />
              ))}
            </div>
          )}

          {doneTasks.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground pt-4">
                Completed ({doneTasks.length})
              </p>
              {doneTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  mode="today"
                  onUpdate={updateTask}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
