import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Bar, EmptyState, ErrorState, FieldError, Loading } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { awardBadge, useDbMutation, useGoals, type Goal } from "@/hooks/useData";
import { friendlyError, goalMetrics, inr, todayISO } from "@/lib/finance";
import moneyTreeAsset from "@/assets/paisapluse-money-tree.png.asset.json";

export const Route = createFileRoute("/_authenticated/goals")({
  head: () => ({
    meta: [
      { title: "Money Goals — PaisaPluse" },
      { name: "description", content: "Create savings goals and watch your money tree grow." },
      { property: "og:title", content: "Money Goals — PaisaPluse" },
      { property: "og:description", content: "Create savings goals and watch your money tree grow." },
    ],
  }),
  component: GoalsPage,
});

type FormState = { goal_name: string; target_amount: string; saved_amount: string; target_date: string };

const EMPTY: FormState = { goal_name: "", target_amount: "", saved_amount: "", target_date: "" };

function validateGoal(form: FormState, isEdit: boolean) {
  const errors: Record<string, string> = {};
  if (!form.goal_name.trim()) errors["goal_name"] = "Goal name is required.";
  const target = Number(form.target_amount);
  const saved = form.saved_amount === "" ? 0 : Number(form.saved_amount);
  if (form.target_amount === "" || !Number.isFinite(target)) errors["target_amount"] = "Enter a valid amount.";
  else if (target <= 0) errors["target_amount"] = "Target must be more than ₹0.";
  else if (target > 1_000_000_000) errors["target_amount"] = "That amount is too large.";
  if (!Number.isFinite(saved)) errors["saved_amount"] = "Enter a valid amount.";
  else if (saved < 0) errors["saved_amount"] = "Saved amount cannot be negative.";
  else if (Number.isFinite(target) && target > 0 && saved > target)
    errors["saved_amount"] = "Saved amount cannot exceed the target.";
  if (!form.target_date) errors["target_date"] = "Target date is required.";
  else if (!isEdit && form.target_date < todayISO())
    errors["target_date"] = "Target date cannot be in the past.";
  return { errors, target, saved };
}

function GoalsPage() {
  const goals = useGoals();
  const [dialog, setDialog] = useState<null | { kind: "create" } | { kind: "edit"; goal: Goal } | { kind: "save"; goal: Goal }>(
    null,
  );

  const rows = goals.data ?? [];

  return (
    <>
      <PageHeader title="Money Goals 🌱" subtitle="Every goal grows its own money tree.">
        <Button size="sm" onClick={() => setDialog({ kind: "create" })}>
          <Plus className="size-4" /> New goal
        </Button>
      </PageHeader>

      {goals.isLoading ? (
        <Loading />
      ) : goals.error ? (
        <ErrorState message={friendlyError(goals.error)} onRetry={() => goals.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Create Your First Goal 🌱"
          description="Set a target amount and date — we'll show the weekly and monthly saving you need."
          action={<Button onClick={() => setDialog({ kind: "create" })}>Create goal</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onAddSavings={() => setDialog({ kind: "save", goal })}
              onEdit={() => setDialog({ kind: "edit", goal })}
            />
          ))}
        </div>
      )}

      <GoalDialog dialog={dialog} onClose={() => setDialog(null)} />
    </>
  );
}

function GoalCard({
  goal,
  onAddSavings,
  onEdit,
}: {
  goal: Goal;
  onAddSavings: () => void;
  onEdit: () => void;
}) {
  const m = goalMetrics(goal.saved_amount, goal.target_amount, goal.target_date);
  const remove = useDbMutation<string>({
    keys: [["goals"]],
    successMessage: "Goal deleted",
    run: async (id) => {
      const { error } = await supabase.from("goals").delete().eq("id", id);
      if (error) throw error;
    },
  });

  return (
    <div className="surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">{goal.goal_name}</h2>
          <p className="text-xs text-muted-foreground">Target date {goal.target_date}</p>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" aria-label="Edit goal" onClick={onEdit}>
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Delete goal"
            disabled={remove.isPending}
            onClick={() => {
              if (confirm(`Delete "${goal.goal_name}"?`)) remove.mutate(goal.id);
            }}
          >
            {remove.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4 text-destructive" />
            )}
          </Button>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <MoneyTree pct={m.pct} label={m.stage.label} />
        <div className="flex-1">
          <div className="flex items-baseline justify-between">
            <span className="font-display text-xl font-semibold">{Math.round(m.pct)}%</span>
            <span className="text-xs text-muted-foreground">{m.stage.label}</span>
          </div>
          <Bar pct={m.pct} className="mt-2" />
          <p className="mt-2 text-sm text-muted-foreground">
            {inr(goal.saved_amount)} saved of {inr(goal.target_amount)}
          </p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Metric label="Remaining" value={inr(m.remaining)} />
        <Metric
          label="Days remaining"
          value={m.complete ? "Done" : m.dueToday ? "Due Today" : `${m.days} days`}
        />
        <Metric label="Weekly saving needed" value={inr(m.weekly)} />
        <Metric label="Monthly saving needed" value={inr(m.monthly)} />
      </dl>

      {m.complete ? (
        <p className="mt-4 rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground">
          🎉 Goal complete — fully grown tree! {m.days > 0 ? "And you got there early. Congratulations!" : ""}
        </p>
      ) : (
        <Button className="mt-4 w-full" variant="secondary" onClick={onAddSavings}>
          Add savings
        </Button>
      )}
    </div>
  );
}

function MoneyTree({ pct, label }: { pct: number; label: string }) {
  const progress = Math.min(100, Math.max(0, pct));
  const revealTop = 68 - progress * 0.68;

  return (
    <div
      className="relative aspect-square w-32 shrink-0 overflow-hidden sm:w-36"
      role="img"
      aria-label={`${label}, ${Math.round(pct)} percent grown`}
    >
      <img
        src={moneyTreeAsset.url}
        alt=""
        className="absolute inset-0 size-full object-contain opacity-20 grayscale"
        aria-hidden="true"
      />
      <img
        src={moneyTreeAsset.url}
        alt=""
        className="absolute inset-0 size-full object-contain transition-[clip-path] duration-1000 ease-out"
        style={{ clipPath: `inset(${revealTop}% 0 0 0)` }}
        aria-hidden="true"
      />
      {progress > 0 && progress < 100 ? (
        <span
          className="absolute left-1/2 size-2 -translate-x-1/2 animate-pulse rounded-full bg-primary shadow-sm"
          style={{ top: `${Math.max(10, revealTop)}%` }}
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/60 px-3 py-2">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function GoalDialog({
  dialog,
  onClose,
}: {
  dialog: null | { kind: "create" } | { kind: "edit"; goal: Goal } | { kind: "save"; goal: Goal };
  onClose: () => void;
}) {
  const open = dialog !== null;
  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent>
        {dialog?.kind === "save" ? (
          <AddSavingsForm goal={dialog.goal} onDone={onClose} />
        ) : dialog ? (
          <GoalForm goal={dialog.kind === "edit" ? dialog.goal : undefined} onDone={onClose} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function GoalForm({ goal, onDone }: { goal?: Goal | undefined; onDone: () => void }) {
  const isEdit = Boolean(goal);
  const [form, setForm] = useState<FormState>(
    goal
      ? {
          goal_name: goal.goal_name,
          target_amount: String(goal.target_amount),
          saved_amount: String(goal.saved_amount),
          target_date: goal.target_date,
        }
      : EMPTY,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useDbMutation<{ target: number; saved: number }>({
    keys: [["goals"]],
    successMessage: isEdit ? "Goal updated" : "Goal created",
    run: async ({ target, saved }, userId) => {
      const payload = {
        goal_name: form.goal_name.trim(),
        target_amount: target,
        saved_amount: saved,
        target_date: form.target_date,
      };
      if (goal) {
        const { error } = await supabase.from("goals").update(payload).eq("id", goal.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("goals").insert({ ...payload, user_id: userId });
        if (error) throw error;
      }
    },
    after: async ({ target, saved }) => {
      if (!isEdit) await awardBadge("Goal Setter");
      if (saved > 0) await awardBadge("First Saver");
      if (saved >= target) await awardBadge("Financial Master");
      onDone();
    },
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (mutation.isPending) return;
    const { errors: found, target, saved } = validateGoal(form, isEdit);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    mutation.mutate({ target, saved });
  }

  return (
    <form onSubmit={submit} noValidate>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit goal" : "Create a goal"}</DialogTitle>
        <DialogDescription>Amounts are in rupees and can include decimals.</DialogDescription>
      </DialogHeader>
      <div className="mt-4 space-y-4">
        <div>
          <Label htmlFor="goal_name">Goal name</Label>
          <Input
            id="goal_name"
            value={form.goal_name}
            onChange={(e) => setForm({ ...form, goal_name: e.target.value })}
            placeholder="New laptop"
          />
          <FieldError>{errors["goal_name"]}</FieldError>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="target_amount">Target amount ₹</Label>
            <Input
              id="target_amount"
              type="number"
              step="0.01"
              min="0"
              value={form.target_amount}
              onChange={(e) => setForm({ ...form, target_amount: e.target.value })}
            />
            <FieldError>{errors["target_amount"]}</FieldError>
          </div>
          <div>
            <Label htmlFor="saved_amount">Already saved ₹</Label>
            <Input
              id="saved_amount"
              type="number"
              step="0.01"
              min="0"
              value={form.saved_amount}
              onChange={(e) => setForm({ ...form, saved_amount: e.target.value })}
              placeholder="0"
            />
            <FieldError>{errors["saved_amount"]}</FieldError>
          </div>
        </div>
        <div>
          <Label htmlFor="target_date">Target date</Label>
          <Input
            id="target_date"
            type="date"
            value={form.target_date}
            onChange={(e) => setForm({ ...form, target_date: e.target.value })}
          />
          <FieldError>{errors["target_date"]}</FieldError>
        </div>
      </div>
      <Button type="submit" className="mt-5 w-full" disabled={mutation.isPending}>
        {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        {isEdit ? "Save changes" : "Create goal"}
      </Button>
    </form>
  );
}

function AddSavingsForm({ goal, onDone }: { goal: Goal; onDone: () => void }) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const remaining = Math.max(0, goal.target_amount - goal.saved_amount);

  const mutation = useDbMutation<number>({
    keys: [["goals"]],
    successMessage: "Savings added",
    run: async (value) => {
      const next = Math.min(goal.target_amount, goal.saved_amount + value);
      const { error: dbError } = await supabase
        .from("goals")
        .update({ saved_amount: next })
        .eq("id", goal.id);
      if (dbError) throw dbError;
    },
    after: async (value) => {
      await awardBadge("First Saver");
      if (goal.saved_amount + value >= goal.target_amount) {
        await awardBadge("Financial Master");
        toast.success("🎉 Goal reached — your tree is fully grown!");
      }
      onDone();
    },
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (mutation.isPending) return;
    const value = Number(amount);
    if (amount === "" || !Number.isFinite(value)) return setError("Enter a valid amount.");
    if (value <= 0) return setError("Amount must be more than ₹0.");
    if (value > 1_000_000_000) return setError("That amount is too large.");
    setError("");
    mutation.mutate(value);
  }

  return (
    <form onSubmit={submit} noValidate>
      <DialogHeader>
        <DialogTitle>Add savings to {goal.goal_name}</DialogTitle>
        <DialogDescription>
          {inr(remaining)} left to reach {inr(goal.target_amount)}. Progress never goes above 100%.
        </DialogDescription>
      </DialogHeader>
      <div className="mt-4">
        <Label htmlFor="add_amount">Amount ₹</Label>
        <Input
          id="add_amount"
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <FieldError>{error}</FieldError>
      </div>
      <Button type="submit" className="mt-5 w-full" disabled={mutation.isPending}>
        {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        Add savings
      </Button>
    </form>
  );
}
