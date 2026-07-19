"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Task, TaskStatus } from "@/lib/types";

export function useTasks(status?: TaskStatus) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const url = status
      ? `/api/tasks?status=${status}`
      : `/api/tasks`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (res.ok) {
      const data = await res.json();
      setTasks(data.tasks ?? []);
    }
    setLoading(false);
  }, [status, supabase.auth]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  async function updateTask(id: string, updates: Partial<Task>) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch("/api/tasks", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ id, ...updates }),
    });

    if (res.ok) {
      const data = await res.json();
      setTasks((prev) =>
        prev
          .map((t) => (t.id === id ? data.task : t))
          .filter((t) => !status || t.status === status)
      );
    }

    return res.ok;
  }

  async function deleteTask(id: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch("/api/tasks", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ id }),
    });

    if (res.ok) {
      setTasks((prev) => prev.filter((t) => t.id !== id));
    }

    return res.ok;
  }

  return { tasks, loading, fetchTasks, updateTask, deleteTask };
}
