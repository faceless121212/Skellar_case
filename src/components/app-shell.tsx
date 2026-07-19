"use client";

import { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { Toaster } from "@/components/ui/sonner";
import { Inbox, Sun, PenLine, Sparkles, CalendarDays, CheckCircle2, LogOut } from "lucide-react";
import { logout, getUser } from "@/lib/auth";
import { AIAssistant } from "@/components/ai-assistant";
import { getTasks } from "@/lib/task-store";

const navItems = [
  { href: "/", label: "Capture", icon: PenLine },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/today", label: "Today", icon: Sun },
  { href: "/done", label: "Done", icon: CheckCircle2 },
  { href: "/week", label: "Week", icon: CalendarDays },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = getUser();

  const currentPage = pathname === "/" ? "capture" : pathname.replace("/", "").split("/")[0];
  const showAssistant = currentPage !== "capture" && currentPage !== "task";
  const [refreshKey, setRefreshKey] = useState(0);
  const tasks = useMemo(() => {
    void refreshKey;
    if (!showAssistant) return [];
    if (currentPage === "today") return getTasks("today");
    if (currentPage === "inbox") return getTasks("pending");
    if (currentPage === "done") return getTasks("done");
    return getTasks();
  }, [currentPage, showAssistant, refreshKey]);

  const handleTasksChanged = useCallback(() => {
    setRefreshKey((k) => k + 1);
    router.refresh();
  }, [router]);

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <div className="flex min-h-[100dvh] flex-col pb-[72px] sm:pb-0">
      {/* Desktop header */}
      <header className="hidden sm:block border-b bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Planner</span>
          </div>

          <nav className="flex items-center gap-1 rounded-full bg-muted/60 p-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`
                    flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200
                    ${isActive
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {user && (
              <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                {user.name}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-center justify-around px-1 py-1.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`
                  flex flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 min-w-0 transition-all duration-200
                  ${isActive
                    ? "text-primary"
                    : "text-muted-foreground active:text-foreground"
                  }
                `}
              >
                <Icon className={`h-5 w-5 ${isActive ? "stroke-[2.5]" : ""}`} />
                <span className="text-[10px] font-medium truncate">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {showAssistant && <AIAssistant page={currentPage} tasks={tasks} onTasksChanged={handleTasksChanged} />}

      <Toaster
        position="top-center"
        duration={1000}
        toastOptions={{
          className: "rounded-xl shadow-lg border",
        }}
      />
    </div>
  );
}
