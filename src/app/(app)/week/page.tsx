"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { getTasks } from "@/lib/task-store";
import type { Task } from "@/lib/types";
import Link from "next/link";

const priorityDot: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-emerald-500",
};

function getWeekDates(offset: number): Date[] {
  const now = new Date();
  const monday = new Date(now);
  const day = monday.getDay();
  monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  return days;
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function WeekPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const days = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const todayStr = toDateStr(new Date());

  const allTasks = useMemo(() => getTasks(), []);

  function tasksForDay(dateStr: string): Task[] {
    return allTasks.filter((t) => {
      if (t.due_date === dateStr) return true;
      if (t.status === "done" && t.completed_at?.split("T")[0] === dateStr) return true;
      if (dateStr === todayStr && t.status === "today" && !t.due_date) return true;
      return false;
    });
  }

  const weekStart = days[0].toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const weekEnd = days[6].toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Week</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekOffset((o) => o - 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className="px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            {weekOffset === 0 ? "This week" : `${weekStart} — ${weekEnd}`}
          </button>
          <button
            onClick={() => setWeekOffset((o) => o + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-1 gap-2">
        {days.map((day, i) => {
          const dateStr = toDateStr(day);
          const isToday = dateStr === todayStr;
          const isPast = dateStr < todayStr;
          const dayTasks = tasksForDay(dateStr);
          const doneCount = dayTasks.filter((t) => t.status === "done").length;

          return (
            <div
              key={dateStr}
              className={`rounded-xl border p-3 transition-all ${
                isToday
                  ? "border-primary/30 bg-primary/5 shadow-sm"
                  : isPast
                    ? "opacity-60"
                    : "bg-card"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold uppercase tracking-wider ${
                    isToday ? "text-primary" : "text-muted-foreground"
                  }`}>
                    {dayNames[i]}
                  </span>
                  <span className={`text-sm font-medium ${isToday ? "text-primary" : ""}`}>
                    {day.getDate()}
                  </span>
                  {isToday && (
                    <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground uppercase">
                      Today
                    </span>
                  )}
                </div>
                {dayTasks.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    {doneCount}/{dayTasks.length} done
                  </span>
                )}
              </div>

              {dayTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground/40 py-1">No tasks</p>
              ) : (
                <div className="space-y-1">
                  {dayTasks.slice(0, 5).map((task) => (
                    <Link
                      key={task.id}
                      href={`/task/${task.id}`}
                      className={`flex items-center gap-2 rounded-lg px-2 py-1 text-xs hover:bg-muted/50 transition-colors ${
                        task.status === "done" ? "line-through text-muted-foreground" : "text-foreground"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${priorityDot[task.priority] ?? "bg-muted"}`} />
                      <span className="truncate">{task.title}</span>
                      {task.scheduled_time && (
                        <span className="text-muted-foreground/60 shrink-0 ml-auto">{task.scheduled_time}</span>
                      )}
                    </Link>
                  ))}
                  {dayTasks.length > 5 && (
                    <p className="text-[10px] text-muted-foreground pl-2">
                      +{dayTasks.length - 5} more
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
