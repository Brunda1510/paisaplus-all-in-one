import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { EmptyState, ErrorState, Loading, StatCard } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { MarkdownLite } from "@/components/MarkdownLite";
import { useExpenses } from "@/hooks/useData";
import { aiInsights } from "@/lib/ai.functions";
import { CATEGORIES, friendlyError, inr, isThisMonth } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/insights")({
  head: () => ({
    meta: [
      { title: "AI Spending Detector — PaisaPluse" },
      { name: "description", content: "AI analysis of your real recorded expenses and spending habits." },
      { property: "og:title", content: "AI Spending Detector — PaisaPluse" },
      { property: "og:description", content: "AI analysis of your real recorded expenses." },
    ],
  }),
  component: InsightsPage,
});

function InsightsPage() {
  const expenses = useExpenses();
  const analyze = useServerFn(aiInsights);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const rows = expenses.data ?? [];
  const total = rows.reduce((s, e) => s + e.amount, 0);
  const monthTotal = rows.filter((e) => isThisMonth(e.expense_date)).reduce((s, e) => s + e.amount, 0);
  const byCategory = CATEGORIES.map((category) => {
    const list = rows.filter((e) => e.category === category);
    return {
      category,
      amount: Math.round(list.reduce((s, e) => s + e.amount, 0) * 100) / 100,
      count: list.length,
    };
  }).filter((c) => c.count > 0);
  const top = [...byCategory].sort((a, b) => b.amount - a.amount)[0];

  async function run() {
    if (busy) return;
    setBusy(true);
    setNotice("");
    try {
      const result = await analyze({
        data: {
          summary: {
            total: Math.round(total * 100) / 100,
            count: rows.length,
            monthTotal: Math.round(monthTotal * 100) / 100,
            byCategory,
            recent: rows.slice(0, 25).map((e) => ({
              category: e.category,
              amount: e.amount,
              date: e.expense_date,
              description: e.description,
            })),
          },
        },
      });
      setAnswer(result.text);
      if (result.fallback && "notice" in result && result.notice) setNotice(String(result.notice));
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="AI Spending Detector 🤖" subtitle="Built only from your recorded expenses." />

      {expenses.isLoading ? (
        <Loading />
      ) : expenses.error ? (
        <ErrorState message={friendlyError(expenses.error)} onRetry={() => expenses.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No expenses to analyse yet"
          description="You need more expense records before I can identify reliable spending patterns."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Recorded expenses" value={String(rows.length)} />
            <StatCard label="Total spent" value={inr(total)} hint={`${inr(monthTotal)} this month`} />
            <StatCard
              label="Highest category"
              value={top ? top.category : "—"}
              hint={
                top && total > 0
                  ? `${Math.round((top.amount / total) * 100)}% of recorded expenses`
                  : undefined
              }
            />
          </div>

          <div className="surface mt-6 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-base font-semibold">AI analysis</h2>
              <Button onClick={run} disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {answer ? "Re-analyse" : "Analyse my spending"}
              </Button>
            </div>
            {notice ? (
              <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                {notice} Showing a calculated summary from your own data instead.
              </p>
            ) : null}
            <div className="mt-4">
              {answer ? (
                <MarkdownLite text={answer} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Run the analysis to see your highest category, unusual spending and suggestions.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
