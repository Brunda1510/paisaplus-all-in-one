import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { EmptyState, ErrorState, FieldError, Loading, StatCard } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { awardBadge, useDbMutation, useExpenses, type Expense } from "@/hooks/useData";
import {
  CATEGORIES,
  CATEGORY_COLORS,
  friendlyError,
  inr,
  isLastNDays,
  isThisMonth,
  monthKey,
  todayISO,
} from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/expenses")({
  head: () => ({
    meta: [
      { title: "Expense Tracker — PaisaPluse" },
      { name: "description", content: "Log expenses by category and see live spending charts." },
      { property: "og:title", content: "Expense Tracker — PaisaPluse" },
      { property: "og:description", content: "Log expenses by category and see live spending charts." },
    ],
  }),
  component: ExpensesPage,
});

function ExpensesPage() {
  const expenses = useExpenses();
  const [dialog, setDialog] = useState<null | { expense?: Expense | undefined }>(null);
  const rows = expenses.data ?? [];

  const total = rows.reduce((s, e) => s + e.amount, 0);
  const week = rows.filter((e) => isLastNDays(e.expense_date, 7)).reduce((s, e) => s + e.amount, 0);
  const month = rows.filter((e) => isThisMonth(e.expense_date)).reduce((s, e) => s + e.amount, 0);

  const byCategory = CATEGORIES.map((category) => ({
    category,
    amount: rows.filter((e) => e.category === category).reduce((s, e) => s + e.amount, 0),
  })).filter((c) => c.amount > 0);

  const monthly = Object.entries(
    rows.reduce<Record<string, number>>((acc, e) => {
      const k = monthKey(e.expense_date);
      acc[k] = (acc[k] ?? 0) + e.amount;
      return acc;
    }, {}),
  )
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([m, amount]) => ({ month: m, amount }));

  const remove = useDbMutation<string>({
    keys: [["expenses"]],
    successMessage: "Expense deleted",
    run: async (id) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
  });

  return (
    <>
      <PageHeader title="Expense Tracker 📊" subtitle="Every rupee, categorised.">
        <Button size="sm" onClick={() => setDialog({})}>
          <Plus className="size-4" /> Add expense
        </Button>
      </PageHeader>

      {expenses.isLoading ? (
        <Loading />
      ) : expenses.error ? (
        <ErrorState message={friendlyError(expenses.error)} onRetry={() => expenses.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No expenses yet"
          description="Add your first expense to unlock your spending charts and AI insights."
          action={<Button onClick={() => setDialog({})}>Add expense</Button>}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total expenses" value={inr(total)} hint={`${rows.length} records`} />
            <StatCard label="This week" value={inr(week)} hint="Last 7 days" />
            <StatCard label="This month" value={inr(month)} />
            <StatCard
              label="Top category"
              value={
                byCategory.length
                  ? [...byCategory].sort((a, b) => b.amount - a.amount)[0]!.category
                  : "—"
              }
            />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="surface p-5">
              <h2 className="font-display text-base font-semibold">Category split</h2>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={byCategory} dataKey="amount" nameKey="category" outerRadius={90} label>
                      {byCategory.map((c) => (
                        <Cell key={c.category} fill={CATEGORY_COLORS[c.category]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => inr(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="surface p-5">
              <h2 className="font-display text-base font-semibold">Monthly spending</h2>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthly}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip formatter={(v: number) => inr(v)} />
                    <Bar dataKey="amount" radius={[6, 6, 0, 0]} fill="var(--color-chart-1)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="surface mt-6 overflow-hidden">
            <h2 className="border-b px-5 py-4 font-display text-base font-semibold">
              Recent transactions
            </h2>
            <ul className="divide-y">
              {rows.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {e.category}
                      {e.description ? (
                        <span className="text-muted-foreground"> · {e.description}</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">{e.expense_date}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="mr-1 text-sm font-semibold">{inr(e.amount)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Edit expense"
                      onClick={() => setDialog({ expense: e })}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete expense"
                      disabled={remove.isPending}
                      onClick={() => {
                        if (confirm("Delete this expense?")) remove.mutate(e.id);
                      }}
                    >
                      {remove.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4 text-destructive" />
                      )}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      <Dialog open={dialog !== null} onOpenChange={(next) => (!next ? setDialog(null) : undefined)}>
        <DialogContent>
          {dialog ? (
            <ExpenseForm
              expense={dialog.expense}
              existingCount={rows.length}
              onDone={() => setDialog(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ExpenseForm({
  expense,
  existingCount,
  onDone,
}: {
  expense?: Expense | undefined;
  existingCount: number;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [category, setCategory] = useState<string>(expense?.category ?? "");
  const [description, setDescription] = useState(expense?.description ?? "");
  const [date, setDate] = useState(expense?.expense_date ?? todayISO());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useDbMutation<number>({
    keys: [["expenses"]],
    successMessage: expense ? "Expense updated" : "Expense added",
    run: async (value, userId) => {
      const payload = {
        amount: value,
        category,
        description: description.trim(),
        expense_date: date,
      };
      if (expense) {
        const { error } = await supabase.from("expenses").update(payload).eq("id", expense.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("expenses").insert({ ...payload, user_id: userId });
        if (error) throw error;
      }
    },
    after: async () => {
      if (!expense) {
        await awardBadge("Expense Tracker");
        if (existingCount + 1 >= 10) await awardBadge("Consistent Saver");
      }
      onDone();
    },
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (mutation.isPending) return;
    const found: Record<string, string> = {};
    const value = Number(amount);
    if (amount === "" || !Number.isFinite(value)) found["amount"] = "Enter a valid amount.";
    else if (value <= 0) found["amount"] = "Amount must be more than ₹0.";
    else if (value > 1_000_000_000) found["amount"] = "That amount is too large.";
    if (!category) found["category"] = "Please pick a category.";
    if (!date) found["date"] = "Date is required.";
    else if (date > todayISO()) found["date"] = "Date cannot be in the future.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    mutation.mutate(value);
  }

  return (
    <form onSubmit={submit} noValidate>
      <DialogHeader>
        <DialogTitle>{expense ? "Edit expense" : "Add expense"}</DialogTitle>
        <DialogDescription>Saved straight to your private records.</DialogDescription>
      </DialogHeader>
      <div className="mt-4 space-y-4">
        <div>
          <Label htmlFor="amount">Amount ₹</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <FieldError>{errors["amount"]}</FieldError>
        </div>
        <div>
          <Label htmlFor="category">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger id="category">
              <SelectValue placeholder="Choose a category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError>{errors["category"]}</FieldError>
        </div>
        <div>
          <Label htmlFor="description">Description (optional)</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Canteen lunch"
          />
        </div>
        <div>
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <FieldError>{errors["date"]}</FieldError>
        </div>
      </div>
      <Button type="submit" className="mt-5 w-full" disabled={mutation.isPending}>
        {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        {expense ? "Save changes" : "Add expense"}
      </Button>
    </form>
  );
}
