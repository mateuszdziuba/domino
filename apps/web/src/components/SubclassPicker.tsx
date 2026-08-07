import { useEffect, useState } from "react";
import { featuresApi, type FeaturesCatalog } from "../lib/api-client";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";

type SubclassPickerProps = {
  className: string;
  current?: string;
  onSelect: (subclass: string) => void;
  busy?: boolean;
  catalog?: FeaturesCatalog | null;
};

export function SubclassPicker({
  className,
  current,
  onSelect,
  busy,
  catalog: catalogProp,
}: SubclassPickerProps) {
  const [fetched, setFetched] = useState<FeaturesCatalog | null>(catalogProp ?? null);

  useEffect(() => {
    if (catalogProp) {
      setFetched(catalogProp);
      return;
    }
    let cancelled = false;
    featuresApi
      .get()
      .then((catalog) => {
        if (!cancelled) setFetched(catalog);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [catalogProp]);

  const catalog = catalogProp ?? fetched;
  const subclasses = catalog?.subclassDetails?.[className] ?? [];
  if (subclasses.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {subclasses.map((subclass) => {
        const isCurrent = subclass.name === current;
        return (
          <div
            key={subclass.name}
            className={cn(
              "rounded-sm border border-[#c8b184] bg-[#fbf3dd]/70 px-3 py-2.5",
              isCurrent && "border-[#2e4d3a]/60 bg-[#2e4d3a]/10",
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-display text-sm tracking-[0.06em] text-[#2e2113]">
                {subclass.name}
              </span>
              <Button
                type="button"
                size="sm"
                variant={isCurrent ? "secondary" : "default"}
                disabled={busy || isCurrent}
                onClick={() => onSelect(subclass.name)}
              >
                {isCurrent ? "Wybrana" : "Wybierz"}
              </Button>
            </div>
            <div className="mt-1.5 flex flex-col gap-1">
              {subclass.features.map((feature) => (
                <div key={feature.name} className="text-xs text-[#7c6a45]">
                  <span className="font-display tracking-[0.04em] text-[#3a2c17]">
                    {feature.name}
                  </span>{" "}
                  — {feature.description}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
