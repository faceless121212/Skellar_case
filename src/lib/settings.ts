"use client";

const SETTINGS_KEY = "ai-planner-settings";

export interface ModelOption {
  id: string;
  name: string;
  badge?: string;
}

export const AVAILABLE_MODELS: ModelOption[] = [
  { id: "claude-fable-5", name: "Fable 5", badge: "Newest" },
  { id: "claude-opus-4-8", name: "Opus 4.8" },
  { id: "claude-sonnet-5", name: "Sonnet 5" },
  { id: "claude-haiku-4-5-20251001", name: "Haiku 4.5" },
];

interface Settings {
  model: string;
}

const defaults: Settings = {
  model: "claude-sonnet-5",
};

function load(): Settings {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch {
    return defaults;
  }
}

function save(settings: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getSelectedModel(): string {
  return load().model;
}

export function setSelectedModel(modelId: string): void {
  const settings = load();
  settings.model = modelId;
  save(settings);
}
