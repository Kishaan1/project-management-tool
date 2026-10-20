"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KanbanSquare, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { toast } from "sonner";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isRegister = mode === "register";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isRegister ? { name, email, password } : { email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Authentication failed");
        toast.error(data.error ?? "Authentication failed");
        return;
      }
      toast.success(isRegister ? "Account created! Welcome to TeamBoard." : "Welcome back!");
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center p-6 overflow-hidden bg-gradient-to-b from-background via-muted/20 to-background">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md rounded-3xl border border-border/60 bg-card/85 p-8 shadow-2xl backdrop-blur-2xl relative z-10 transition-all">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md mb-4">
            <KanbanSquare className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            {isRegister ? "Create your account" : "Sign in to TeamBoard"}
          </h1>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {isRegister
              ? "Start managing projects with real-time Kanban boards"
              : "Welcome back! Enter your credentials to access your workspace"}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <Label htmlFor="name" className="text-xs mb-1.5 block">Full Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sarah Connor"
                required
                minLength={2}
                autoComplete="name"
                className="h-10 text-xs rounded-xl"
              />
            </div>
          )}

          <div>
            <Label htmlFor="email" className="text-xs mb-1.5 block">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              autoComplete="email"
              className="h-10 text-xs rounded-xl"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label htmlFor="password" className="text-xs block">Password</Label>
              {isRegister && <span className="text-[10px] text-muted-foreground">8+ characters</span>}
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={isRegister ? 8 : 1}
              autoComplete={isRegister ? "new-password" : "current-password"}
              className="h-10 text-xs rounded-xl"
            />
          </div>

          {error && (
            <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400 font-medium">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full h-10 rounded-xl text-xs font-semibold shadow-sm" disabled={loading}>
            {loading ? (
              "Please wait..."
            ) : (
              <span className="flex items-center justify-center gap-1.5">
                {isRegister ? "Create Account" : "Sign In"}
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            )}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-border/40 text-center">
          <p className="text-xs text-muted-foreground">
            {isRegister ? "Already have an account?" : "Don't have an account yet?"}{" "}
            <Link
              href={isRegister ? "/login" : "/register"}
              className="font-semibold text-primary hover:underline"
            >
              {isRegister ? "Sign in" : "Sign up"}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
