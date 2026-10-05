import type { Role } from "../types";
/**
 * Mock authentication service.
 * Replace `login` / `logout` internals with real API calls (e.g. POST /api/auth/login);
 * the session store + hook contract stays the same.
 */
export interface Session {
  name: string;
  email: string;
  role: Role;
}

const KEY = "reinsoft-gold-session";
const listeners = new Set<() => void>();
let cacheRaw: string | null = null;
let cacheValue: Session | null = null;

const emit = () => listeners.forEach((l) => l());

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(KEY) ?? window.sessionStorage.getItem(KEY);
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    try {
      cacheValue = raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      cacheValue = null;
    }
  }
  return cacheValue;
}

export function subscribeSession(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

const DEMO_USERS: { login: string[]; password: string; name: string; email: string; role: Role }[] = [
  { login: ["admin", "admin@reinsoft.gold"], password: "admin123", name: "Admin", email: "admin@reinsoft.gold", role: "Owner" },
  { login: ["staff", "staff@reinsoft.gold"], password: "staff123", name: "Rohit", email: "staff@reinsoft.gold", role: "Staff" },
  { login: ["accounts", "accounts@reinsoft.gold"], password: "acc123", name: "Meena", email: "accounts@reinsoft.gold", role: "Accountant" },
];

export class AuthError  extends Error {}

export async function login(input: { identifier: string; password: string; remember: boolean }) {
  await new Promise((r) => setTimeout(r, 900));
  const id = input.identifier.trim().toLowerCase();
  const user = DEMO_USERS.find((u) => u.login.includes(id));
  if (!user || input.password !== user.password) {
    throw new AuthError("Invalid username or password. Please try again.");
  }
  const session: Session = { name: user.name, email: user.email, role: user.role };
  window.localStorage.removeItem(KEY);
  window.sessionStorage.removeItem(KEY);
  (input.remember ? window.localStorage : window.sessionStorage).setItem(KEY, JSON.stringify(session));
  emit();
  return session;
}

export function logout() {
  window.localStorage.removeItem(KEY);
  window.sessionStorage.removeItem(KEY);
  emit();
}
