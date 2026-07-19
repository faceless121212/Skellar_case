"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, ArrowUp, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { getSelectedModel } from "@/lib/settings";
import { updateTask as storeUpdateTask, deleteTask as storeDeleteTask, getTasks } from "@/lib/task-store";
import { toast } from "sonner";
import type { Task } from "@/lib/types";

interface TaskAction {
  action: "update" | "delete" | "complete" | "move";
  task_title: string;
  updates?: {
    priority?: "low" | "medium" | "high";
    due_date?: string | null;
    scheduled_time?: string | null;
    estimated_minutes?: number;
    title?: string;
    status?: "pending" | "backlog" | "today" | "done";
  };
}

interface Message {
  role: "user" | "assistant";
  content: string;
  actions?: TaskAction[];
  actionsApplied?: boolean;
}

const QUICK_PROMPTS: Record<string, string[]> = {
  today: [
    "What should I focus on first?",
    "Am I overloaded today?",
    "Mark all high-priority tasks as done",
  ],
  inbox: [
    "Which tasks are most urgent?",
    "Set all tasks to high priority",
    "Move everything to backlog",
  ],
  done: [
    "How productive was I today?",
    "What patterns do you see?",
    "Summarize what I accomplished",
  ],
  week: [
    "How does my week look?",
    "Any scheduling conflicts?",
    "Suggest a better schedule",
  ],
};

function findTaskByTitle(tasks: Task[], title: string): Task | undefined {
  const lower = title.toLowerCase();
  return tasks.find((t) => t.title.toLowerCase() === lower)
    ?? tasks.find((t) => t.title.toLowerCase().includes(lower))
    ?? tasks.find((t) => lower.includes(t.title.toLowerCase()));
}

export function AIAssistant({ page, tasks: initialTasks, onTasksChanged }: {
  page: string;
  tasks: Task[];
  onTasksChanged?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [liveTasks, setLiveTasks] = useState<Task[]>(initialTasks);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLiveTasks(initialTasks);
  }, [initialTasks]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  function applyActions(actions: TaskAction[]): number {
    const allTasks = getTasks();
    let applied = 0;

    for (const action of actions) {
      const task = findTaskByTitle(allTasks, action.task_title);
      if (!task) continue;

      switch (action.action) {
        case "complete":
          storeUpdateTask(task.id, { status: "done" });
          applied++;
          break;
        case "delete":
          storeDeleteTask(task.id);
          applied++;
          break;
        case "move":
          if (action.updates?.status) {
            storeUpdateTask(task.id, { status: action.updates.status });
            applied++;
          }
          break;
        case "update": {
          const updates: Partial<Task> = {};
          if (action.updates?.priority) updates.priority = action.updates.priority;
          if (action.updates?.due_date !== undefined) updates.due_date = action.updates.due_date;
          if (action.updates?.scheduled_time !== undefined) updates.scheduled_time = action.updates.scheduled_time;
          if (action.updates?.estimated_minutes) updates.estimated_minutes = action.updates.estimated_minutes;
          if (action.updates?.title) updates.title = action.updates.title;
          if (action.updates?.status) updates.status = action.updates.status;
          if (Object.keys(updates).length > 0) {
            storeUpdateTask(task.id, updates);
            applied++;
          }
          break;
        }
      }
    }

    if (applied > 0) {
      setLiveTasks(getTasks());
      onTasksChanged?.();
      toast.success(`${applied} task${applied !== 1 ? "s" : ""} updated`);
    }

    return applied;
  }

  async function sendMessage(text: string) {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          tasks: liveTasks.map((t) => ({
            title: t.title,
            priority: t.priority,
            status: t.status,
            due_date: t.due_date,
            scheduled_time: t.scheduled_time,
            estimated_minutes: t.estimated_minutes,
            tags: t.tags,
          })),
          model: getSelectedModel(),
          page,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${data.error}` },
        ]);
      } else {
        const actions: TaskAction[] = data.actions ?? [];
        let actionsApplied = false;

        if (actions.length > 0) {
          const count = applyActions(actions);
          actionsApplied = count > 0;
        }

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.reply,
            actions: actions.length > 0 ? actions : undefined,
            actionsApplied,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Failed to connect. Check your internet." },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  const prompts = QUICK_PROMPTS[page] ?? QUICK_PROMPTS.today;

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:opacity-90 active:scale-95 transition-all duration-200 animate-fade-in"
          title="AI Assistant"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-96 animate-fade-in">
          <div className="flex flex-col rounded-2xl border bg-card shadow-2xl overflow-hidden" style={{ maxHeight: "min(500px, calc(100dvh - 140px))" }}>
            <div className="flex items-center justify-between px-4 py-3 border-b bg-primary/5">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">AI Assistant</p>
                  <p className="text-[10px] text-muted-foreground">Can read & edit your tasks</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ minHeight: 200 }}>
              {messages.length === 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Ask me anything — I can also change your tasks
                  </p>
                  <div className="space-y-1.5">
                    {prompts.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => sendMessage(prompt)}
                        className="w-full text-left rounded-xl border px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[85%] space-y-1.5`}>
                    <div
                      className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted rounded-bl-md"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>

                    {msg.actionsApplied && msg.actions && (
                      <div className="flex items-center gap-1.5 px-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        <span className="text-[10px] text-emerald-600 font-medium">
                          {msg.actions.length} change{msg.actions.length !== 1 ? "s" : ""} applied
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2.5">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="border-t px-3 py-2.5">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask or tell me to change tasks..."
                  className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground/50 focus:outline-none"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isLoading}
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 shrink-0 ${
                    input.trim() && !isLoading
                      ? "bg-primary text-primary-foreground hover:opacity-90 active:scale-95"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  }`}
                >
                  <ArrowUp className="h-3.5 w-3.5 stroke-[2.5]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
