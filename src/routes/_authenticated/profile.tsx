import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, LogOut } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { ErrorState, FieldError, Loading, StatCard } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  useBadges,
  useDbMutation,
  useDeposits,
  useExpenses,
  useGoals,
  useProfile,
} from "@/hooks/useData";
import { friendlyError, inr } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — PaisaPluse" },
      { name: "description", content: "Your PaisaPluse account details and activity summary." },
      { property: "og:title", content: "Profile — PaisaPluse" },
      { property: "og:description", content: "Your PaisaPluse account details and activity summary." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const profile = useProfile();
  const goals = useGoals();
  const expenses = useExpenses();
  const deposits = useDeposits();
  const badges = useBadges();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (profile.data?.name != null) setName(profile.data.name);
  }, [profile.data?.name]);

  const update = useDbMutation<string>({
    keys: [["profile"]],
    successMessage: "Profile updated",
    run: async (value, userId) => {
      const { error: dbError } = await supabase
        .from("profiles")
        .update({ name: value })
        .eq("id", userId);
      if (dbError) throw dbError;
    },
  });

  async function logout() {
    setSigningOut(true);
    const { error: signOutError } = await supabase.auth.signOut();
    setSigningOut(false);
    if (signOutError) {
      toast.error(friendlyError(signOutError));
      return;
    }
    toast.success("Logged out");
    navigate({ to: "/auth" });
  }

  if (profile.isLoading) return <Loading />;
  if (profile.error)
    return <ErrorState message={friendlyError(profile.error)} onRetry={() => profile.refetch()} />;

  const totalSaved = (goals.data ?? []).reduce((s, g) => s + g.saved_amount, 0);

  return (
    <>
      <PageHeader title="Profile 👤" subtitle="Your account and activity." />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface p-5">
          <h2 className="font-display text-base font-semibold">Account</h2>
          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="pname">Name</Label>
              <Input id="pname" value={name} onChange={(e) => setName(e.target.value)} />
              <FieldError>{error}</FieldError>
            </div>
            <div>
              <Label htmlFor="pemail">Email</Label>
              <Input id="pemail" value={profile.data?.email ?? ""} disabled />
            </div>
            <p className="text-xs text-muted-foreground">
              Member since {profile.data?.created_at?.slice(0, 10) ?? "—"}
            </p>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              disabled={update.isPending}
              onClick={() => {
                if (!name.trim()) {
                  setError("Name cannot be empty.");
                  return;
                }
                setError("");
                update.mutate(name.trim());
              }}
            >
              {update.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save changes
            </Button>
            <Button variant="outline" onClick={logout} disabled={signingOut}>
              {signingOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
              Logout
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <StatCard label="Goals" value={String((goals.data ?? []).length)} icon="🎯" />
          <StatCard label="Expenses logged" value={String((expenses.data ?? []).length)} icon="📊" />
          <StatCard label="Deposits" value={String((deposits.data ?? []).length)} icon="💰" />
          <StatCard label="Badges" value={String((badges.data ?? []).length)} icon="🏆" />
          <StatCard label="Saved towards goals" value={inr(totalSaved)} icon="🌱" />
        </div>
      </div>
    </>
  );
}
