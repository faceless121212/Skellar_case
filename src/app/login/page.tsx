"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";
import { login, validateLogin, isAuthenticated } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace("/");
    }
  }, [router]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const validationError = validateLogin(identifier);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    login(identifier.trim());
    router.replace("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-8 animate-fade-in">
        <div className="text-center space-y-3">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">AI Planner</h1>
          <p className="text-sm text-muted-foreground">Sign in to plan your day</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="identifier" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Email or Username
            </label>
            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="you@example.com or username"
              autoComplete="username"
              autoFocus
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive font-medium animate-fade-in">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !identifier.trim()}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Sign in"}
          </button>
        </form>

        <p className="text-center text-[11px] text-muted-foreground/50">
          No sign-up needed. Enter any email or username.
        </p>
      </div>
    </div>
  );
}
