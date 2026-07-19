import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function buildSystemPrompt(today: string): string {
  const tomorrow = new Date(new Date(today).getTime() + 86400000).toISOString().split("T")[0];
  return `You are a task extraction assistant. The user will give you a freeform text dump in ANY language (Ukrainian, English, Russian, Polish, German, Spanish, mixed, transliterated, or slang). Your job is to extract individual tasks from this text.

For each task, return:
- title: a clean, actionable task title (KEEP the same language the user used — do NOT translate)
- priority: "low", "medium", or "high" based on urgency cues
- due_date: ISO date string (YYYY-MM-DD) or null. Today is ${today}, tomorrow is ${tomorrow}. Interpret relative dates in any language: "завтра"/"tomorrow"/"morgen"/"mañana" = ${tomorrow}, "сьогодні"/"today"/"heute"/"hoy" = ${today}, "післязавтра"/"day after tomorrow" = day after ${tomorrow}, "в понеділок"/"on Monday" = next Monday from ${today}, etc.
- scheduled_time: HH:MM format (24h) or null. Parse time in any format: "at 3pm" = "15:00", "о 10 ранку" = "10:00", "at 14:30" = "14:30", "в обід" = "12:00", "ввечері" = "19:00", "вранці" = "09:00"
- tags: array of 1-3 short category tags in English (e.g. ["work"], ["shopping"], ["health", "personal"]). Always assign at least one tag based on the task content.
- estimated_minutes: estimated time in minutes to complete the task (e.g. 15, 30, 60). Use your best judgment.

Rules:
- ALWAYS return at least one task, even if the input is unclear, gibberish, emoji-only, or a single word — use the raw text as the task title
- One text dump may contain multiple tasks — split them by commas, newlines, "and"/"і"/"и", or context shifts
- If no urgency cue is given, default to "medium"
- Priority cues in any language: "не терміново"/"not urgent"/"low priority"/"можна потім" → "low"; "терміново"/"urgent"/"ASAP"/"важливо"/"срочно"/"important" → "high"
- Handle typos and informal speech gracefully — "kupyty moloko" should become a shopping task
- Respond with ONLY valid JSON — no markdown fences, no explanation, just a raw JSON array`;
}

const ALLOWED_MODELS = [
  "claude-fable-5",
  "claude-opus-4-8",
  "claude-sonnet-5",
  "claude-haiku-4-5-20251001",
  "claude-sonnet-4-6",
];

async function callClaude(rawInput: string, today: string, strict = false, modelId = "claude-sonnet-5"): Promise<unknown> {
  const systemPrompt = strict
    ? buildSystemPrompt(today) + "\n\nCRITICAL: Respond with ONLY valid JSON. No markdown, no backticks, no explanation. Just a raw JSON array."
    : buildSystemPrompt(today);

  const safeModel = ALLOWED_MODELS.includes(modelId) ? modelId : "claude-sonnet-5";

  const message = await anthropic.messages.create({
    model: safeModel,
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: "user", content: rawInput }],
  });

  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => {
      if (block.type === "text") return block.text;
      return "";
    })
    .join("");

  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
}

function validateParsedTasks(data: unknown): { title: string; priority: string; due_date: string | null; scheduled_time: string | null; tags: string[]; estimated_minutes: number | undefined }[] {
  if (!Array.isArray(data)) throw new Error("Expected array");

  return data.map((item: Record<string, unknown>) => {
    if (!item.title || typeof item.title !== "string") {
      throw new Error("Missing title");
    }
    const priority = ["low", "medium", "high"].includes(item.priority as string)
      ? (item.priority as string)
      : "medium";
    const tags = Array.isArray(item.tags)
      ? (item.tags as unknown[]).filter((t): t is string => typeof t === "string")
      : [];
    const estimated_minutes = typeof item.estimated_minutes === "number" ? item.estimated_minutes : undefined;
    return {
      title: item.title,
      priority,
      due_date: typeof item.due_date === "string" ? item.due_date : null,
      scheduled_time: typeof item.scheduled_time === "string" ? item.scheduled_time : null,
      tags,
      estimated_minutes,
    };
  });
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not set. Add it in Vercel Environment Variables." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const rawInput = body.raw_input?.trim();
    const modelId = body.model || "claude-sonnet-5";

    if (!rawInput) {
      return NextResponse.json({ error: "Empty input" }, { status: 400 });
    }

    const today = new Date().toISOString().split("T")[0];

    let parsed: unknown;
    try {
      parsed = await callClaude(rawInput, today, false, modelId);
    } catch {
      try {
        parsed = await callClaude(rawInput, today, true, modelId);
      } catch {
        return NextResponse.json({
          tasks: [{ title: rawInput, priority: "medium", due_date: null, scheduled_time: null, tags: [], estimated_minutes: undefined }],
        });
      }
    }

    let tasks = validateParsedTasks(parsed);

    if (tasks.length === 0) {
      tasks = [{ title: rawInput, priority: "medium", due_date: null, scheduled_time: null, tags: [], estimated_minutes: undefined }];
    }

    return NextResponse.json({ tasks });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
