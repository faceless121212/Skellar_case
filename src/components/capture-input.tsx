"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff, ArrowUp, Loader2, WifiOff, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { addTasks } from "@/lib/task-store";
import { getSelectedModel, setSelectedModel, AVAILABLE_MODELS } from "@/lib/settings";
import type { ParsedTask, TaskSource } from "@/lib/types";

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

export function CaptureInput() {
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [source, setSource] = useState<TaskSource>("text");
  const [model, setModel] = useState("");
  const [showModels, setShowModels] = useState(false);
  const recognitionRef = useRef<ReturnType<typeof createSpeechRecognition> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setModel(getSelectedModel());
  }, []);

  useEffect(() => {
    setSpeechSupported(
      "webkitSpeechRecognition" in window || "SpeechRecognition" in window
    );
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [text]);

  function createSpeechRecognition() {
    const SR =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    return new (SR as new () => {
      continuous: boolean;
      interimResults: boolean;
      lang: string;
      onresult: ((e: SpeechRecognitionEvent) => void) | null;
      onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
      onend: (() => void) | null;
      start: () => void;
      stop: () => void;
    })();
  }

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const recognition = createSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = navigator.language || "uk-UA";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript;
        }
      }
      if (transcript) {
        setText((prev) => (prev ? prev + " " + transcript : transcript));
        setSource("voice");
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== "aborted") {
        toast.error("Microphone error: " + event.error);
      }
      setIsRecording(false);
    };

    recognition.onend = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [isRecording]);

  async function handleSubmit() {
    const rawInput = text.trim();
    if (!rawInput || !isOnline) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/parse-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_input: rawInput, source, model }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to parse tasks");
      }

      const data = await res.json();
      const parsed: ParsedTask[] = data.tasks;
      addTasks(parsed, rawInput, source);
      setText("");
      setSource("text");
      toast.success(`${parsed.length} task${parsed.length !== 1 ? "s" : ""} added to Inbox`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Something went wrong. Try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const canSubmit = text.trim().length > 0 && !isSubmitting && isOnline;

  return (
    <div className="space-y-3">
      {!isOnline && (
        <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive animate-fade-in">
          <WifiOff className="h-4 w-4 shrink-0" />
          You&apos;re offline. Send is paused.
        </div>
      )}

      <div className="rounded-2xl border-2 border-border bg-card shadow-sm transition-all duration-200 focus-within:border-primary/50 focus-within:shadow-md focus-within:shadow-primary/5">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (source === "voice") setSource("text");
          }}
          onKeyDown={handleKeyDown}
          placeholder="Buy groceries, call mom tomorrow at 10, finish report by Friday..."
          rows={3}
          className="w-full resize-none bg-transparent px-5 pt-5 pb-2 text-base leading-relaxed placeholder:text-muted-foreground/50 focus:outline-none"
          disabled={isSubmitting}
        />

        <div className="flex items-center justify-between px-3 pb-3">
          <div className="flex items-center gap-1">
            {speechSupported && (
              <button
                type="button"
                onClick={toggleRecording}
                disabled={isSubmitting}
                className={`
                  relative flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200
                  ${isRecording
                    ? "bg-destructive text-destructive-foreground animate-pulse-ring"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }
                `}
                title={isRecording ? "Stop recording" : "Voice input"}
              >
                {isRecording ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </button>
            )}
            {isRecording && (
              <span className="text-xs text-destructive font-medium animate-pulse ml-1">
                Listening...
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`
              flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200
              ${canSubmit
                ? "bg-primary text-primary-foreground shadow-sm hover:opacity-90 active:scale-95"
                : "bg-muted text-muted-foreground cursor-not-allowed"
              }
            `}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUp className="h-4 w-4 stroke-[2.5]" />
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3">
        <p className="text-xs text-muted-foreground/60">
          Enter to send &middot; Shift+Enter for new line
        </p>
        <span className="text-muted-foreground/30">|</span>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowModels(!showModels)}
            className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {AVAILABLE_MODELS.find((m) => m.id === model)?.name ?? "Model"}
            <ChevronDown className={`h-3 w-3 transition-transform ${showModels ? "rotate-180" : ""}`} />
          </button>

          {showModels && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowModels(false)} />
              <div className="absolute bottom-full mb-2 right-0 z-50 w-52 rounded-xl border bg-card shadow-lg py-1 animate-fade-in">
                <p className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Models
                </p>
                {AVAILABLE_MODELS.map((m, i) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setModel(m.id);
                      setSelectedModel(m.id);
                      setShowModels(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted transition-colors ${
                      model === m.id ? "text-primary font-medium" : "text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{m.name}</span>
                      {m.badge && (
                        <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                          {m.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground/50">{i + 1}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
