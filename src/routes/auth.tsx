import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui-bits";
import { friendlyError } from "@/lib/finance";

type Mode = "login" | "signup" | "forgot";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { mode?: Mode | undefined } => ({
    mode:
      search["mode"] === "login" || search["mode"] === "signup" || search["mode"] === "forgot"
        ? search["mode"]
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — PaisaPluse" },
      { name: "description", content: "Log in or create your free PaisaPluse account." },
      { property: "og:title", content: "Sign in — PaisaPluse" },
      { property: "og:description", content: "Log in or create your free PaisaPluse account." },
    ],
  }),
  component: AuthPage,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<Mode>(search["mode"] ?? "signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [loading, user, navigate]);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (mode === "signup" && !name.trim()) e["name"] = "Please enter your name.";
    if (!email.trim()) e["email"] = "Email is required.";
    else if (!EMAIL_RE.test(email.trim())) e["email"] = "Enter a valid email address.";
    if (mode !== "forgot") {
      if (!password) e["password"] = "Password is required.";
      else if (password.length < 6) e["password"] = "Use at least 6 characters.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !validate()) return;
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { name: name.trim() },
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Account created. Check your email to confirm, then log in.");
          setMode("login");
        } else {
          toast.success("Welcome to PaisaPluse 🌱");
          navigate({ to: "/dashboard" });
        }
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Password reset link sent. Check your inbox.");
        setMode("login");
      }
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    if (googleBusy) return;
    setGoogleBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(friendlyError(result.error));
        return;
      }
      if (result.redirected) return;
      navigate({ to: "/dashboard" });
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setGoogleBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-sidebar p-10 lg:flex">
        <Link to="/" className="flex items-center gap-2">
          <span className="brand-gradient grid size-9 place-items-center rounded-xl text-lg">🌱</span>
          <span className="font-display text-lg font-semibold text-sidebar-foreground">
            PaisaPluse
          </span>
        </Link>
        <div>
          <p className="font-display text-3xl font-semibold text-sidebar-foreground">
            Track. Save. Grow.
          </p>
          <p className="mt-3 max-w-sm text-sm text-sidebar-foreground/70">
            Log every rupee, grow a money tree for each goal, and let AI point out where your money
            leaks.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/50">
          Educational information only. Not professional financial advice.
        </p>
      </div>

      <div className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-2xl font-semibold">
            {mode === "signup" ? "Create your account" : mode === "login" ? "Welcome back" : "Reset password"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "forgot"
              ? "We'll email you a secure reset link."
              : "Your data stays private to your account."}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            {mode === "signup" ? (
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Aarav Sharma"
                  autoComplete="name"
                />
                <FieldError>{errors["name"]}</FieldError>
              </div>
            ) : null}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
              <FieldError>{errors["email"]}</FieldError>
            </div>
            {mode !== "forgot" ? (
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <FieldError>{errors["password"]}</FieldError>
              </div>
            ) : null}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {mode === "signup" ? "Sign up" : mode === "login" ? "Log in" : "Send reset link"}
            </Button>
          </form>

          {mode !== "forgot" ? (
            <>
              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or
                <span className="h-px flex-1 bg-border" />
              </div>
              <Button variant="outline" className="w-full" onClick={google} disabled={googleBusy}>
                {googleBusy ? <Loader2 className="size-4 animate-spin" /> : null}
                Continue with Google
              </Button>
            </>
          ) : null}

          <div className="mt-6 space-y-2 text-sm">
            {mode === "login" ? (
              <>
                <button className="text-primary underline" onClick={() => setMode("forgot")}>
                  Forgot password?
                </button>
                <p className="text-muted-foreground">
                  New here?{" "}
                  <button className="text-primary underline" onClick={() => setMode("signup")}>
                    Create an account
                  </button>
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">
                Already have an account?{" "}
                <button className="text-primary underline" onClick={() => setMode("login")}>
                  Log in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
