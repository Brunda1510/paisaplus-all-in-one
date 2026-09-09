import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import {
  Disclaimer,
  EmptyState,
  ErrorState,
  FieldError,
  Loading,
  StatCard,
} from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { awardBadge, useDbMutation, useDeposits } from "@/hooks/useData";
import { friendlyError, inr, maturity, todayISO } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/deposits")({
  head: () => ({
    meta: [
      { title: "Smart Deposits — PaisaPluse" },
      { name: "description", content: "Estimate deposit maturity with compound interest and save it." },
      { property: "og:title", content: "Smart Deposits — PaisaPluse" },
      { property: "og:description", content: "Estimate deposit maturity with compound interest." },
    ],
  }),
  component: DepositsPage,
});

function DepositsPage() {
  const deposits = useDeposits();
  const [amount, setAmount] = useState("");
  const [months, setMonths] = useState("");
  const [rate, setRate] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const parsed = {
    amount: Number(amount),
    months: Number(months),
    rate: Number(rate),
  };
  const valid =
    amount !== "" &&
    months !== "" &&
    rate !== "" &&
    Number.isFinite(parsed.amount) &&
    Number.isFinite(parsed.months) &&
    Number.isFinite(parsed.rate) &&
    parsed.amount > 0 &&
    parsed.months > 0 &&
    parsed.rate >= 0;

  const estimate = valid ? maturity(parsed.amount, parsed.months, parsed.rate) : null;

  const mutation = useDbMutation<{ maturityAmount: number }>({
    keys: [["deposits"]],
    successMessage: "Deposit saved",
    run: async ({ maturityAmount }, userId) => {
      const { error } = await supabase.from("deposits").insert({
        user_id: userId,
        amount: parsed.amount,
        duration: parsed.months,
        interest_rate: parsed.rate,
        maturity_amount: maturityAmount,
        deposit_date: todayISO(),
      });
      if (error) throw error;
    },
    after: async () => {
      await awardBadge("Savings Starter");
      setAmount("");
      setMonths("");
      setRate("");
    },
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (mutation.isPending) return;
    const found: Record<string, string> = {};
    if (amount === "" || !Number.isFinite(parsed.amount)) found["amount"] = "Enter a valid amount.";
    else if (parsed.amount <= 0) found["amount"] = "Amount must be more than ₹0.";
    else if (parsed.amount > 1_000_000_000) found["amount"] = "That amount is too large.";
    if (months === "" || !Number.isFinite(parsed.months)) found["months"] = "Enter a valid duration.";
    else if (parsed.months <= 0) found["months"] = "Duration must be more than 0 months.";
    else if (parsed.months > 1200) found["months"] = "Duration is too long.";
    if (rate === "" || !Number.isFinite(parsed.rate)) found["rate"] = "Enter a valid rate.";
    else if (parsed.rate < 0) found["rate"] = "Interest rate cannot be negative.";
    else if (parsed.rate > 100) found["rate"] = "Rate looks too high.";
    setErrors(found);
    if (Object.keys(found).length > 0 || !estimate) return;
    mutation.mutate({ maturityAmount: estimate.maturityAmount });
  }

  const rows = deposits.data ?? [];

  return (
    <>
      <PageHeader title="Smart Deposits 💰" subtitle="See what your deposit could grow into." />

      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={submit} className="surface p-5" noValidate>
          <h2 className="font-display text-base font-semibold">Deposit details</h2>
          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="d_amount">Deposit amount ₹</Label>
              <Input
                id="d_amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <FieldError>{errors["amount"]}</FieldError>
            </div>
            <div>
              <Label htmlFor="d_months">Duration (months)</Label>
              <Input
                id="d_months"
                type="number"
                step="1"
                min="0"
                value={months}
                onChange={(e) => setMonths(e.target.value)}
              />
              <FieldError>{errors["months"]}</FieldError>
            </div>
            <div>
              <Label htmlFor="d_rate">Annual interest rate %</Label>
              <Input
                id="d_rate"
                type="number"
                step="0.01"
                min="0"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
              <FieldError>{errors["rate"]}</FieldError>
            </div>
          </div>
          <Button type="submit" className="mt-5 w-full" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save deposit
          </Button>
        </form>

        <div className="surface p-5">
          <h2 className="font-display text-base font-semibold">Estimate</h2>
          {estimate ? (
            <div className="mt-4 grid gap-3">
              <StatCard label="Initial deposit" value={inr(parsed.amount)} />
              <StatCard label="Estimated growth" value={inr(estimate.growth)} />
              <StatCard
                label="Maturity amount"
                value={inr(estimate.maturityAmount)}
                hint={`${parsed.months} months at ${parsed.rate}% compounded annually`}
              />
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Fill in the amount, duration and rate to see your estimate.
            </p>
          )}
          <Disclaimer>Estimated value — actual returns may vary.</Disclaimer>
        </div>
      </div>

      <h2 className="mb-3 mt-8 font-display text-lg font-semibold">Your deposits</h2>
      {deposits.isLoading ? (
        <Loading />
      ) : deposits.error ? (
        <ErrorState message={friendlyError(deposits.error)} onRetry={() => deposits.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState title="No deposits saved yet" description="Save an estimate to keep track of it." />
      ) : (
        <div className="surface overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Months</th>
                <th className="px-4 py-3">Rate</th>
                <th className="px-4 py-3">Maturity</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-3">{d.deposit_date}</td>
                  <td className="px-4 py-3">{inr(d.amount)}</td>
                  <td className="px-4 py-3">{d.duration}</td>
                  <td className="px-4 py-3">{d.interest_rate}%</td>
                  <td className="px-4 py-3 font-medium">{inr(d.maturity_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
