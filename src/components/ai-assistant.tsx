"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, ArrowUp, Loader2, Sparkles } from "lucide-react";
import { getSelectedModel } from "@/lib/settings";
import type { Task } from "@/lib/types";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const QUICK_PROMPTS: Record<string, string[]> = {
  today: [
    "What should I focus on first?",
    "Am I overloaded today?",
    "Help me reprioritize",
  ],
  inbox: [
    "Which tasks are most urgent?",
    "Suggest priorities for these",
    "Help me organize my inbox",
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

export function AIAssistant({ page, tasks }: { page: string; tasks: Task[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

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
          tasks: tasks.map((t) => ({
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
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply },
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
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:opacity-90 active:scale-95 transition-all duration-200 animate-fade-in"
          title="AI Assistant"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-96 animate-fade-in">
          <div className="flex flex-col rounded-2xl border bg-card shadow-2xl overflow-hidden" style={{ maxHeight: "min(500px, calc(100dvh - 140px))" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-primary/5">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">AI Assistant</p>
                  <p className="text-[10px] text-muted-foreground">Powered by Claude</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ minHeight: 200 }}>
              {messages.length === 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Ask me anything about your tasks
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
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
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

            {/* Input */}
            <div className="border-t px-3 py-2.5">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your tasks..."
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
