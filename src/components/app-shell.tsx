"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Toaster } from "@/components/ui/sonner";
import { Inbox, Sun, PenLine, Sparkles, CalendarDays } from "lucide-react";

const navItems = [
  { href: "/", label: "Capture", icon: PenLine },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/today", label: "Today", icon: Sun },
  { href: "/week", label: "Week", icon: CalendarDays },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col pb-16 sm:pb-0">
      {/* Desktop header */}
      <header className="hidden sm:block border-b bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
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

          <div className="w-[88px]" />
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/80 backdrop-blur-xl safe-bottom">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`
                  flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 transition-all duration-200
                  ${isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                  }
                `}
              >
                <Icon className={`h-5 w-5 ${isActive ? "stroke-[2.5]" : ""}`} />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <Toaster
        position="top-center"
        toastOptions={{
          className: "rounded-xl shadow-lg border",
        }}
      />
    </div>
  );
}
