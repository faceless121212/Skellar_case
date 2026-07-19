import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const ALLOWED_MODELS = [
  "claude-fable-5",
  "claude-opus-4-8",
  "claude-sonnet-5",
  "claude-haiku-4-5-20251001",
  "claude-sonnet-4-6",
];

interface TaskInput {
  id: string;
  title: string;
  priority: string;
  due_date: string | null;
  scheduled_time: string | null;
  estimated_minutes?: number;
  tags?: string[];
  status: string;
}

interface PlannedTask {
  id: string;
  priority: "low" | "medium" | "high";
  scheduled_time: string | null;
  estimated_minutes: number;
  order: number;
}

function buildSystemPrompt(today: string): string {
  return `You are a smart day planner. Today is ${today}. The user will give you a list of tasks. Your job is to prioritize and schedule them for today.

For each task, return:
- id: the task's original id (pass through unchanged)
- priority: re-evaluated "low", "medium", or "high" based on due dates, context, and urgency
- scheduled_time: suggested time slot in HH:MM 24h format, or null if flexible
- estimated_minutes: estimated duration (keep original if reasonable, adjust if not)
- order: integer 1-N for recommended execution order (1 = do first)

Rules for prioritization:
- Tasks due today or overdue → "high" priority
- Tasks due tomorrow → at least "medium"
- Tasks with no due date → keep original priority unless context suggests otherwise
- Short tasks (< 15min) early in the day to build momentum
- Deep work tasks in the morning (9-12), meetings/calls in the afternoon
- Group similar tasks (same tags) together
- Don't schedule past 18:00 unless the task already has a later time
- Leave 15-min gaps between tasks
- Start scheduling from 09:00

Respond with ONLY valid JSON — no markdown fences, no explanation. Return a JSON array of objects.`;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json(
        { error: "ANTHROPIC_API_KEY is not set." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { tasks, model } = body as {
      tasks?: TaskInput[];
      model?: string;
    };

    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return Response.json({ error: "No tasks to plan" }, { status: 400 });
    }

    const safeModel = model && ALLOWED_MODELS.includes(model) ? model : "claude-sonnet-5";
    const today = new Date().toISOString().split("T")[0];

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const response = await anthropic.messages.create({
      model: safeModel,
      max_tokens: 2048,
      system: buildSystemPrompt(today),
      messages: [
        {
          role: "user",
          content: `Plan these tasks for today:\n${JSON.stringify(tasks, null, 2)}`,
        },
      ],
    });

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("");

    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let planned: PlannedTask[];
    try {
      planned = JSON.parse(cleaned);
    } catch {
      return Response.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    if (!Array.isArray(planned)) {
      return Response.json({ error: "Invalid AI response format" }, { status: 500 });
    }

    const validPriorities = ["low", "medium", "high"];
    const validated = planned.map((p) => ({
      id: String(p.id),
      priority: validPriorities.includes(p.priority) ? p.priority : "medium",
      scheduled_time: typeof p.scheduled_time === "string" ? p.scheduled_time : null,
      estimated_minutes: typeof p.estimated_minutes === "number" ? p.estimated_minutes : 30,
      order: typeof p.order === "number" ? p.order : 99,
    }));

    return Response.json({ planned: validated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return Response.json({ error: message }, { status: 500 });
  }
}
