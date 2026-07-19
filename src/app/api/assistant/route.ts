import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const ALLOWED_MODELS = [
  "claude-fable-5",
  "claude-opus-4-8",
  "claude-sonnet-5",
  "claude-haiku-4-5-20251001",
  "claude-sonnet-4-6",
];

function buildSystemPrompt(today: string, page: string): string {
  return `You are a helpful planning assistant integrated into a task planner app. Today's date is ${today}. The user is currently viewing the "${page}" page.

Your role:
- Suggest task priorities and time estimates
- Recommend what to work on next based on deadlines and priorities
- Help break down complex tasks into smaller, actionable steps
- Give productivity advice based on the user's current task list
- Keep responses concise (2-4 sentences) unless the user asks for more detail

Important:
- Always reply in the same language the user writes in (Ukrainian, English, or mixed)
- Reference specific tasks from the user's list when relevant
- Be encouraging but practical`;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json(
        { error: "ANTHROPIC_API_KEY is not set. Add it in Vercel Environment Variables." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { message, tasks, model, page } = body as {
      message?: string;
      tasks?: unknown[];
      model?: string;
      page?: string;
    };

    if (!message || typeof message !== "string" || !message.trim()) {
      return Response.json({ error: "Message is required" }, { status: 400 });
    }

    const safeModel = model && ALLOWED_MODELS.includes(model) ? model : "claude-sonnet-5";
    const safePage = page || "today";
    const today = new Date().toISOString().split("T")[0];

    const tasksContext = Array.isArray(tasks) && tasks.length > 0
      ? `\n\nUser's current tasks:\n${JSON.stringify(tasks, null, 2)}`
      : "";

    const userContent = message.trim() + tasksContext;

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const response = await anthropic.messages.create({
      model: safeModel,
      max_tokens: 1024,
      system: buildSystemPrompt(today, safePage),
      messages: [{ role: "user", content: userContent }],
    });

    const reply = response.content
      .filter((block) => block.type === "text")
      .map((block) => {
        if (block.type === "text") return block.text;
        return "";
      })
      .join("");

    return Response.json({ reply });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Internal error";
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
