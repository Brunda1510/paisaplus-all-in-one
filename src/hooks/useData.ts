import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError } from "@/lib/finance";

export type Goal = {
  id: string;
  goal_name: string;
  target_amount: number;
  saved_amount: number;
  target_date: string;
  created_at: string;
};
export type Expense = {
  id: string;
  category: string;
  amount: number;
  description: string;
  expense_date: string;
  created_at: string;
};
export type Deposit = {
  id: string;
  amount: number;
  duration: number;
  interest_rate: number;
  maturity_amount: number;
  deposit_date: string;
  created_at: string;
};
export type SavingsPlan = {
  id: string;
  income: number;
  monthly_expense: number;
  savings_target: number;
  recommended_saving: number;
  target_date: string;
  created_at: string;
};
export type Badge = { id: string; badge_name: string; earned_at: string };
export type SimRun = {
  id: string;
  current_savings: number;
  monthly_saving: number;
  expected_return: number;
  years: number;
  projected_amount: number;
  created_at: string;
};

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const id = data.session?.user.id;
  if (!id) throw new Error("Your session expired. Please log in again.");
  return id;
}

function numeric<T extends Record<string, unknown>>(rows: T[], keys: string[]): T[] {
  return rows.map((row) => {
    const copy: Record<string, unknown> = { ...row };
    for (const k of keys) if (copy[k] != null) copy[k] = Number(copy[k]);
    return copy as T;
  });
}

export function useGoals() {
  return useQuery({
    queryKey: ["goals"],
    queryFn: async (): Promise<Goal[]> => {
      const { data, error } = await supabase
        .from("goals")
        .select("id, goal_name, target_amount, saved_amount, target_date, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return numeric((data ?? []) as unknown as Goal[], ["target_amount", "saved_amount"]);
    },
  });
}

export function useExpenses() {
  return useQuery({
    queryKey: ["expenses"],
    queryFn: async (): Promise<Expense[]> => {
      const { data, error } = await supabase
        .from("expenses")
        .select("id, category, amount, description, expense_date, created_at")
        .order("expense_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return numeric((data ?? []) as unknown as Expense[], ["amount"]);
    },
  });
}

export function useDeposits() {
  return useQuery({
    queryKey: ["deposits"],
    queryFn: async (): Promise<Deposit[]> => {
      const { data, error } = await supabase
        .from("deposits")
        .select("id, amount, duration, interest_rate, maturity_amount, deposit_date, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return numeric((data ?? []) as unknown as Deposit[], [
        "amount",
        "duration",
        "interest_rate",
        "maturity_amount",
      ]);
    },
  });
}

export function usePlans() {
  return useQuery({
    queryKey: ["savings_plans"],
    queryFn: async (): Promise<SavingsPlan[]> => {
      const { data, error } = await supabase
        .from("savings_plans")
        .select(
          "id, income, monthly_expense, savings_target, recommended_saving, target_date, created_at",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return numeric((data ?? []) as unknown as SavingsPlan[], [
        "income",
        "monthly_expense",
        "savings_target",
        "recommended_saving",
      ]);
    },
  });
}

export function useBadges() {
  return useQuery({
    queryKey: ["badges"],
    queryFn: async (): Promise<Badge[]> => {
      const { data, error } = await supabase
        .from("badges")
        .select("id, badge_name, earned_at")
        .order("earned_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Badge[];
    },
  });
}

export function useSimRuns() {
  return useQuery({
    queryKey: ["simulator"],
    queryFn: async (): Promise<SimRun[]> => {
      const { data, error } = await supabase
        .from("simulator")
        .select(
          "id, current_savings, monthly_saving, expected_return, years, projected_amount, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return numeric((data ?? []) as unknown as SimRun[], [
        "current_savings",
        "monthly_saving",
        "expected_return",
        "years",
        "projected_amount",
      ]);
    },
  });
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const userId = await requireUserId();
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, created_at")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as { id: string; name: string; email: string; created_at: string } | null;
    },
  });
}

/** Awards a badge once. Silently ignores duplicates. */
export async function awardBadge(badgeName: string) {
  try {
    const user_id = await requireUserId();
    const { error } = await supabase.from("badges").insert({ user_id, badge_name: badgeName });
    if (!error) toast.success(`Badge unlocked: ${badgeName} 🏆`);
  } catch {
    /* badges are a bonus — never break the main flow */
  }
}

type MutationOptions<TInput> = {
  keys: string[][];
  successMessage: string;
  run: (input: TInput, userId: string) => Promise<void>;
  after?: (input: TInput) => Promise<void> | void;
};

export function useDbMutation<TInput>({ keys, successMessage, run, after }: MutationOptions<TInput>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TInput) => {
      const userId = await requireUserId();
      await run(input, userId);
      return input;
    },
    onSuccess: async (input) => {
      await Promise.all(keys.map((key) => qc.invalidateQueries({ queryKey: key })));
      toast.success(successMessage);
      await after?.(input);
      await qc.invalidateQueries({ queryKey: ["badges"] });
    },
    onError: (error) => {
      toast.error(friendlyError(error));
    },
  });
}

export { requireUserId };
