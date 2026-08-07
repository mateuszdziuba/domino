import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useAuth } from "../lib/auth";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (user) return <Navigate to="/app/campaigns" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login(username, password);
      navigate({ to: "/app/campaigns" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm animate-fade-up border-[#b99f6b] shadow-[0_10px_30px_-12px_rgba(60,40,10,0.55)]">
        <CardHeader className="items-center text-center">
          <div className="mb-1 flex items-center gap-2 text-[#a97e1f]">
            <span className="h-px w-10 bg-gradient-to-r from-transparent to-[#a97e1f]/70" />
            <span>✦</span>
            <span className="h-px w-10 bg-gradient-to-l from-transparent to-[#a97e1f]/70" />
          </div>
          <CardTitle className="text-lg">Sign in to DoMino</CardTitle>
          <CardDescription>Your AI Dungeon Master awaits.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {error && <p className="text-sm text-[#8f1d1d]">{error}</p>}
            <Button type="submit" size="lg">
              Enter the tavern
            </Button>
          </form>
          <p className="mt-4 text-sm italic text-[#7c6a45]">
            No account yet?{" "}
            <Link to="/register" className="font-display text-[11px] uppercase tracking-[0.1em] text-[#7a4b1d] underline-offset-4 hover:underline">
              Register
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
