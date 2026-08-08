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
  {
    title: "A Wild Sheep Chase",
    source: "Winghorn Press (darmowa przygoda 5e)",
    hook: "W środku nocy do karczmy wpada spanikowana owca, która mówi ludzkim głosem — to przemieniony czarodziej; błaga o pomoc w powrocie do swojej wieży, zanim groźny „Owczarz” zniszczy jego pracownię.",
    locations: ["Karczma", "Droga do wieży", "Wieża czarodzieja", "Laboratorium"],
    plotBeats: [
      "Rozmowa z przemienioną owcą i przyjęcie prośby o pomoc",
      "Wędrówka drogą do wieży i zasadzka na podróżnych",
      "Infiltracja wieży pełnej zaczarowanych przedmiotów",
      "Konfrontacja z Owczarzem i jego zmutowanym stworem zrodzonym z niedźwiedzia i owcy",
      "Odwrócenie zaklęcia i nagroda — magiczne drobiazgi z laboratorium",
    ],
    monsters: ["Bandit", "Bugbear", "Cultist"],
  },
  {
    title: "The Mad Manor of Astabar",
    source: "DMDave (darmowa przygoda 5e)",
    hook: "Zamożny kupiec wynajmuje drużynę do odzyskania spadku po ekscentrycznym czarodzieju Astabarze; jego dwór okazuje się labiryntem iluzji i dziwacznych pułapek, a „służba” to zaklęte manekiny.",
    locations: ["Brama dworu", "Hall z iluzjami", "Gabinet Astabara", "Krypta skarbca"],
    plotBeats: [
      "Wejście do dworu i pierwsze starcie z iluzjami czarodzieja",
      "Przedzieranie się przez pułapki i mechaniczne straże",
      "Odkrycie dziennika Astabara rzucającego światło na jego szaleństwo",
      "Rozwiązanie zagadki gabinetu i zdobycie klucza do skarbca",
      "Finałowy zwód w skarbcu — nagroda i opcjonalny duplikat",
    ],
    monsters: ["Skeleton", "Specter", "Ghoul"],
  },
  {
    title: "Winter's Splinter",
    source: "Społeczność 5e (darmowa przygoda)",
    hook: "Wioska w górach więdnie: czarna zima nie odpuszcza, a dzieci śnią o „Cierniu” — okazuje się, że przeklęty splinter lodu z dawnej bitwy z fey przebija serce zimy.",
    locations: ["Wioska", "Przełęcz", "Lodowa jaskinia", "Serce zimy"],
    plotBeats: [
      "Badanie niekończącej się zimy i szyfrowanych snów dzieci",
      "Wyprawa na mroźną przełęcz w głąb gór",
      "Przemierzanie lodowej jaskini pełnej pułapek i śliskich szczelin",
      "Walka ze strażnikiem serca zimy i wyjęcie splintera",
      "Koniec zimy, odwilż i wdzięczność mieszkańców wioski",
    ],
    monsters: ["Wolf", "Dire Wolf", "Troll"],
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

export function adventureSummaries(): Pick<
  Adventure,
  "title" | "source" | "hook" | "locations"
>[] {
  return ADVENTURES.map(({ title, source, hook, locations }) => ({
    title,
    source,
    hook,
    locations,
  }));
}
