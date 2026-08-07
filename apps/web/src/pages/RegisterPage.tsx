import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useAuth } from "../lib/auth";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

export default function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (user) return <Navigate to="/app/campaigns" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await register(username, password);
      const code = new URLSearchParams(window.location.search).get("code");
      navigate({ to: code ? "/join" : "/app/campaigns", search: code ? { code } : {} });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zarejestrować");
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
          <CardTitle className="text-lg">Utwórz konto</CardTitle>
          <CardDescription>Wybierz nazwę użytkownika i hasło, awanturniku.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="username">Nazwa użytkownika</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                minLength={2}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Hasło</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>
            {error && <p className="text-sm text-[#8f1d1d]">{error}</p>}
            <Button type="submit" size="lg">
              Złóż przysięgę
            </Button>
          </form>
          <p className="mt-4 text-sm text-[#7c6a45]">
            Masz już konto?{" "}
            <Link to="/login" className="font-display text-[11px] uppercase tracking-[0.1em] text-[#7a4b1d] underline-offset-4 hover:underline">
              Zaloguj się
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
