import { useEffect, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { Link2, Plus, Swords } from "lucide-react";
import { adventuresApi, campaignApi, inviteApi, type Adventure } from "../lib/api-client";
import type { Campaign } from "@domino/shared";
import { useAuth } from "../lib/auth";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select } from "../components/ui/select";

export default function CampaignsPage() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [adventure, setAdventure] = useState("");
  const [adventures, setAdventures] = useState<Adventure[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteCampaignId, setInviteCampaignId] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function load() {
    campaignApi.list().then(({ campaigns }) => setCampaigns(campaigns)).catch(() => {});
  }

  useEffect(load, []);

  useEffect(() => {
    adventuresApi.get().then(({ adventures }) => setAdventures(adventures)).catch(() => {});
  }, []);

  async function onInvite(campaign: Campaign) {
    setInviteCampaignId(campaign.id);
    setInviteUrl(null);
    setInviteError(null);
    setCopied(false);
    try {
      const { url } = await inviteApi.get(campaign.id);
      setInviteUrl(url);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Nie udało się wygenerować zaproszenia");
    }
  }

  async function onCopy() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await campaignApi.create(name, description || undefined, adventure || undefined);
      setName("");
      setDescription("");
      setAdventure("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się utworzyć kampanii");
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl tracking-[0.12em] text-[#3a2c17]">
        <span className="mr-2 text-[#a97e1f]">✦</span>Kampanie
      </h1>
      <p className="mb-6 text-sm italic text-[#7c6a45]">
        Krainy utkane przez DoMino, w których zapisują się czyny twojej drużyny.
      </p>

      <Card className="mb-6 border-[#b99f6b]">
        <CardHeader className="pb-3">
          <CardTitle>Nowa kampania</CardTitle>
          <CardDescription className="not-italic">
            AI Dungeon Master przygotowuje nowy świat dla ciebie i twoich znajomych.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="campaign-name">Nazwa</Label>
              <Input
                id="campaign-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Zatopiony Skarbiec"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="campaign-desc">Opis (opcjonalnie)</Label>
              <Input
                id="campaign-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Kampania o napadzie w zalanym krasnoludzkim mieście"
              />
            </div>
            {adventures && adventures.length > 0 && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="campaign-adventure">Przygoda (opcjonalnie)</Label>
                <Select
                  id="campaign-adventure"
                  value={adventure}
                  onChange={(e) => setAdventure(e.target.value)}
                >
                  <option value="">— bez gotowej przygody —</option>
                  {adventures.map((a) => (
                    <option key={a.title} value={a.title}>
                      {a.title} ({a.source})
                    </option>
                  ))}
                </Select>
              </div>
            )}
            {error && <p className="text-sm text-[#8f1d1d]">{error}</p>}
            <Button type="submit" className="self-start">
              <Plus className="size-4" />
              Stwórz krainę
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        {campaigns.length === 0 && (
          <p className="text-sm text-[#7c6a45]">
            Brak kampanii. Stwórz pierwszą, aby zacząć.
          </p>
        )}
        {campaigns.map((campaign) => (
          <Card key={campaign.id} className="animate-fade-up">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Swords className="size-4 text-[#a97e1f]" />
                <CardTitle className="text-lg">{campaign.name}</CardTitle>
              </div>
              {campaign.description && (
                <CardDescription className="not-italic">{campaign.description}</CardDescription>
              )}
            </CardHeader>
            <CardFooter>
              <div className="flex w-full items-center justify-between">
                <Badge variant="secondary">
                  {campaign.state.phase} · {campaign.state.location}
                </Badge>
                <div className="flex items-center gap-2">
                  {campaign.ownerId === user?.id && (
                    <Button size="sm" variant="outline" onClick={() => onInvite(campaign)}>
                      <Link2 />
                      Zaproś
                    </Button>
                  )}
                  <Button asChild size="sm">
                    <Link to="/app/campaigns/$id" params={{ id: campaign.id }}>
                      Wejdź
                    </Link>
                  </Button>
                </div>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>

      {inviteCampaignId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#2e2113]/60 p-4"
          onClick={() => setInviteCampaignId(null)}
        >
          <Card
            className="w-full max-w-md animate-fade-up border-[#b99f6b] shadow-[0_10px_30px_-12px_rgba(60,40,10,0.55)]"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="pb-3">
              <CardTitle>Zaproś gracza</CardTitle>
              <CardDescription>Podziel się linkiem zaproszenia z przyjacielem.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {inviteError && <p className="text-sm text-[#8f1d1d]">{inviteError}</p>}
              {inviteUrl && (
                <>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={inviteUrl}
                      onFocus={(e) => e.currentTarget.select()}
                      className="flex-1"
                    />
                    <Button type="button" onClick={onCopy} className="shrink-0">
                      {copied ? "Skopiowano!" : "Kopiuj"}
                    </Button>
                  </div>
                  <p className="text-sm text-[#7c6a45]">
                    Wyślij ten link znajomemu — po rejestracji dołączy do kampanii.
                  </p>
                </>
              )}
              <Button
                type="button"
                variant="secondary"
                className="self-end"
                onClick={() => setInviteCampaignId(null)}
              >
                Zamknij
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
