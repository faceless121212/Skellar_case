import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const ALLOWED_MODELS = [
  "claude-fable-5",
  "claude-opus-4-8",
  "claude-sonnet-5",
  "claude-haiku-4-5-20251001",
  "claude-sonnet-4-6",
];

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

const tools: Anthropic.Tool[] = [
  {
    name: "modify_tasks",
    description: "Modify one or more tasks when the user asks to change priorities, dates, times, mark done, move between lists, rename, or delete tasks. Use this whenever the user requests a change to their tasks — not just for advice.",
    input_schema: {
      type: "object" as const,
      properties: {
        actions: {
          type: "array",
          description: "List of task modifications to apply",
          items: {
            type: "object",
            properties: {
              action: {
                type: "string",
                enum: ["update", "delete", "complete", "move"],
                description: "Type of action: update (change fields), delete (remove task), complete (mark done), move (change status/list)",
              },
              task_title: {
                type: "string",
                description: "The exact title of the task to modify (must match a task from the user's list)",
              },
              updates: {
                type: "object",
                description: "Fields to update (for update/move actions)",
                properties: {
                  priority: { type: "string", enum: ["low", "medium", "high"] },
                  due_date: { type: ["string", "null"], description: "ISO date YYYY-MM-DD or null" },
                  scheduled_time: { type: ["string", "null"], description: "HH:MM 24h format or null" },
                  estimated_minutes: { type: "number" },
                  title: { type: "string", description: "New title for the task" },
                  status: { type: "string", enum: ["pending", "backlog", "today", "done"] },
                },
              },
            },
            required: ["action", "task_title"],
          },
        },
      },
      required: ["actions"],
    },
  },
];

function buildSystemPrompt(today: string, page: string): string {
  return `You are a helpful planning assistant integrated into a task planner app. Today's date is ${today}. The user is currently viewing the "${page}" page.

Your role:
- Suggest task priorities and time estimates
- Recommend what to work on next based on deadlines and priorities
- Help break down complex tasks into smaller, actionable steps
- Give productivity advice based on the user's current task list
- MODIFY TASKS when the user asks you to — use the modify_tasks tool to change priorities, dates, times, statuses, mark tasks done, delete tasks, or rename them

When the user asks to change something about their tasks (e.g. "make X high priority", "mark Y as done", "move Z to today", "delete task W", "reschedule X to tomorrow", "reprioritize my tasks"), ALWAYS use the modify_tasks tool to apply changes. Don't just suggest — act.

Task statuses: "pending" (inbox), "backlog" (confirmed), "today" (today's list), "done" (completed).

Important:
- Always reply in the same language the user writes in (Ukrainian, English, or mixed)
- Reference specific tasks from the user's list when relevant
- Be encouraging but practical
- Keep responses concise (2-4 sentences) unless the user asks for more detail
- When modifying tasks, also include a brief confirmation message`;
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
      tools,
      messages: [{ role: "user", content: userContent }],
    });

    let reply = "";
    const actions: TaskAction[] = [];

    for (const block of response.content) {
      if (block.type === "text") {
        reply += block.text;
      } else if (block.type === "tool_use" && block.name === "modify_tasks") {
        const input = block.input as { actions?: TaskAction[] };
        if (Array.isArray(input.actions)) {
          actions.push(...input.actions);
        }
      }
    }

    if (response.stop_reason === "tool_use" && !reply) {
      const toolBlock = response.content.find((b) => b.type === "tool_use");
      if (toolBlock) {
        const followUp = await anthropic.messages.create({
          model: safeModel,
          max_tokens: 1024,
          system: buildSystemPrompt(today, safePage),
          tools,
          messages: [
            { role: "user", content: userContent },
            { role: "assistant", content: response.content },
            {
              role: "user",
              content: [
                {
                  type: "tool_result",
                  tool_use_id: toolBlock.id,
                  content: "Actions applied successfully.",
                },
              ],
            },
          ],
        });

        for (const block of followUp.content) {
          if (block.type === "text") {
            reply += block.text;
          }
        }
      }
    }

    if (!reply && actions.length > 0) {
      reply = `Done! Updated ${actions.length} task${actions.length !== 1 ? "s" : ""}.`;
    }

    return Response.json({ reply, actions });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Internal error";
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
