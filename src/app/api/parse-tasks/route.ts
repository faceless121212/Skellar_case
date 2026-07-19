import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function buildSystemPrompt(today: string): string {
  return `You are a task extraction assistant. The user will give you a freeform text dump (possibly in Ukrainian, English, or mixed languages). Your job is to extract individual tasks from this text.

For each task, return:
- title: a clean, actionable task title (in the same language the user used)
- priority: "low", "medium", or "high" based on urgency cues
- due_date: ISO date string (YYYY-MM-DD) or null. Today is ${today}. Interpret relative dates: "завтра"/"tomorrow" = tomorrow, "сьогодні"/"today" = today, etc.
- scheduled_time: HH:MM format (24h) or null, if the user mentioned a specific time
- tags: array of 1-3 short category tags (e.g. ["work"], ["shopping"], ["health", "personal"]). Always assign at least one tag based on the task content.
- estimated_minutes: estimated time in minutes to complete the task (e.g. 15, 30, 60). Use your best judgment.

Rules:
- ALWAYS return at least one task, even if the input is unclear or seems like gibberish — use the raw text as the task title
- One text dump may contain multiple tasks — split them into separate items
- If no urgency cue is given, default to "medium"
- If the user explicitly says something is not urgent ("не терміново", "not urgent", "low priority"), set priority to "low"
- If the user says urgent/important/ASAP/терміново, set priority to "high"
- Respond with ONLY valid JSON — no markdown fences, no explanation, just a JSON array`;
}

async function callClaude(rawInput: string, today: string, strict = false): Promise<unknown> {
  const systemPrompt = strict
    ? buildSystemPrompt(today) + "\n\nCRITICAL: Respond with ONLY valid JSON. No markdown, no backticks, no explanation. Just a raw JSON array."
    : buildSystemPrompt(today);

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
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

    if (!rawInput) {
      return NextResponse.json({ error: "Empty input" }, { status: 400 });
    }

    const today = new Date().toISOString().split("T")[0];

    let parsed: unknown;
    try {
      parsed = await callClaude(rawInput, today);
    } catch {
      try {
        parsed = await callClaude(rawInput, today, true);
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
