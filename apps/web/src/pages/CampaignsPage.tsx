import { useEffect, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, Swords } from "lucide-react";
import { campaignApi } from "../lib/api-client";
import type { Campaign } from "@domino/shared";
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

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  function load() {
    campaignApi.list().then(({ campaigns }) => setCampaigns(campaigns)).catch(() => {});
  }

  useEffect(load, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await campaignApi.create(name, description || undefined);
      setName("");
      setDescription("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create campaign");
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl tracking-[0.12em] text-[#3a2c17]">
        <span className="mr-2 text-[#a97e1f]">✦</span>Campaigns
      </h1>
      <p className="mb-6 text-sm italic text-[#7c6a45]">
        Realms woven by DoMino, where your party's deeds are written.
      </p>

      <Card className="mb-6 border-[#b99f6b]">
        <CardHeader className="pb-3">
          <CardTitle>New campaign</CardTitle>
          <CardDescription>The AI DM prepares a fresh world for you and your friends.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="campaign-name">Name</Label>
              <Input
                id="campaign-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="The Sunken Vault"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="campaign-desc">Description (optional)</Label>
              <Input
                id="campaign-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A heist campaign in a flooded dwarven city"
              />
            </div>
            {error && <p className="text-sm text-[#8f1d1d]">{error}</p>}
            <Button type="submit" className="self-start">
              <Plus className="size-4" />
              Forge the realm
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        {campaigns.length === 0 && (
          <p className="text-sm italic text-[#7c6a45]">
            No campaigns yet. Create one to get started.
          </p>
        )}
        {campaigns.map((campaign) => (
          <Card key={campaign.id} className="animate-fade-up">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Swords className="size-4 text-[#a97e1f]" />
                <CardTitle className="text-lg">{campaign.name}</CardTitle>
              </div>
              {campaign.description && <CardDescription>{campaign.description}</CardDescription>}
            </CardHeader>
            <CardFooter>
              <div className="flex w-full items-center justify-between">
                <Badge variant="secondary">
                  {campaign.state.phase} · {campaign.state.location}
                </Badge>
                <Button asChild size="sm">
                  <Link to="/app/campaigns/$id" params={{ id: campaign.id }}>
                    Enter
                  </Link>
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
