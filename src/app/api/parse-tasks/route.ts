import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function buildSystemPrompt(today: string): string {
  return `You are a task extraction assistant. The user will give you a freeform text dump (possibly in Ukrainian, English, or mixed languages). Your job is to extract individual tasks from this text.

For each task, return:
- title: a clean, actionable task title (in the same language the user used)
- priority: "low", "medium", or "high" based on urgency cues
- due_date: ISO date string (YYYY-MM-DD) or null. Today is ${today}. Interpret relative dates: "завтра"/"tomorrow" = tomorrow, "сьогодні"/"today" = today, "afterтоmorrow"/"післязавтра" = day after tomorrow, etc.
- scheduled_time: HH:MM format (24h) or null, if the user mentioned a specific time

Rules:
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

function validateParsedTasks(data: unknown): { title: string; priority: string; due_date: string | null; scheduled_time: string | null }[] {
  if (!Array.isArray(data)) throw new Error("Expected array");

  return data.map((item: Record<string, unknown>) => {
    if (!item.title || typeof item.title !== "string") {
      throw new Error("Missing title");
    }
    const priority = ["low", "medium", "high"].includes(item.priority as string)
      ? (item.priority as string)
      : "medium";
    return {
      title: item.title,
      priority,
      due_date: typeof item.due_date === "string" ? item.due_date : null,
      scheduled_time: typeof item.scheduled_time === "string" ? item.scheduled_time : null,
    };
  });
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return []; },
          setAll() {},
        },
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const rawInput = body.raw_input?.trim();
    const source = body.source === "voice" ? "voice" : "text";

    if (!rawInput) {
      return NextResponse.json({ error: "Empty input" }, { status: 400 });
    }

    const today = new Date().toISOString().split("T")[0];

    let parsed: unknown;
    try {
      parsed = await callClaude(rawInput, today);
    } catch {
      parsed = await callClaude(rawInput, today, true);
    }

    const tasks = validateParsedTasks(parsed);

    const rows = tasks.map((task) => ({
      user_id: user.id,
      raw_input: rawInput,
      title: task.title,
      priority: task.priority,
      due_date: task.due_date,
      scheduled_time: task.scheduled_time,
      status: "backlog",
      source,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from("tasks")
      .insert(rows)
      .select();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ tasks: inserted });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
