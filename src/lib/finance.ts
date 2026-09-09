export const CATEGORIES = [
  "Food",
  "Travel",
  "Shopping",
  "Education",
  "Entertainment",
  "Bills",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_COLORS: Record<string, string> = {
  Food: "var(--color-chart-1)",
  Travel: "var(--color-chart-2)",
  Shopping: "var(--color-chart-3)",
  Education: "var(--color-chart-4)",
  Entertainment: "var(--color-chart-5)",
  Bills: "var(--color-chart-6)",
  Other: "var(--color-chart-7)",
};

export function inr(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);
}

export function num(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function progressPct(saved: number, target: number): number {
  if (!(target > 0)) return 0;
  return Math.max(0, Math.min(100, (saved / target) * 100));
}

export function daysRemaining(targetDate: string): number {
  const today = new Date(todayISO() + "T00:00:00");
  const target = new Date(targetDate + "T00:00:00");
  const diff = Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
  return Math.max(0, diff);
}

export type TreeStage = { emoji: string; label: string; scale: number };

export function treeStage(pct: number): TreeStage {
  if (pct >= 100) return { emoji: "🌳", label: "Fully Grown Tree", scale: 1 };
  if (pct >= 81) return { emoji: "🌲", label: "Almost Complete", scale: 0.88 };
  if (pct >= 61) return { emoji: "🌴", label: "Large Tree", scale: 0.76 };
  if (pct >= 41) return { emoji: "🪴", label: "Growing Tree", scale: 0.64 };
  if (pct >= 21) return { emoji: "☘️", label: "Small Plant", scale: 0.52 };
  return { emoji: "🌱", label: "Seed", scale: 0.42 };
}

export function goalMetrics(saved: number, target: number, targetDate: string) {
  const pct = progressPct(saved, target);
  const remaining = Math.max(0, target - saved);
  const days = daysRemaining(targetDate);
  const weeks = Math.max(1, Math.ceil(days / 7));
  const months = Math.max(1, Math.ceil(days / 30));
  const complete = remaining === 0;
  return {
    pct,
    remaining,
    days,
    complete,
    dueToday: !complete && days === 0,
    weekly: complete ? 0 : remaining / weeks,
    monthly: complete ? 0 : remaining / months,
    stage: treeStage(pct),
  };
}

/** Compound interest, annual compounding. duration is in months. */
export function maturity(amount: number, months: number, ratePct: number) {
  const years = months / 12;
  const value = amount * Math.pow(1 + ratePct / 100, years);
  const rounded = Math.round(value * 100) / 100;
  return { maturityAmount: rounded, growth: Math.round((rounded - amount) * 100) / 100 };
}

/** Future value of current savings + monthly contributions, monthly compounding. */
export function projectSavings(
  current: number,
  monthly: number,
  annualReturnPct: number,
  years: number,
) {
  const r = annualReturnPct / 100 / 12;
  const rows: { year: number; value: number; contributed: number }[] = [];
  let value = current;
  let contributed = current;
  const totalMonths = Math.round(years * 12);
  for (let m = 1; m <= totalMonths; m++) {
    value = value * (1 + r) + monthly;
    contributed += monthly;
    if (m % 12 === 0 || m === totalMonths) {
      rows.push({
        year: Math.round((m / 12) * 10) / 10,
        value: Math.round(value),
        contributed: Math.round(contributed),
      });
    }
  }
  const projected = Math.round(value * 100) / 100;
  return { projected, contributed: Math.round(contributed * 100) / 100, rows };
}

export function monthKey(date: string): string {
  return date.slice(0, 7);
}

export function isThisMonth(date: string): boolean {
  return monthKey(date) === monthKey(todayISO());
}

export function isLastNDays(date: string, n: number): boolean {
  const d = new Date(date + "T00:00:00").getTime();
  const now = new Date(todayISO() + "T00:00:00").getTime();
  return d <= now && now - d < n * 86_400_000;
}

export function friendlyError(error: unknown): string {
  const raw =
    typeof error === "string"
      ? error
      : error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : "";
  const m = raw.toLowerCase();
  if (!raw) return "Something went wrong. Please try again.";
  if (m.includes("invalid login credentials")) return "Wrong email or password.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "An account with this email already exists. Try logging in.";
  if (m.includes("email not confirmed")) return "Please confirm your email before logging in.";
  if (m.includes("password should be")) return "Password must be at least 6 characters.";
  if (m.includes("invalid email") || m.includes("email address")) return "Please enter a valid email address.";
  if (m.includes("jwt") || m.includes("session") || m.includes("token"))
    return "Your session expired. Please log in again.";
  if (m.includes("failed to fetch") || m.includes("network")) return "Network problem. Check your connection.";
  if (m.includes("row-level security") || m.includes("permission"))
    return "You do not have access to that record.";
  if (m.includes("duplicate key")) return "That already exists.";
  if (m.includes("rate limit")) return "Too many attempts. Please wait a moment.";
  return raw;
}
