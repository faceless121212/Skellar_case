import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function POST(request: NextRequest) {
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

  const today = new Date().toISOString().split("T")[0];

  // Fetch backlog tasks that are due today, overdue, or have no due date
  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id, priority, due_date")
    .eq("status", "backlog")
    .or(`due_date.is.null,due_date.lte.${today}`);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!tasks || tasks.length === 0) {
    return NextResponse.json({ moved: 0 });
  }

  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };

  const sorted = tasks.sort((a, b) => {
    const pa = priorityOrder[a.priority] ?? 1;
    const pb = priorityOrder[b.priority] ?? 1;
    if (pa !== pb) return pa - pb;
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
    if (a.due_date && !b.due_date) return -1;
    if (!a.due_date && b.due_date) return 1;
    return 0;
  });

  const ids = sorted.map((t) => t.id);

  const { error: updateError } = await supabase
    .from("tasks")
    .update({ status: "today" })
    .in("id", ids);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ moved: ids.length });
}
