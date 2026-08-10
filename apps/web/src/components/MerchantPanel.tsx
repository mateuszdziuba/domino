import { useEffect, useState } from "react";
import { characterApi, equipmentApi, type EquipmentCatalog } from "../lib/api-client";
import type { Character, InventoryItem, SrdGearItem } from "@domino/shared";
import { ItemIcon } from "../lib/item-icons";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { cn } from "../lib/utils";

const GEAR_CATEGORY_LABELS: Record<SrdGearItem["category"], string> = {
  armor: "Zbroje",
  weapon: "Broń",
  gear: "Wyposażenie",
  magic: "Magiczne przedmioty",
};

const GEAR_CATEGORY_ORDER: SrdGearItem["category"][] = ["armor", "weapon", "gear", "magic"];
const ATTUNEMENT_LIMIT_DEFAULT = 3;

export function MerchantPanel({
  characterId,
  onCharacterChanged,
}: {
  characterId: string;
  onCharacterChanged?: () => void;
}) {
  const [character, setCharacter] = useState<Character | null>(null);
  const [equipment, setEquipment] = useState<EquipmentCatalog | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    characterApi
      .get(characterId)
      .then(({ character }) => {
        if (!cancelled) setCharacter(character);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Nie udało się wczytać postaci");
      });
    equipmentApi.get().then(setEquipment).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [characterId]);

  if (!character) {
    return error ? (
      <p className="text-sm text-[#8f1d1d]">{error}</p>
    ) : (
      <p className="text-sm italic text-[#7c6a45]">Wchodzę do kramu…</p>
    );
  }

  const current = character;
  const inventory = current.inventory ?? [];
  const attunementLimit = equipment?.attunementLimit ?? ATTUNEMENT_LIMIT_DEFAULT;
  const attunedCount = inventory.filter((item) => item.attuned).length;
  const gearGroups = GEAR_CATEGORY_ORDER.map((category) => ({
    category,
    label: GEAR_CATEGORY_LABELS[category],
    items: (equipment?.gear ?? []).filter((g) => g.category === category),
  })).filter((group) => group.items.length > 0);
  const sellable = inventory.filter((item) => (item.price ?? 0) > 0);

  function applyUpdate(updates: { gold: number; inventory: InventoryItem[] }, message: string) {
    setError(null);
    setSaving(true);
    characterApi
      .update(current.id, updates)
      .then(({ character: updated }) => {
        setCharacter(updated);
        setSuccess(message);
        window.setTimeout(() => setSuccess(null), 2500);
        onCharacterChanged?.();
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Nie udało się zapisać"))
      .finally(() => setSaving(false));
  }

  function buyGear(gear: SrdGearItem) {
    const priceGp = gear.priceGp;
    if (priceGp == null) return;
    const gold = current.gold ?? 0;
    if (gold < priceGp) {
      setError("Za mało złota");
      return;
    }
    const attuned = gear.attuned ?? false;
    if (attuned && attunedCount >= attunementLimit) {
      setError("Maksymalnie 3 atunementy (SRD).");
      return;
    }
    applyUpdate(
      {
        gold: gold - priceGp,
        inventory: [
          ...inventory,
          {
            id: crypto.randomUUID(),
            name: gear.name,
            quantity: 1,
            weight: gear.weight,
            description: gear.description,
            slot: gear.slot,
            attuned,
            price: priceGp,
          },
        ],
      },
      `Kupiono: ${gear.name}`,
    );
  }

  function sellItem(item: InventoryItem) {
    const half = Math.floor((item.price ?? 0) / 2);
    if (half <= 0) return;
    applyUpdate(
      {
        gold: (current.gold ?? 0) + half,
        inventory: inventory.flatMap((i) =>
          i.id === item.id ? (i.quantity > 1 ? [{ ...i, quantity: i.quantity - 1 }] : []) : [i],
        ),
      },
      `Sprzedano: ${item.name}`,
    );
  }

  return (
    <div className={cn("flex flex-col gap-4", saving && "pointer-events-none opacity-60")}>
      <div className="flex items-center justify-between">
        <span className="font-display text-[10px] uppercase tracking-[0.14em] text-[#a97e1f]">
          Złoto: {current.gold ?? 0} szt.
        </span>
        {success && <span className="text-xs text-[#3f6b34]">{success}</span>}
      </div>
      <div className="flex flex-col gap-3">
        <div className="font-display text-[10px] uppercase tracking-[0.14em] text-[#7c6a45]">Kup</div>
        <TooltipProvider delayDuration={250}>
          {gearGroups.map((group) => (
            <div key={group.category} className="flex flex-col gap-1">
              <div className="font-display text-[9px] uppercase tracking-[0.12em] text-[#a08b5c]">
                {group.label}
              </div>
              {group.items.map((gear) => (
                <div
                  key={gear.name}
                  className="flex items-center justify-between gap-2 border-b border-dotted border-[#c8b184] py-1"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex min-w-0 items-center gap-1.5">
                          <ItemIcon icon={gear.icon} className="size-3.5 shrink-0 text-[#a97e1f]" />
                          <span className="truncate text-sm text-[#2e2113]">{gear.name}</span>
                        </span>
                      </TooltipTrigger>
                      {gear.description && (
                        <TooltipContent>
                          <span className="text-[11px] leading-relaxed text-[#f6ead0]">
                            {gear.description}
                          </span>
                        </TooltipContent>
                      )}
                    </Tooltip>
                    {gear.price && <span className="shrink-0 text-xs text-[#7c6a45]">{gear.price}</span>}
                  </span>
                  <Button
                    size="sm"
                    disabled={saving || gear.priceGp == null}
                    title={gear.priceGp == null ? "Brak ceny" : undefined}
                    onClick={() => buyGear(gear)}
                    className="shrink-0"
                  >
                    {gear.priceGp == null ? "brak ceny" : "Kup"}
                  </Button>
                </div>
              ))}
            </div>
          ))}
        </TooltipProvider>
      </div>
      <div className="flex flex-col gap-1">
        <div className="font-display text-[10px] uppercase tracking-[0.14em] text-[#7c6a45]">Sprzedaj</div>
        {sellable.length === 0 ? (
          <p className="text-sm italic text-[#7c6a45]">Brak przedmiotów na sprzedaż.</p>
        ) : (
          <TooltipProvider delayDuration={250}>
            <div className="flex flex-col gap-1">
              {sellable.map((item) => {
                const half = Math.floor((item.price ?? 0) / 2);
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 border-b border-dotted border-[#c8b184] py-1"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex min-w-0 items-center gap-1.5">
                            <ItemIcon icon={item.icon} className="size-3.5 shrink-0 text-[#a97e1f]" />
                            <span className="truncate text-sm text-[#2e2113]">{item.name}</span>
                          </span>
                        </TooltipTrigger>
                        {item.description && (
                          <TooltipContent>
                            <span className="text-[11px] leading-relaxed text-[#f6ead0]">
                              {item.description}
                            </span>
                          </TooltipContent>
                        )}
                      </Tooltip>
                      {item.quantity > 1 && (
                        <span className="shrink-0 italic text-xs text-[#7c6a45]">×{item.quantity}</span>
                      )}
                      <span className="shrink-0 text-xs text-[#7c6a45]">za {half} szt.</span>
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={saving}
                      onClick={() => sellItem(item)}
                      className="shrink-0"
                    >
                      Sprzedaj
                    </Button>
                  </div>
                );
              })}
            </div>
          </TooltipProvider>
        )}
      </div>
      <p className="text-[10px] italic text-[#a08b5c]">
        Kupione przedmioty trafiają do plecaka; sprzedaż odbywa się za połowę ceny.
      </p>
      {error && <p className="text-xs text-[#8f1d1d]">{error}</p>}
    </div>
  );
}
