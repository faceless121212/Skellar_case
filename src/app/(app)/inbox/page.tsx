"use client";

import { useTasks } from "@/lib/use-tasks";
import { TaskCard } from "@/components/task-card";
import { Loader2, Inbox as InboxIcon } from "lucide-react";

export default function InboxPage() {
  const { tasks, loading, updateTask, deleteTask } = useTasks("pending");

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Inbox</h1>
        <p className="text-muted-foreground mt-1">
          {tasks.length > 0
            ? `${tasks.length} task${tasks.length !== 1 ? "s" : ""} to review`
            : "Review and organize your parsed tasks"}
        </p>
      </div>

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
      ) : (
        <div className="space-y-2">
          {tasks.map((task, i) => (
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
