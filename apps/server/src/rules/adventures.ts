export type Adventure = {
  title: string;
  source: string;
  hook: string;
  locations: string[];
  plotBeats: string[];
  monsters: string[];
};

export const ADVENTURES: Adventure[] = [
  {
    title: "A Most Potent Brew",
    source: "Winghorn Press (darmowa przygoda 5e)",
    hook: "Karczmarz z przydrożnego miasteczka prosi drużynę o pomoc: ktoś wykradł mu tajne składniki słynnego piwa, a ślady prowadzą wprost do opuszczonego browaru pod wzgórzem.",
    locations: ["Karczma \"Pod Złotym Kuflem\"", "Podziemny browar", "Komora fermentacyjna"],
    plotBeats: [
      "Rozpytywanie w karczmie i tropienie zaginionych składników",
      "Zejście do podziemnego browaru pełnego beczek i mokrej gry",
      "Starcia z goblinami i sprytne pułapki zastawione w przejściach",
      "Rozwiązanie zagadki wielkiej kadzi warzelniczej",
      "Nagroda: darmowe piwo u karczmarza i garść monet",
    ],
    monsters: ["Goblin", "Giant Rat"],
  },
  {
    title: "The Wolves of Welton",
    source: "Winghorn Press (darmowa przygoda 5e)",
    hook: "Wieś Welton żyje w strachu: ogromna wataha wilków porywa owce, a ostatnio także ludzi. Czeladnik pasterza błaga drużynę, by położyła kres tym najściom.",
    locations: ["Wioska Welton", "Pastwiska", "Leże wilków w lesie"],
    plotBeats: [
      "Rozmowy z mieszkańcami — między innymi z paserem mającym układy z gildią złodziei",
      "Podążanie wilczym tropem w głąb lasu",
      "Nocna obrona owczarni przed wygłodniałą watahą",
      "Szturm na wilcze leże i odkrycie prawdy: drapieżniki wypędzili kłusownicy",
      "Pokojowe lub krwawe zakończenie sporu z wilkami",
    ],
    monsters: ["Wolf", "Dire Wolf"],
  },
  {
    title: "The Delian Tomb",
    source: "Kolwyk i społeczność 5e (darmowa przygoda)",
    hook: "Zrozpaczony wieśniak pada przed drużyną na kolana: gobliny porwały jego córkę i wciągnęły ją do starego grobowca rycerskiego rodu Delianów.",
    locations: ["Grobowiec Delianów", "Komora grobowa", "Kaplica"],
    plotBeats: [
      "Wyprawa do zapomnianego grobowca i walka z goblinami przy wejściu",
      "Zmierzenie się z pułapkami w podziemnych korytarzach",
      "Przeszukanie komory grobowej i odnalezienie więźniarki",
      "Uwolnienie porwanej i ucieczka z grobowca",
      "Opcjonalnie: konfrontacja z okultystą, który chce przejąć grób dla siebie",
    ],
    monsters: ["Goblin", "Bugbear", "Skeleton"],
  },
];

export function findAdventure(title: string): Adventure | undefined {
  const needle = title.trim().toLowerCase();
  if (!needle) return undefined;
  return ADVENTURES.find((a) => a.title.toLowerCase().includes(needle));
}

export function buildAdventureState(
  adventure: Adventure,
  location?: string,
): { location: string; scene: string; worldProgress: string[]; notes: string } {
  const notes = `${adventure.hook} Przebieg przygody: ${adventure.plotBeats.join("; ")}.`;
  return {
    location: location ?? adventure.locations[0]!,
    scene: adventure.hook,
    worldProgress: [`Przygoda: ${adventure.title}`],
    notes,
  };
}
