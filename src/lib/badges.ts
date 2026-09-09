export const BADGE_CATALOG = [
  { name: "First Saver", emoji: "🌱", how: "Add savings to a goal for the first time" },
  { name: "Savings Starter", emoji: "💰", how: "Record your first smart deposit" },
  { name: "Goal Setter", emoji: "🎯", how: "Create your first money goal" },
  { name: "Expense Tracker", emoji: "📊", how: "Log your first expense" },
  { name: "Consistent Saver", emoji: "🔥", how: "Log 10 or more expenses" },
  { name: "Financial Master", emoji: "🏆", how: "Complete a goal at 100%" },
] as const;

export function levelFor(badgeCount: number, activityCount: number) {
  const points = badgeCount * 3 + activityCount;
  const level = Math.max(1, Math.floor(points / 6) + 1);
  const nextAt = level * 6;
  return { level, points, nextAt, progress: Math.min(100, (points / nextAt) * 100) };
}
