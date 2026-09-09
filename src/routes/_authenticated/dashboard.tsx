import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/AppShell";
import { Bar as ProgressBar, EmptyState, ErrorState, Loading, StatCard } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { useBadges, useDeposits, useExpenses, useGoals } from "@/hooks/useData";
import {
  CATEGORY_COLORS,
  friendlyError,
  goalMetrics,
  inr,
  isThisMonth,
  monthKey,
} from "@/lib/finance";
import { BADGE_CATALOG, levelFor } from "@/lib/badges";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — PaisaPluse" },
      { name: "description", content: "Your savings, expenses, goals and financial health at a glance." },
      { property: "og:title", content: "Dashboard — PaisaPluse" },
      { property: "og:description", content: "Your savings, expenses and goals at a glance." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const goals = useGoals();
  const expenses = useExpenses();
  const deposits = useDeposits();
  const badges = useBadges();

  if (goals.isLoading || expenses.isLoading || deposits.isLoading) return <Loading />;

  const error = goals.error ?? expenses.error ?? deposits.error;
  if (error)
    return (
      <ErrorState
        message={friendlyError(error)}
        onRetry={() => {
          goals.refetch();
          expenses.refetch();
          deposits.refetch();
        }}
      />
    );

  const goalRows = goals.data ?? [];
  const expenseRows = expenses.data ?? [];
  const depositRows = deposits.data ?? [];
  const badgeRows = badges.data ?? [];

  const hasData = goalRows.length + expenseRows.length + depositRows.length > 0;

  const totalSaved = goalRows.reduce((s, g) => s + g.saved_amount, 0);
  const totalDeposits = depositRows.reduce((s, d) => s + d.amount, 0);
  const totalSavings = totalSaved + totalDeposits;
  const totalExpenses = expenseRows.reduce((s, e) => s + e.amount, 0);
  const monthExpenses = expenseRows
    .filter((e) => isThisMonth(e.expense_date))
    .reduce((s, e) => s + e.amount, 0);
  const activeGoals = goalRows.filter((g) => g.saved_amount < g.target_amount).length;
  const monthSavings = goalRows
    .filter((g) => monthKey(g.created_at.slice(0, 10)) === monthKey(new Date().toISOString().slice(0, 10)))
    .reduce((s, g) => s + g.saved_amount, 0);

  const health =
    totalSavings + totalExpenses === 0
      ? 0
      : Math.round((totalSavings / (totalSavings + totalExpenses)) * 100);
  const healthLabel = health >= 60 ? "Strong" : health >= 35 ? "Steady" : "Needs attention";

  const byCategory = Object.entries(
    expenseRows.reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + e.amount;
      return acc;
    }, {}),
  ).map(([category, amount]) => ({ category, amount }));

  const monthlySeries = Object.entries(
    expenseRows.reduce<Record<string, number>>((acc, e) => {
      const k = monthKey(e.expense_date);
      acc[k] = (acc[k] ?? 0) + e.amount;
      return acc;
    }, {}),
  )
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, amount]) => ({ month, amount }));

  const level = levelFor(badgeRows.length, goalRows.length + expenseRows.length + depositRows.length);

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Track. Save. Grow.">
        <Button asChild size="sm">
          <Link to="/goals">New goal</Link>
        </Button>
      </PageHeader>

      {!hasData ? (
        <EmptyState
          title="No data yet. Start by creating your first financial goal."
          description="Once you add goals and expenses, this dashboard fills up with your real numbers."
          action={
            <Button asChild>
              <Link to="/goals">Create your first goal 🌱</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total savings" value={inr(totalSavings)} hint="Goals + deposits" icon="💰" />
            <StatCard label="Total expenses" value={inr(totalExpenses)} hint={`${expenseRows.length} records`} icon="📊" />
            <StatCard label="Active goals" value={String(activeGoals)} hint={`${goalRows.length} total`} icon="🎯" />
            <StatCard label="Monthly spending" value={inr(monthExpenses)} hint="This month" icon="📅" />
            <StatCard label="Monthly savings" value={inr(monthSavings)} hint="Goals created this month" icon="🌱" />
            <StatCard label="Financial health" value={`${health}%`} hint={healthLabel} icon="❤️" />
            <StatCard label="Level" value={String(level.level)} hint={`${level.points} activity points`} icon="⭐" />
            <StatCard label="Badges" value={`${badgeRows.length}/${BADGE_CATALOG.length}`} hint="Earned" icon="🏆" />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="surface p-5">
              <h2 className="font-display text-base font-semibold">Spending by category</h2>
              {byCategory.length === 0 ? (
                <p className="mt-6 text-sm text-muted-foreground">No expenses recorded yet.</p>
              ) : (
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={byCategory} dataKey="amount" nameKey="category" outerRadius={90} label>
                        {byCategory.map((entry) => (
                          <Cell
                            key={entry.category}
                            fill={CATEGORY_COLORS[entry.category] ?? "var(--color-chart-7)"}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => inr(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="surface p-5">
              <h2 className="font-display text-base font-semibold">Monthly spending trend</h2>
              {monthlySeries.length === 0 ? (
                <p className="mt-6 text-sm text-muted-foreground">No expenses recorded yet.</p>
              ) : (
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlySeries}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                      <XAxis dataKey="month" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip formatter={(v: number) => inr(v)} />
                      <Bar dataKey="amount" radius={[6, 6, 0, 0]} fill="var(--color-chart-1)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="surface p-5">
              <h2 className="font-display text-base font-semibold">Goal progress</h2>
              {goalRows.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  No goals yet.{" "}
                  <Link to="/goals" className="text-primary underline">
                    Create your first goal 🌱
                  </Link>
                </p>
              ) : (
                <ul className="mt-4 space-y-4">
                  {goalRows.slice(0, 4).map((g) => {
                    const m = goalMetrics(g.saved_amount, g.target_amount, g.target_date);
                    return (
                      <li key={g.id}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">
                            {m.stage.emoji} {g.goal_name}
                          </span>
                          <span className="text-muted-foreground">
                            {inr(g.saved_amount)} / {inr(g.target_amount)}
                          </span>
                        </div>
                        <ProgressBar pct={m.pct} className="mt-2" />
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="surface p-5">
              <h2 className="font-display text-base font-semibold">Recent transactions</h2>
              {expenseRows.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  No expenses yet.{" "}
                  <Link to="/expenses" className="text-primary underline">
                    Add one
                  </Link>
                </p>
              ) : (
                <ul className="mt-4 divide-y">
                  {expenseRows.slice(0, 6).map((e) => (
                    <li key={e.id} className="flex items-center justify-between py-2.5 text-sm">
                      <span>
                        <span className="font-medium">{e.category}</span>
                        {e.description ? (
                          <span className="text-muted-foreground"> · {e.description}</span>
                        ) : null}
                        <span className="block text-xs text-muted-foreground">{e.expense_date}</span>
                      </span>
                      <span className="font-medium">{inr(e.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="surface mt-6 p-5">
            <h2 className="font-display text-base font-semibold">Badges</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {BADGE_CATALOG.map((b) => {
                const earned = badgeRows.some((row) => row.badge_name === b.name);
                return (
                  <span
                    key={b.name}
                    className={
                      earned
                        ? "rounded-full bg-accent px-3 py-1.5 text-sm text-accent-foreground"
                        : "rounded-full border border-dashed px-3 py-1.5 text-sm text-muted-foreground"
                    }
                  >
                    {b.emoji} {b.name}
                  </span>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
