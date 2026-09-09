import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { Disclaimer, FieldError, Loading, StatCard } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarkdownLite } from "@/components/MarkdownLite";
import { supabase } from "@/integrations/supabase/client";
import { useDbMutation, usePlans } from "@/hooks/useData";
import { aiSavingsAdvice } from "@/lib/ai.functions";
import { friendlyError, inr, todayISO } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/savings-plan")({
  head: () => ({
    meta: [
      { title: "AI Savings Plan — PaisaPluse" },
      { name: "description", content: "Get a personalised monthly saving plan and store it in your account." },
      { property: "og:title", content: "AI Savings Plan — PaisaPluse" },
      { property: "og:description", content: "Get a personalised monthly saving plan." },
    ],
  }),
  component: PlanPage,
});

function monthsBetween(target: string) {
  const now = new Date(todayISO() + "T00:00:00");
  const end = new Date(target + "T00:00:00");
  const days = Math.ceil((end.getTime() - now.getTime()) / 86_400_000);
  return Math.max(1, Math.ceil(days / 30));
}

function PlanPage() {
  const plans = usePlans();
  const advise = useServerFn(aiSavingsAdvice);
  const [income, setIncome] = useState("");
  const [expense, setExpense] = useState("");
  const [target, setTarget] = useState("");
  const [date, setDate] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [advice, setAdvice] = useState("");
  const [adviceBusy, setAdviceBusy] = useState(false);

  const n = {
    income: Number(income),
    expense: Number(expense),
    target: Number(target),
  };
  const ready =
    income !== "" &&
    expense !== "" &&
    target !== "" &&
    date !== "" &&
    Number.isFinite(n["income"]) &&
    Number.isFinite(n["expense"]) &&
    Number.isFinite(n["target"]) &&
    n["income"] >= 0 &&
    n["expense"] >= 0 &&
    n["target"] > 0 &&
    date >= todayISO();

  const months = ready ? monthsBetween(date) : 0;
  const recommended = ready ? Math.round((n["target"] / months) * 100) / 100 : 0;
  const surplus = ready ? n["income"] - n["expense"] : 0;
  const spendingLimit = ready ? Math.max(0, n["income"] - recommended) : 0;
  const achievable = ready && recommended <= surplus;
  const monthsAtSurplus = ready && surplus > 0 ? Math.ceil(n["target"] / surplus) : null;

  function validate() {
    const found: Record<string, string> = {};
    if (income === "" || !Number.isFinite(n["income"]) || n["income"] < 0)
      found["income"] = "Enter a valid monthly income.";
    if (expense === "" || !Number.isFinite(n["expense"]) || n["expense"] < 0)
      found["expense"] = "Enter valid monthly expenses.";
    if (target === "" || !Number.isFinite(n["target"])) found["target"] = "Enter a valid savings target.";
    else if (n["target"] <= 0) found["target"] = "Target must be more than ₹0.";
    if (!date) found["date"] = "Target date is required.";
    else if (date < todayISO()) found["date"] = "Target date cannot be in the past.";
    setErrors(found);
    return Object.keys(found).length === 0;
  }

  const save = useDbMutation<void>({
    keys: [["savings_plans"]],
    successMessage: "Plan saved",
    run: async (_input, userId) => {
      const { error } = await supabase.from("savings_plans").insert({
        user_id: userId,
        income: n["income"],
        monthly_expense: n["expense"],
        savings_target: n["target"],
        recommended_saving: recommended,
        target_date: date,
      });
      if (error) throw error;
    },
  });

  async function getAdvice() {
    if (!validate() || adviceBusy) return;
    setAdviceBusy(true);
    try {
      const result = await advise({
        data: {
          income: n["income"],
          expense: n["expense"],
          target: n["target"],
          months,
          recommended,
        },
      });
      setAdvice(result.text);
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setAdviceBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="AI Savings Plan 💡" subtitle="A realistic monthly number, based on your inputs." />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface p-5">
          <h2 className="font-display text-base font-semibold">Your numbers</h2>
          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="income">Monthly income ₹</Label>
              <Input
                id="income"
                type="number"
                step="0.01"
                min="0"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
              />
              <FieldError>{errors["income"]}</FieldError>
            </div>
            <div>
              <Label htmlFor="expense">Monthly expenses ₹</Label>
              <Input
                id="expense"
                type="number"
                step="0.01"
                min="0"
                value={expense}
                onChange={(e) => setExpense(e.target.value)}
              />
              <FieldError>{errors["expense"]}</FieldError>
            </div>
            <div>
              <Label htmlFor="target">Savings target ₹</Label>
              <Input
                id="target"
                type="number"
                step="0.01"
                min="0"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
              <FieldError>{errors["target"]}</FieldError>
            </div>
            <div>
              <Label htmlFor="pdate">Target date</Label>
              <Input id="pdate" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <FieldError>{errors["date"]}</FieldError>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={getAdvice} disabled={adviceBusy}>
              {adviceBusy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Generate plan
            </Button>
            <Button
              variant="secondary"
              disabled={save.isPending}
              onClick={() => {
                if (!validate()) return;
                save.mutate(undefined);
              }}
            >
              {save.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save plan
            </Button>
          </div>
        </div>

        <div className="surface p-5">
          <h2 className="font-display text-base font-semibold">Your plan</h2>
          {ready ? (
            <div className="mt-4 grid gap-3">
              <StatCard
                label="Recommended monthly saving"
                value={inr(recommended)}
                hint={`${months} month${months === 1 ? "" : "s"} to your target date`}
              />
              <StatCard label="Suggested spending limit" value={inr(spendingLimit)} hint="Per month" />
              <StatCard
                label="Estimated time to goal"
                value={
                  monthsAtSurplus
                    ? `${monthsAtSurplus} month${monthsAtSurplus === 1 ? "" : "s"}`
                    : "Not reachable yet"
                }
                hint={
                  achievable
                    ? "Your plan fits your monthly surplus"
                    : "Required saving is above your monthly surplus"
                }
              />
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Fill in all four fields to see your plan.
            </p>
          )}
          {advice ? (
            <div className="mt-4 border-t pt-4">
              <MarkdownLite text={advice} />
            </div>
          ) : null}
          <Disclaimer>Educational information only. This is not professional financial advice.</Disclaimer>
        </div>
      </div>

      <h2 className="mb-3 mt-8 font-display text-lg font-semibold">Saved plans</h2>
      {plans.isLoading ? (
        <Loading />
      ) : (plans.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">No plans saved yet.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {(plans.data ?? []).map((p) => (
            <li key={p.id} className="surface p-4 text-sm">
              <p className="font-medium">
                Save {inr(p.recommended_saving)}/month until {p.target_date}
              </p>
              <p className="mt-1 text-muted-foreground">
                Target {inr(p.savings_target)} · income {inr(p.income)} · expenses{" "}
                {inr(p.monthly_expense)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
