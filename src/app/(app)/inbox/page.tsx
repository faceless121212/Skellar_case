"use client";

import { useTasks } from "@/lib/use-tasks";
import { TaskCard } from "@/components/task-card";
import { Loader2, Inbox as InboxIcon } from "lucide-react";

export default function InboxPage() {
  const { tasks, loading, updateTask, deleteTask } = useTasks("backlog");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Inbox</h1>
        <p className="text-muted-foreground mt-1">
          Review parsed tasks. Edit, confirm, or discard.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <InboxIcon className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">Inbox is empty</p>
          <p className="text-sm text-muted-foreground/60">
            Capture some thoughts and they&apos;ll appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              mode="inbox"
              onUpdate={updateTask}
              onDelete={deleteTask}
            />
          ))}
        </div>
      )}
    </div>
  );
}
