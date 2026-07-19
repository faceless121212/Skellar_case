"use client";

import { useState, useEffect, useCallback } from "react";
import type { Task, TaskStatus } from "@/lib/types";
import * as store from "@/lib/task-store";

export function useTasks(status?: TaskStatus) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(() => {
    setTasks(store.getTasks(status));
    setLoading(false);
  }, [status]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  async function updateTask(id: string, updates: Partial<Task>) {
    const updated = store.updateTask(id, updates);
    if (updated) {
      setTasks((prev) =>
        prev
          .map((t) => (t.id === id ? updated : t))
          .filter((t) => !status || t.status === status)
      );
    }
    return !!updated;
  }

  async function deleteTask(id: string) {
    const ok = store.deleteTask(id);
    if (ok) {
      setTasks((prev) => prev.filter((t) => t.id !== id));
    }
    return ok;
  }

  return { tasks, loading, fetchTasks, updateTask, deleteTask };
}
