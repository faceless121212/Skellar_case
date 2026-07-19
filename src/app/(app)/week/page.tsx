"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getTasks } from "@/lib/task-store";
import type { Task } from "@/lib/types";
import Link from "next/link";

const priorityColor: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-primary",
  low: "bg-emerald-500",
};

const HOUR_HEIGHT = 60;
const START_HOUR = 6;
const END_HOUR = 23;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

function getWeekDates(offset: number): Date[] {
  const now = new Date();
  const monday = new Date(now);
  const day = monday.getDay();
  monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function formatHour(hour: number): string {
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12} ${ampm}`;
}

function formatTime12(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "pm" : "am";
  const h12 = hour % 12 || 12;
  return `${h12}:${m}${ampm}`;
}

const dayNamesShort = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const dayNamesFull = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

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

  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const nowTop = ((nowMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;

  return (
    <div className="animate-fade-in -mx-4 sm:-mx-6">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b px-4 sm:px-6">
        <div className="flex items-center justify-between py-3">
          <h1 className="text-xl font-bold tracking-tight">Week</h1>
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
              {weekOffset === 0 ? "This week" : "Today"}
            </button>
            <button
              onClick={() => setWeekOffset((o) => o + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-[50px_repeat(7,1fr)] gap-0">
          <div />
          {days.map((day, i) => {
            const dateStr = toDateStr(day);
            const isToday = dateStr === todayStr;
            return (
              <div key={dateStr} className="flex flex-col items-center justify-center pb-2">
                <p className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                  <span className="hidden sm:inline">{dayNamesFull[i].slice(0, 3)}</span>
                  <span className="sm:hidden">{dayNamesShort[i].charAt(0)}</span>
                </p>
                <div className="flex items-center justify-center h-9 w-9 mt-0.5">
                  <span className={`flex items-center justify-center h-9 w-9 rounded-full text-lg font-semibold ${
                    isToday
                      ? "bg-primary text-primary-foreground text-sm"
                      : ""
                  }`}>
                    {day.getDate()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Time grid */}
      <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-220px)]">
        <div className="grid grid-cols-[50px_repeat(7,1fr)] gap-0 relative min-w-[600px]">
          {/* Time labels + grid lines */}
          <div className="relative">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="relative"
                style={{ height: HOUR_HEIGHT }}
              >
                <span className="absolute -top-2 right-2 text-[10px] text-muted-foreground font-medium">
                  {formatHour(hour)}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, dayIdx) => {
            const dateStr = toDateStr(day);
            const isToday = dateStr === todayStr;
            const dayTasks = tasksForDay(dateStr);
            const timedTasks = dayTasks.filter((t) => t.scheduled_time);
            const untimedTasks = dayTasks.filter((t) => !t.scheduled_time);

            return (
              <div
                key={dateStr}
                className={`relative border-l ${isToday ? "bg-primary/[0.03]" : ""}`}
              >
                {/* Hour grid lines */}
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="border-t border-border/40"
                    style={{ height: HOUR_HEIGHT }}
                  />
                ))}

                {/* Now indicator */}
                {isToday && nowTop > 0 && nowTop < HOURS.length * HOUR_HEIGHT && (
                  <div
                    className="absolute left-0 right-0 z-20 pointer-events-none"
                    style={{ top: nowTop }}
                  >
                    <div className="flex items-center">
                      <div className="h-2.5 w-2.5 rounded-full bg-red-500 -ml-1" />
                      <div className="h-[2px] flex-1 bg-red-500" />
                    </div>
                  </div>
                )}

                {/* Timed task blocks */}
                {timedTasks.map((task) => {
                  const startMin = timeToMinutes(task.scheduled_time!);
                  const duration = task.estimated_minutes ?? 60;
                  const top = ((startMin - START_HOUR * 60) / 60) * HOUR_HEIGHT;
                  const height = Math.max((duration / 60) * HOUR_HEIGHT, 24);
                  const endTime = task.scheduled_time!.split(":").map(Number);
                  const endMinutes = endTime[0] * 60 + endTime[1] + duration;
                  const endH = Math.floor(endMinutes / 60);
                  const endM = endMinutes % 60;
                  const endStr = `${endH}:${String(endM).padStart(2, "0")}`;

                  return (
                    <Link
                      key={task.id}
                      href={`/task/${task.id}`}
                      className={`absolute left-0.5 right-0.5 rounded-lg px-2 py-1 overflow-hidden transition-opacity hover:opacity-90 z-10 ${
                        task.status === "done"
                          ? "bg-muted text-muted-foreground opacity-50"
                          : `${priorityColor[task.priority] ?? "bg-primary"} text-white`
                      }`}
                      style={{ top: Math.max(top, 0), height }}
                    >
                      <p className="text-[11px] font-semibold truncate leading-tight">
                        {task.title}
                      </p>
                      {height >= 36 && (
                        <p className="text-[9px] opacity-80 mt-0.5">
                          {formatTime12(task.scheduled_time!)} – {formatTime12(endStr)}
                        </p>
                      )}
                    </Link>
                  );
                })}

                {/* Untimed tasks at top */}
                {untimedTasks.length > 0 && (
                  <div className="absolute top-0 left-0.5 right-0.5 z-10">
                    {untimedTasks.slice(0, 2).map((task) => (
                      <Link
                        key={task.id}
                        href={`/task/${task.id}`}
                        className={`block rounded px-1.5 py-0.5 mb-0.5 text-[9px] font-medium truncate transition-opacity hover:opacity-80 ${
                          task.status === "done"
                            ? "bg-muted/80 text-muted-foreground line-through"
                            : "bg-primary/15 text-primary"
                        }`}
                      >
                        {task.title}
                      </Link>
                    ))}
                    {untimedTasks.length > 2 && (
                      <p className="text-[9px] text-muted-foreground pl-1">
                        +{untimedTasks.length - 2}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
