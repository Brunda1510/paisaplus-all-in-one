import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Disclaimer, FieldError, Loading, StatCard } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useDbMutation, useSimRuns } from "@/hooks/useData";
import { inr, projectSavings } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/future-me")({
  head: () => ({
    meta: [
      { title: "Future Me Simulator — PaisaPluse" },
      { name: "description", content: "Project your savings years ahead with a year-by-year chart." },
      { property: "og:title", content: "Future Me Simulator — PaisaPluse" },
      { property: "og:description", content: "Project your savings years ahead." },
    ],
  }),
  component: FuturePage,
});

function FuturePage() {
  const runs = useSimRuns();
  const [current, setCurrent] = useState("");
  const [monthly, setMonthly] = useState("");
  const [rate, setRate] = useState("");
  const [years, setYears] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const n = {
    current: Number(current),
    monthly: Number(monthly),
    rate: Number(rate),
    years: Number(years),
  };
  const ready =
    current !== "" &&
    monthly !== "" &&
    rate !== "" &&
    years !== "" &&
    Object.values(n).every((v) => Number.isFinite(v)) &&
    n["current"] >= 0 &&
    n["monthly"] >= 0 &&
    n["rate"] >= 0 &&
    n["years"] > 0 &&
    n["years"] <= 60;

  const result = ready ? projectSavings(n["current"], n["monthly"], n["rate"], n["years"]) : null;

  const save = useDbMutation<number>({
    keys: [["simulator"]],
    successMessage: "Simulation saved",
    run: async (projected, userId) => {
      const { error } = await supabase.from("simulator").insert({
        user_id: userId,
        current_savings: n["current"],
        monthly_saving: n["monthly"],
        expected_return: n["rate"],
        years: n["years"],
        projected_amount: projected,
      });
      if (error) throw error;
    },
  });

  function validate() {
    const found: Record<string, string> = {};
    if (current === "" || !Number.isFinite(n["current"]) || n["current"] < 0)
      found["current"] = "Enter a valid amount (0 or more).";
    if (monthly === "" || !Number.isFinite(n["monthly"]) || n["monthly"] < 0)
      found["monthly"] = "Enter a valid amount (0 or more).";
    if (rate === "" || !Number.isFinite(n["rate"]) || n["rate"] < 0)
      found["rate"] = "Enter a valid return rate (0 or more).";
    else if (n["rate"] > 100) found["rate"] = "That return rate is unrealistic.";
    if (years === "" || !Number.isFinite(n["years"]) || n["years"] <= 0)
      found["years"] = "Years must be more than 0.";
    else if (n["years"] > 60) found["years"] = "Use 60 years or less.";
    setErrors(found);
    return Object.keys(found).length === 0;
  }

  return (
    <>
      <PageHeader title="Future Me 🔮" subtitle="Where your savings could be in a few years." />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,360px)_1fr]">
        <div className="surface p-5">
          <h2 className="font-display text-base font-semibold">Your inputs</h2>
          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="cur">Current savings ₹</Label>
              <Input
                id="cur"
                type="number"
                step="0.01"
                min="0"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
              <FieldError>{errors["current"]}</FieldError>
            </div>
            <div>
              <Label htmlFor="mon">Monthly saving ₹</Label>
              <Input
                id="mon"
                type="number"
                step="0.01"
                min="0"
                value={monthly}
                onChange={(e) => setMonthly(e.target.value)}
              />
              <FieldError>{errors["monthly"]}</FieldError>
            </div>
            <div>
              <Label htmlFor="ret">Expected annual return %</Label>
              <Input
                id="ret"
                type="number"
                step="0.01"
                min="0"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
              <FieldError>{errors["rate"]}</FieldError>
            </div>
            <div>
              <Label htmlFor="yrs">Number of years</Label>
              <Input
                id="yrs"
                type="number"
                step="1"
                min="0"
                value={years}
                onChange={(e) => setYears(e.target.value)}
              />
              <FieldError>{errors["years"]}</FieldError>
            </div>
          </div>
          <Button
            className="mt-5 w-full"
            disabled={save.isPending}
            onClick={() => {
              if (!validate() || !result) return;
              save.mutate(result.projected);
            }}
          >
            {save.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save this simulation
          </Button>
        </div>

        <div className="surface p-5">
          {result ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <StatCard label="Current savings" value={inr(n["current"])} />
                <StatCard label="Monthly contribution" value={inr(n["monthly"])} />
                <StatCard label="Projected amount" value={inr(result.projected)} hint={`${n["years"]} years`} />
                <StatCard
                  label="Total growth"
                  value={inr(Math.max(0, result.projected - result.contributed))}
                  hint={`You contribute ${inr(result.contributed)}`}
                />
              </div>
              <div className="mt-5 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={result.rows}>
                    <defs>
                      <linearGradient id="grow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="year" fontSize={12} unit="y" />
                    <YAxis fontSize={12} />
                    <Tooltip formatter={(v: number) => inr(v)} labelFormatter={(l) => `Year ${l}`} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="var(--color-chart-1)"
                      strokeWidth={2}
                      fill="url(#grow)"
                      name="Projected"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <Disclaimer>This is an estimate, not a guaranteed return.</Disclaimer>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Fill in all four fields to see your projection and year-by-year chart.
            </p>
          )}
        </div>
      </div>

      <h2 className="mb-3 mt-8 font-display text-lg font-semibold">Saved simulations</h2>
      {runs.isLoading ? (
        <Loading />
      ) : (runs.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing saved yet.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {(runs.data ?? []).map((r) => (
            <li key={r.id} className="surface p-4 text-sm">
              <p className="font-medium">{inr(r.projected_amount)} projected</p>
              <p className="mt-1 text-muted-foreground">
                {inr(r.current_savings)} now + {inr(r.monthly_saving)}/month · {r.expected_return}% ·{" "}
                {r.years} years
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
