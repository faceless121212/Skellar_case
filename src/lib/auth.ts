"use client";

const AUTH_KEY = "ai-planner-auth";

const VALID_CREDENTIALS = {
  username: "admin",
  password: "admin123",
};

export interface AuthUser {
  name: string;
  email?: string;
  method: "credentials" | "google";
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

export function loginWithCredentials(username: string, password: string): AuthUser | null {
  if (username === VALID_CREDENTIALS.username && password === VALID_CREDENTIALS.password) {
    const user: AuthUser = { name: username, method: "credentials" };
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    return user;
  }
  return null;
}

export function loginWithGoogle(name: string, email: string): AuthUser {
  const user: AuthUser = { name, email, method: "google" };
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  return user;
}

export function logout(): void {
  localStorage.removeItem(AUTH_KEY);
}

export function isAuthenticated(): boolean {
  return getUser() !== null;
}
