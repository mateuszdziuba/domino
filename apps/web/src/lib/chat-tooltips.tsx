import * as React from "react";
import { SKILLS, type SkillInfo } from "@domino/shared";
import { Tooltip, TooltipContent, TooltipTrigger } from "../components/ui/tooltip";
import type { SpellMeta } from "./api-client";

export const SKILL_DESCRIPTIONS: Record<string, string> = {
  acrobatics:
    "Balansowanie na krawędziach, unikanie upadków i wywracanie się w zwarciu. Przydaje się do przejść po linach, skoków przez przepaście i akrobatycznych uników w walce.",
  animalHandling:
    "Uspokajanie i prowadzenie zwierząt oraz jazda wierzchem. Pozwala odczytać nastrój stworzenia, przywołać konia do spokoju czy przemknąć obok warczącego psa.",
  arcana:
    "Wiedza o magii, artefaktach i planach egzystencji. Służy do identyfikacji czarów i efektów magicznych, rozpoznawania run oraz oceny zagrożenia ze strony magicznych stworzeń.",
  athletics:
    "Wspinaczka, pływanie, skoki oraz przeciąganie i pchanie. Potrzebna do forsowania ciężkich drzwi, wydostania się z chwytu, wspięcia się na mury czy pokonania rwącej rzeki.",
  deception:
    "Blefowanie, ukrywanie prawdy i odwracanie uwagi rozmówcy. Pozwala wmówić strażnikom fałszywy powód wizyty, a w walce — zmylić przeciwnika wierzgnięciem.",
  history:
    "Wiedza o królestwach, legendach i dawnych wydarzeniach. Pozwala rozpoznać ruiny, przypomnieć sobie genealogie rodów czy odgadnąć cel starożytnego rytuału.",
  insight:
    "Odczytywanie intencji i kłamstw rozmówcy. Pozwala wyczuć, że kupiec zaniża cenę, że więzień kłamie albo że szlachcic planuje zdradę — to rzut przeciw skłamaniu i blefom.",
  intimidation:
    "Zastraszanie i wymuszanie groźbą, siłą lub samą obecnością. Przydaje się do wymuszenia przejścia, skłonienia wroga do ucieczki czy zdobycia informacji bez walki.",
  investigation:
    "Przeszukiwanie, wiązanie faktów i odnajdywanie ukrytych wskazówek. Pozwala znaleźć sekretny przycisk, przeanalizować ślady na podłodze i złożyć poszlaki w całość.",
  medicine:
    "Diagnozowanie chorób i ran, stabilizacja umierających oraz sekcja zwłok. Pozwala ustalić przyczynę śmierci, rozpoznać truciznę albo odratować towarzysza z 0 punktów życia.",
  nature:
    "Wiedza o terenie, roślinach, zwierzętach i pogodzie. Pozwala rozpoznać jadalne owoce, przewidzieć burzę, odgadnąć zwyczaje drapieżnika czy zidentyfikować magiczny grzyb.",
  perception:
    "Wypatrywanie ukrytych stworzeń, podsłuchiwanie, wyczuwanie zasadzek i dostrzeganie szczegółów otoczenia. Twój wynik walczy ze Skradaniem przeciwników i ujawnia ukryte ślady czy pułapki.",
  performance:
    "Występy, gra na instrumentach, taniec i rozrywanie tłumu. Pozwala zarobić na życie, zdobyć przychylność dworu czy odwrócić uwagę publiczności od kieszonkowca.",
  persuasion:
    "Przekonywanie, dyplomacja i targowanie. Pozwala obniżyć cenę u kupca, przekonać strażnika do łamania zasad albo wynegocjować pokój zamiast krwawej bitwy.",
  religion:
    "Wiedza o bóstwach, obrzędach i nieumarłych. Pozwala rozpoznać symbole kultów, odgadnąć słabości nieumarłych czy poprawnie przeprowadzić święty rytuał.",
  sleightOfHand:
    "Kieszonkowstwo, żonglerka i chowanie przedmiotów. Pozwala wyciągnąć klucz z kieszeni strażnika, schować sztylet przed kontrolą albo podmienić przedmioty na oczach tłumu.",
  stealth:
    "Skradanie się i pozostawanie niezauważonym. Pozwala przemknąć obok straży, ukryć się w cieniu przed patrolującymi i zaskoczyć wrogów — twój wynik walczy ze Spostrzegawczością.",
  survival:
    "Tropienie, nawigacja, zdobywanie pożywienia i przetrwanie w dziczy. Pozwala śledzić zwierzynę, unikać zgubienia się we mgle, rozpalić ogień i znaleźć wodę na pustkowiu.",
};

export const SKILL_ALIASES: Record<string, string[]> = {
  acrobatics: ["Acrobatics", "Akrobatyka"],
  animalHandling: ["Animal Handling", "Obsługa zwierząt"],
  arcana: ["Arcana", "Tajemnice"],
  athletics: ["Athletics", "Atletyka"],
  deception: ["Deception", "Oszustwo"],
  history: ["History", "Historia"],
  insight: ["Insight", "Intuicja"],
  intimidation: ["Intimidation", "Zastraszanie"],
  investigation: ["Investigation", "Śledztwo"],
  medicine: ["Medicine", "Medycyna"],
  nature: ["Nature", "Natura"],
  performance: ["Performance", "Występy"],
  persuasion: ["Persuasion", "Perswazja"],
  religion: ["Religion", "Religia"],
  sleightOfHand: ["Sleight of Hand", "Zwinne dłonie"],
  stealth: ["Stealth", "Skradanie"],
  survival: ["Survival", "Przetrwanie"],
};

const ABILITY_LABELS: Record<string, string> = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
};

const LETTER_RE = /[a-ząćęłńóśźż]/i;

function isLetter(ch: string | undefined): boolean {
  return ch !== undefined && LETTER_RE.test(ch);
}

function spellEffectDescription(meta: SpellMeta): string {
  if (meta.effect.kind === "damage") {
    const dice = [meta.effect.dice, meta.effect.damageType].filter(Boolean).join(" ");
    const extra = meta.effect.attack
      ? "rzut ataku"
      : meta.effect.save
        ? `rzut obronny (${meta.effect.save})`
        : "";
    return `Obrażenia: ${dice}${extra ? ` — ${extra}` : ""}`;
  }
  if (meta.effect.kind === "heal") {
    return `Leczenie: ${meta.effect.dice ?? ""}${meta.effect.mod ? " + modyfikator" : ""} punktów życia`;
  }
  return "Stabilizuje istotę na 0 punktach życia.";
}

type ChatToken =
  | { kind: "spell"; lower: string; text: string; meta: SpellMeta }
  | { kind: "skill"; lower: string; text: string; skill: SkillInfo };

function buildTokens(spellRegistry: SpellMeta[] | null): ChatToken[] {
  const result: ChatToken[] = [];
  const seen = new Set<string>();
  for (const meta of spellRegistry ?? []) {
    if (meta.name.length < 2) continue;
    const lower = meta.name.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    result.push({ kind: "spell", lower, text: meta.name, meta });
  }
  for (const skill of SKILLS) {
    for (const alias of new Set([skill.label, ...(SKILL_ALIASES[skill.key] ?? [])])) {
      if (alias.length < 2) continue;
      const lower = alias.toLowerCase();
      if (seen.has(lower)) continue;
      seen.add(lower);
      result.push({ kind: "skill", lower, text: alias, skill });
    }
  }
  return result.sort((a, b) => b.lower.length - a.lower.length);
}

export function RichMessageText({
  text,
  spellRegistry,
}: {
  text: string;
  spellRegistry: SpellMeta[] | null;
}) {
  const tokens = React.useMemo(() => buildTokens(spellRegistry), [spellRegistry]);
  const lowerText = text.toLowerCase();

  const nodes: React.ReactNode[] = [];
  let i = 0;
  while (i < text.length) {
    const token = tokens.find((t) => lowerText.startsWith(t.lower, i));
    if (token) {
      const end = i + token.lower.length;
      const boundaryOk =
        (i === 0 || !isLetter(text[i - 1])) && (end >= text.length || !isLetter(text[end]));
      if (boundaryOk) {
        nodes.push(
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <span className="cursor-help border-b border-dotted border-[#a97e1f]/70 text-[#7a4b1d]">
                {token.text}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {token.kind === "spell" ? (
                token.meta.description ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="font-display text-xs tracking-[0.08em] text-[#e8c56a]">
                        {token.meta.name}
                      </span>
                      <span className="text-[9px] uppercase tracking-[0.12em] text-[#c9b183]">
                        {token.meta.school}
                        {token.meta.level === 0 ? " · cantrip" : ` · poziom ${token.meta.level}`}
                      </span>
                    </div>
                    <span className="text-[11px] leading-relaxed text-[#f6ead0]">
                      {token.meta.description}
                    </span>
                    <span className="text-[11px] text-[#e8c56a]">
                      {spellEffectDescription(token.meta)}
                    </span>
                    <span className="text-[10px] text-[#c9b183]">
                      {token.meta.castingTime} · {token.meta.range} · {token.meta.duration} ·{" "}
                      {token.meta.components}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="font-display text-xs tracking-[0.08em] text-[#e8c56a]">
                        {token.meta.name}
                      </span>
                      <span className="text-[9px] uppercase tracking-[0.12em] text-[#c9b183]">
                        {token.meta.school}
                        {token.meta.level === 0 ? " · cantrip" : ` · poziom ${token.meta.level}`}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#f6ead0]">
                      {spellEffectDescription(token.meta)}
                    </div>
                  </div>
                )
              ) : (
                <div className="flex flex-col gap-1">
                  <span className="font-display text-xs tracking-[0.08em] text-[#e8c56a]">
                    {token.skill.label}
                  </span>
                  <span className="text-[11px] leading-relaxed text-[#f6ead0]">
                    {SKILL_DESCRIPTIONS[token.skill.key] ?? ""}
                  </span>
                  <span className="text-[10px] text-[#c9b183]">
                    Cecha: {ABILITY_LABELS[token.skill.ability]}
                  </span>
                </div>
              )}
            </TooltipContent>
          </Tooltip>,
        );
      } else {
        nodes.push(text.slice(i, end));
      }
      i = end;
    } else {
      let next = -1;
      for (const t of tokens) {
        const idx = lowerText.indexOf(t.lower, i);
        if (idx !== -1 && (next === -1 || idx < next)) next = idx;
      }
      if (next === -1) {
        nodes.push(text.slice(i));
        break;
      }
      nodes.push(text.slice(i, next));
      i = next;
    }
  }

  return <>{nodes}</>;
}
