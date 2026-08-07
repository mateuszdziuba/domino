import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useAuth } from "../lib/auth";
import { characterApi, inviteApi } from "../lib/api-client";
import type { CharacterSummary } from "@domino/shared";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Select } from "../components/ui/select";

const ALREADY_MEMBER = "Już jesteś członkiem tej kampanii.";

export default function JoinPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { code } = useSearch({ strict: false }) as { code?: string };
  const [resolved, setResolved] = useState<{ id: string; name: string } | null>(null);
  const [characters, setCharacters] = useState<CharacterSummary[]>([]);
  const [characterId, setCharacterId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!code) return;
    inviteApi
      .resolve(code)
      .then(({ campaign }) => {
        setResolved(campaign);
        return characterApi.list();
      })
      .then(({ characters }) => {
        setCharacters(characters);
        const first = characters[0];
        if (first) setCharacterId(first.id);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Nieprawidłowy kod zaproszenia.");
      });
  }, [code]);

  async function onJoin(e: FormEvent) {
    e.preventDefault();
    if (!code || !characterId || joining) return;
    setJoining(true);
    setError(null);
    try {
      const { campaignId } = await inviteApi.joinByCode(code, characterId);
      navigate({ to: "/app/campaigns/$id", params: { id: campaignId } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się dołączyć do kampanii");
      setJoining(false);
    }
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  const alreadyMember = error === ALREADY_MEMBER;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm animate-fade-up border-[#b99f6b] shadow-[0_10px_30px_-12px_rgba(60,40,10,0.55)]">
        <CardHeader className="items-center text-center">
          <div className="mb-1 flex items-center gap-2 text-[#a97e1f]">
            <span className="h-px w-10 bg-gradient-to-r from-transparent to-[#a97e1f]/70" />
            <span>✦</span>
            <span className="h-px w-10 bg-gradient-to-l from-transparent to-[#a97e1f]/70" />
          </div>
          <CardTitle className="text-lg">Dołącz do kampanii</CardTitle>
          <CardDescription>
            Otrzymałeś zaproszenie do kampanii DoMino. Zaloguj się lub zarejestruj, aby dołączyć.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!user && (
            <div className="flex flex-col gap-3">
              <Button asChild size="lg">
                <Link to="/login" search={code ? { code } : {}}>
                  Zaloguj się
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link to="/register" search={code ? { code } : {}}>
                  Zarejestruj się
                </Link>
              </Button>
            </div>
          )}

          {user && !code && (
            <p className="text-sm italic text-[#7c6a45]">
              Brak kodu zaproszenia — poproś prowadzącego o link.
            </p>
          )}

          {user && code && !resolved && !error && (
            <p className="text-sm italic text-[#7c6a45]">Sprawdzam kod zaproszenia…</p>
          )}

          {user && code && error && !resolved && (
            <p className="text-sm text-[#8f1d1d]">{error}</p>
          )}

          {user && code && resolved && alreadyMember && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-[#8f1d1d]">{error}</p>
              <Button onClick={() => navigate({ to: "/app/campaigns/$id", params: { id: resolved.id } })}>
                Przejdź do kampanii
              </Button>
            </div>
          )}

          {user && code && resolved && !alreadyMember && (
            <form onSubmit={onJoin} className="flex flex-col gap-4">
              <p className="text-sm text-[#3a2c17]">
                Dołączasz do kampanii: <span className="font-semibold">{resolved.name}</span>
              </p>
              <div className="flex flex-col gap-2">
                <Label htmlFor="join-character">Postać</Label>
                {characters.length === 0 ? (
                  <p className="text-sm italic text-[#7c6a45]">
                    Nie masz jeszcze postaci.{" "}
                    <Link
                      to="/app/characters"
                      className="text-[#7a4b1d] underline-offset-4 hover:underline"
                    >
                      Stwórz ją
                    </Link>{" "}
                    i wróć tutaj.
                  </p>
                ) : (
                  <Select id="join-character" value={characterId} onChange={(e) => setCharacterId(e.target.value)}>
                    {characters.map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        {ch.name} — {ch.race} {ch.className} (lv. {ch.level})
                      </option>
                    ))}
                  </Select>
                )}
              </div>
              {error && <p className="text-sm text-[#8f1d1d]">{error}</p>}
              {characters.length > 0 && (
                <Button type="submit" size="lg" disabled={joining}>
                  Dołącz
                </Button>
              )}
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
