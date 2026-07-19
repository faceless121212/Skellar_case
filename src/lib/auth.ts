"use client";

const AUTH_KEY = "ai-planner-auth";

export interface AuthUser {
  name: string;
  email?: string;
  method: "credentials";
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function login(identifier: string): AuthUser {
  const isEmail = identifier.includes("@");
  const user: AuthUser = {
    name: isEmail ? identifier.split("@")[0] : identifier,
    email: isEmail ? identifier : undefined,
    method: "credentials",
  };
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  return user;
}

export function validateLogin(identifier: string): string | null {
  const trimmed = identifier.trim();
  if (!trimmed) return "Please enter your email or username";
  if (trimmed.includes("@")) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) return "Please enter a valid email address";
  }
  return null;
}

export function logout(): void {
  localStorage.removeItem(AUTH_KEY);
}

export function isAuthenticated(): boolean {
  return getUser() !== null;
}
