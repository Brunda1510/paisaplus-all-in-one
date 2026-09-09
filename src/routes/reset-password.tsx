import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui-bits";
import { friendlyError } from "@/lib/finance";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set a new password — PaisaPluse" },
      { name: "description", content: "Choose a new password for your PaisaPluse account." },
      { property: "og:title", content: "Set a new password — PaisaPluse" },
      { property: "og:description", content: "Choose a new password for your PaisaPluse account." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (password.length < 6) {
      setError("Use at least 6 characters.");
      return;
    }
    setError("");
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      toast.error(friendlyError(updateError));
      return;
    }
    toast.success("Password updated.");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="surface w-full max-w-sm p-6" noValidate>
        <h1 className="font-display text-xl font-semibold">Set a new password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Open this page from the reset link in your email.
        </p>
        <div className="mt-5">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <FieldError>{error}</FieldError>
        </div>
        <Button type="submit" className="mt-4 w-full" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          Update password
        </Button>
      </form>
    </div>
  );
}
