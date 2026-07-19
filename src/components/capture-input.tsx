"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff, ArrowUp, Loader2, WifiOff, ChevronDown, Eye, Zap, Globe } from "lucide-react";
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

const VOICE_LANGS = [
  { code: "uk-UA", label: "UA" },
  { code: "en-US", label: "EN" },
  { code: "ru-RU", label: "RU" },
  { code: "pl-PL", label: "PL" },
  { code: "de-DE", label: "DE" },
];

const PLACEHOLDERS = [
  "Buy groceries, call mom tomorrow at 10, finish report by Friday...",
  "Купити продукти, зателефонувати мамі завтра о 10, дописати звіт...",
  "Meeting with team at 3pm, review PR, deploy to staging...",
  "Підготувати презентацію на понеділок, терміново!",
  "Book dentist appointment, pick up dry cleaning, gym at 6...",
  "Написати тести, пофіксити баг у checkout, ревю коду Олега...",
];

export function CaptureInput() {
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [source, setSource] = useState<TaskSource>("text");
  const [model, setModel] = useState("");
  const [showModels, setShowModels] = useState(false);
  const [preview, setPreview] = useState<ParsedTask[] | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [voiceLang, setVoiceLang] = useState("uk-UA");
  const [showLangs, setShowLangs] = useState(false);
  const [interim, setInterim] = useState("");
  const recognitionRef = useRef<ReturnType<typeof createSpeechRecognition> | null>(null);
  const shouldRestartRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setModel(getSelectedModel());
    setPlaceholderIdx(Math.floor(Math.random() * PLACEHOLDERS.length));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length);
    }, 8000);
    return () => clearInterval(interval);
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

  function startRecognition() {
    const recognition = createSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = voiceLang;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += t;
        } else {
          interimTranscript += t;
        }
      }
      if (finalTranscript) {
        setText((prev) => (prev ? prev + " " + finalTranscript : finalTranscript));
        setSource("voice");
        setInterim("");
      } else {
        setInterim(interimTranscript);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      toast.error("Microphone error: " + event.error);
      shouldRestartRef.current = false;
      setIsRecording(false);
      setInterim("");
    };

    recognition.onend = () => {
      if (shouldRestartRef.current) {
        try {
          recognition.start();
        } catch {
          shouldRestartRef.current = false;
          setIsRecording(false);
          setInterim("");
        }
      } else {
        setIsRecording(false);
        setInterim("");
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      shouldRestartRef.current = false;
      recognitionRef.current?.stop();
      setIsRecording(false);
      setInterim("");
      return;
    }

    shouldRestartRef.current = true;
    startRecognition();
    setIsRecording(true);
  }, [isRecording, voiceLang]);

  async function fetchParsedTasks(rawInput: string): Promise<ParsedTask[]> {
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
    return data.tasks;
  }

  async function handlePreview() {
    const rawInput = text.trim();
    if (!rawInput || !isOnline) return;

    setIsPreviewing(true);
    try {
      const parsed = await fetchParsedTasks(rawInput);
      setPreview(parsed);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to preview");
    } finally {
      setIsPreviewing(false);
    }
  }

  async function handleSubmit() {
    const rawInput = text.trim();
    if (!rawInput || !isOnline) return;

    setIsSubmitting(true);
    try {
      const parsed = preview ?? await fetchParsedTasks(rawInput);
      addTasks(parsed, rawInput, source);
      setText("");
      setSource("text");
      setPreview(null);
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

  function handleEditPreviewTask(index: number, field: string, value: string) {
    if (!preview) return;
    setPreview(preview.map((t, i) => i === index ? { ...t, [field]: value } : t));
  }

  function handleRemovePreviewTask(index: number) {
    if (!preview) return;
    const updated = preview.filter((_, i) => i !== index);
    if (updated.length === 0) {
      setPreview(null);
    } else {
      setPreview(updated);
    }
  }

  const canSubmit = text.trim().length > 0 && !isSubmitting && isOnline;
  const charCount = text.length;

  const priorityColors: Record<string, string> = {
    high: "text-red-600 bg-red-50",
    medium: "text-amber-600 bg-amber-50",
    low: "text-emerald-600 bg-emerald-50",
  };

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
            setPreview(null);
            if (source === "voice") setSource("text");
          }}
          onKeyDown={handleKeyDown}
          placeholder={PLACEHOLDERS[placeholderIdx]}
          rows={3}
          className="w-full resize-none bg-transparent px-5 pt-5 pb-2 text-base leading-relaxed placeholder:text-muted-foreground/50 focus:outline-none"
          disabled={isSubmitting}
        />

        <div className="flex items-center justify-between px-3 pb-3">
          <div className="flex items-center gap-1">
            {speechSupported && (
              <>
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

                {/* Language selector */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowLangs(!showLangs)}
                    disabled={isSubmitting}
                    className="flex h-8 items-center gap-0.5 rounded-full px-2 text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Voice language"
                  >
                    <Globe className="h-3 w-3" />
                    <span>{VOICE_LANGS.find((l) => l.code === voiceLang)?.label ?? "UA"}</span>
                  </button>
                  {showLangs && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowLangs(false)} />
                      <div className="absolute top-full mt-1 left-0 z-50 rounded-xl border bg-card shadow-lg py-1 animate-fade-in">
                        {VOICE_LANGS.map((l) => (
                          <button
                            key={l.code}
                            onClick={() => {
                              setVoiceLang(l.code);
                              setShowLangs(false);
                              if (isRecording) {
                                shouldRestartRef.current = false;
                                recognitionRef.current?.stop();
                                setTimeout(() => {
                                  shouldRestartRef.current = true;
                                  startRecognition();
                                }, 200);
                              }
                            }}
                            className={`w-full px-3 py-1.5 text-xs text-left hover:bg-muted transition-colors ${
                              voiceLang === l.code ? "text-primary font-bold" : "text-foreground"
                            }`}
                          >
                            {l.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
            {isRecording && (
              <span className="text-xs text-destructive font-medium animate-pulse ml-1">
                {interim ? interim : "Listening..."}
              </span>
            )}

            {canSubmit && !preview && (
              <button
                type="button"
                onClick={handlePreview}
                disabled={isPreviewing}
                className="flex h-10 items-center gap-1.5 px-3 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 text-xs font-medium"
                title="Preview parsed tasks before adding"
              >
                {isPreviewing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
                Preview
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {charCount > 0 && (
              <span className={`text-[10px] tabular-nums ${charCount > 2000 ? "text-destructive" : "text-muted-foreground/40"}`}>
                {charCount}
              </span>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`
                flex h-10 items-center justify-center rounded-full transition-all duration-200
                ${preview
                  ? "bg-primary text-primary-foreground shadow-sm hover:opacity-90 active:scale-95 gap-1.5 px-4"
                  : canSubmit
                    ? "bg-primary text-primary-foreground shadow-sm hover:opacity-90 active:scale-95 w-10"
                    : "bg-muted text-muted-foreground cursor-not-allowed w-10"
                }
              `}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : preview ? (
                <>
                  <Zap className="h-3.5 w-3.5" />
                  <span className="text-sm font-medium">Add {preview.length}</span>
                </>
              ) : (
                <ArrowUp className="h-4 w-4 stroke-[2.5]" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Task preview */}
      {preview && preview.length > 0 && (
        <div className="space-y-2 animate-fade-in">
          <p className="text-xs font-medium text-muted-foreground px-1">
            AI parsed {preview.length} task{preview.length !== 1 ? "s" : ""} — edit or send:
          </p>
          {preview.map((task, i) => (
            <div
              key={i}
              className="rounded-xl border bg-card p-3 space-y-2"
            >
              <div className="flex items-start gap-2">
                <input
                  type="text"
                  value={task.title}
                  onChange={(e) => handleEditPreviewTask(i, "title", e.target.value)}
                  className="flex-1 bg-transparent text-sm font-medium focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleRemovePreviewTask(i)}
                  className="text-muted-foreground/40 hover:text-destructive text-xs shrink-0 transition-colors"
                >
                  &times;
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${priorityColors[task.priority] ?? "text-muted-foreground bg-muted"}`}>
                  {task.priority}
                </span>
                {task.due_date && (
                  <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {task.due_date}
                  </span>
                )}
                {task.scheduled_time && (
                  <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {task.scheduled_time}
                  </span>
                )}
                {task.estimated_minutes && (
                  <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {task.estimated_minutes}m
                  </span>
                )}
                {task.tags?.map((tag) => (
                  <span key={tag} className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary font-medium">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

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
