import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";
import { Bar, ErrorState, Loading, StatCard } from "@/components/ui-bits";
import { useBadges, useDeposits, useExpenses, useGoals } from "@/hooks/useData";
import { BADGE_CATALOG, levelFor } from "@/lib/badges";
import { friendlyError } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/badges")({
  head: () => ({
    meta: [
      { title: "Badges & Levels — PaisaPluse" },
      { name: "description", content: "Badges and levels earned from your real money activity." },
      { property: "og:title", content: "Badges & Levels — PaisaPluse" },
      { property: "og:description", content: "Badges and levels earned from your real money activity." },
    ],
  }),
  component: BadgesPage,
});

function BadgesPage() {
  const badges = useBadges();
  const goals = useGoals();
  const expenses = useExpenses();
  const deposits = useDeposits();

  if (badges.isLoading || goals.isLoading || expenses.isLoading || deposits.isLoading)
    return <Loading />;
  if (badges.error)
    return <ErrorState message={friendlyError(badges.error)} onRetry={() => badges.refetch()} />;

  const earned = badges.data ?? [];
  const activity =
    (goals.data ?? []).length + (expenses.data ?? []).length + (deposits.data ?? []).length;
  const level = levelFor(earned.length, activity);

  return (
    <>
      <PageHeader title="Badges & Levels 🏆" subtitle="Earned from your real activity only." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Level" value={String(level.level)} icon="⭐" />
        <StatCard label="Badges earned" value={`${earned.length}/${BADGE_CATALOG.length}`} icon="🏆" />
        <StatCard label="Activity points" value={String(level.points)} hint={`Next level at ${level.nextAt}`} />
      </div>

      <div className="surface mt-6 p-5">
        <p className="text-sm font-medium">Progress to level {level.level + 1}</p>
        <Bar pct={level.progress} className="mt-3" />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {BADGE_CATALOG.map((badge) => {
          const row = earned.find((b) => b.badge_name === badge.name);
          return (
            <div
              key={badge.name}
              className={
                row ? "surface p-5" : "surface p-5 opacity-60 grayscale"
              }
            >
              <span className="text-3xl" aria-hidden>
                {badge.emoji}
              </span>
              <h2 className="mt-3 font-display text-base font-semibold">{badge.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{badge.how}</p>
              <p className="mt-3 text-xs font-medium">
                {row ? `Earned on ${row.earned_at.slice(0, 10)}` : "Not earned yet"}
              </p>
            </div>
          );
        })}
      </div>
    </>
  );
}
