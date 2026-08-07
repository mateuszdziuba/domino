import type { SheetFeature } from "@domino/shared";

export type RaceDef = { name: string; features: SheetFeature[] };

export type ClassFeatureDef = { name: string; description: string; level: number };

export type ClassDef = {
  name: string;
  hitDie: number;
  savingThrows: string[];
  features: ClassFeatureDef[];
  subclasses: {
    name: string;
    features: { name: string; description: string; level: number }[];
  }[];
};

export const RACES: RaceDef[] = [
  {
    name: "Human",
    features: [
      {
        name: "Wszechstronność (Versatile)",
        description:
          "Uzyskujesz biegłość w jednej umiejętności i jeden atut (feat) według własnego wyboru.",
        level: 1,
        category: "race",
      },
      {
        name: "Szybki rozwój (Resourceful)",
        description:
          "Zwiększasz trzy różne cechy o +1 albo dwie różne cechy o +2 i jedną o +1.",
        level: 1,
        category: "race",
      },
    ],
  },
  {
    name: "Elf",
    features: [
      {
        name: "Wzrok w ciemności (Darkvision)",
        description:
          "Widzisz w przyćmionym świetle w promieniu 60 stóp tak, jak w jasnym, a w ciemności tak, jak w przyćmionym.",
        level: 1,
        category: "race",
      },
      {
        name: "Pochodzenie fejów (Fey Ancestry)",
        description:
          "Masz odporność na stan uroczenia (charmed), a magia snu nie ma na ciebie wpływu.",
        level: 1,
        category: "race",
      },
      {
        name: "Trans (Trance)",
        description:
          "Zamiast snu możesz medytować przez 4 godziny na dobę; podczas transu pozostajesz w półświadomości.",
        level: 1,
        category: "race",
      },
      {
        name: "Biegłość w Percepcji (Keen Senses)",
        description: "Masz biegłość w umiejętności Percepcja.",
        level: 1,
        category: "race",
      },
    ],
  },
  {
    name: "Dwarf",
    features: [
      {
        name: "Wzrok w ciemności (Darkvision)",
        description:
          "Widzisz w przyćmionym świetle w promieniu 60 stóp tak, jak w jasnym, a w ciemności tak, jak w przyćmionym.",
        level: 1,
        category: "race",
      },
      {
        name: "Krzepkość krasnoludów (Dwarven Resilience)",
        description:
          "Masz odporność na obrażenia od trucizn i przewagę w rzutach obronnych przeciw truciznom.",
        level: 1,
        category: "race",
      },
      {
        name: "Kamienny instynkt (Stonecunning)",
        description:
          "Masz przewagę w testach Historii dotyczących pochodzenia, rzemiosła i innych spraw związanych z kamieniem.",
        level: 1,
        category: "race",
      },
      {
        name: "Szybkość krasnoluda (Speed)",
        description:
          "Twoja szybkość podstawowa wynosi 25 stóp; noszenie ciężkiego pancerza jej nie zmniejsza.",
        level: 1,
        category: "race",
      },
    ],
  },
  {
    name: "Halfling",
    features: [
      {
        name: "Szczęście (Lucky)",
        description:
          "Gdy w rzucie ataku, teście umiejętności lub rzucie obronnym wyrzucisz naturalną 1, możesz rzucić kością ponownie i musisz użyć nowego wyniku.",
        level: 1,
        category: "race",
      },
      {
        name: "Odwaga (Brave)",
        description: "Masz przewagę w rzutach obronnych przeciw przerażeniu (frightened).",
        level: 1,
        category: "race",
      },
      {
        name: "Zwinność (Nimbleness)",
        description: "Możesz przechodzić przez pola zajęte przez istoty większe od ciebie.",
        level: 1,
        category: "race",
      },
      {
        name: "Szybkość niziołka (Speed)",
        description: "Twoja szybkość podstawowa wynosi 25 stóp.",
        level: 1,
        category: "race",
      },
    ],
  },
  {
    name: "Gnome",
    features: [
      {
        name: "Wzrok w ciemności (Darkvision)",
        description:
          "Widzisz w przyćmionym świetle w promieniu 60 stóp tak, jak w jasnym, a w ciemności tak, jak w przyćmionym.",
        level: 1,
        category: "race",
      },
      {
        name: "Przebiegłość gnomów (Gnomish Cunning)",
        description:
          "Masz przewagę w rzutach obronnych Inteligencji, Mądrości i Charyzmy przeciwko magii.",
        level: 1,
        category: "race",
      },
    ],
  },
  {
    name: "Dragonborn",
    features: [
      {
        name: "Pochodzenie smocze (Draconic Ancestry)",
        description:
          "Wybierasz typ smoka: kwas, zimno, ogień, błyskawice lub trucizna; wpływa on na twój oddech i odporność.",
        level: 1,
        category: "race",
      },
      {
        name: "Oddech smoka (Breath Weapon)",
        description:
          "Akcją możesz wypluć strumień żywiołu: istoty w obszarze wykonują rzut obronny, a przy porażce otrzymują 1k10 obrażeń smoczego typu (kości rosną z poziomem).",
        level: 1,
        category: "race",
      },
      {
        name: "Odporność na obrażenia smoczego typu (Damage Resistance)",
        description: "Masz odporność na obrażenia typu wybranego przez Pochodzenie smocze.",
        level: 1,
        category: "race",
      },
    ],
  },
  {
    name: "Orc",
    features: [
      {
        name: "Wzrok w ciemności (Darkvision)",
        description:
          "Widzisz w przyćmionym świetle w promieniu 60 stóp tak, jak w jasnym, a w ciemności tak, jak w przyćmionym.",
        level: 1,
        category: "race",
      },
      {
        name: "Nieugięta wytrwałość (Relentless Endurance)",
        description:
          "Gdy obrażenia obniżają twoje punkty życia do 0, możesz zamiast tego zostać przy 1 punkcie życia — raz na długi odpoczynek.",
        level: 1,
        category: "race",
      },
      {
        name: "Dzikie ataki (Savage Attacks)",
        description:
          "Gdy trafisz krytycznie atakiem bronią, możesz dodać do obrażeń jedną dodatkową kość obrażeń broni.",
        level: 1,
        category: "race",
      },
    ],
  },
  {
    name: "Tiefling",
    features: [
      {
        name: "Wzrok w ciemności (Darkvision)",
        description:
          "Widzisz w przyćmionym świetle w promieniu 60 stóp tak, jak w jasnym, a w ciemności tak, jak w przyćmionym.",
        level: 1,
        category: "race",
      },
      {
        name: "Piekielna odporność (Hellish Resistance)",
        description: "Masz odporność na obrażenia od ognia.",
        level: 1,
        category: "race",
      },
      {
        name: "Piekielne dziedzictwo (Infernal Legacy)",
        description: "Znasz zaklęcie Thaumaturgy i możesz je rzucać jako cantrip dowolną liczbę razy.",
        level: 1,
        category: "race",
      },
    ],
  },
];

export const CLASSES: ClassDef[] = [
  {
    name: "Barbarian",
    hitDie: 12,
    savingThrows: ["strength", "constitution"],
    features: [
      {
        name: "Szał (Rage)",
        description:
          "Akcją bonusową możesz wejść w szał: przewaga w testach Siły, odporność na obrażenia od cięć, obuchów i przebić oraz premia do obrażeń; trwa 1 minutę, a liczba szałów rośnie z poziomem.",
        level: 1,
      },
      {
        name: "Obrona bez pancerza (Unarmored Defense)",
        description:
          "Gdy nie nosisz pancerza, twój AC wynosi 10 + modyfikator Zręczności + modyfikator Kondycji.",
        level: 1,
      },
      {
        name: "Zuchwały atak (Reckless Attack)",
        description:
          "Podczas swojej tury możesz atakować z przewagą bronią walki wręcz, ale ataki wymierzone w ciebie mają przewagę do początku twojej następnej tury.",
        level: 2,
      },
      {
        name: "Niebezpieczny zmysł (Danger Sense)",
        description:
          "Masz przewagę w rzutach obronnych Zręczności przeciw efektom, które widzisz — w tym przeciw zasadzkom.",
        level: 2,
      },
    ],
    subclasses: [
      {
        name: "Berserker",
        features: [
          {
            name: "Szał berserkerski (Frenzy)",
            level: 3,
            description:
              "Wchodząc w szał, możesz wejść w szał berserkerski: podczas szału możesz wykonać dodatkowy atak bronią walki wręcz jako akcję bonusową.",
          },
        ],
      },
    ],
  },
  {
    name: "Bard",
    hitDie: 8,
    savingThrows: ["dexterity", "charisma"],
    features: [
      {
        name: "Rzucanie zaklęć (Spellcasting)",
        description: "Rzucasz zaklęcia barda; twoim atrybutem rzucania jest Charyzma.",
        level: 1,
      },
      {
        name: "Inspiracja barda (Bardic Inspiration)",
        description:
          "Akcją bonusową możesz przyznać sojusznikowi w zasięgu 60 stóp kość inspiracji k6, którą może on dodać do jednego rzutu w ciągu 10 minut; liczba kości rośnie z poziomem.",
        level: 1,
      },
      {
        name: "Złota rączka (Jack of All Trades)",
        description:
          "Dodajesz połowę premii z biegłości (zaokrągloną w dół) do testów umiejętności, w których nie masz biegłości.",
        level: 2,
      },
      {
        name: "Pieśń odpoczynku (Song of Rest)",
        description:
          "Podczas krótkiego odpoczynku ty i twoi sprzymierzeńcy odzyskujecie dodatkowe 1k6 punktów życia.",
        level: 2,
      },
    ],
    subclasses: [
      {
        name: "Kolegium Wiedzy (College of Lore)",
        features: [
          {
            name: "Dodatkowe biegłości (Bonus Proficiencies)",
            level: 3,
            description: "Uzyskujesz biegłość w trzech umiejętnościach według własnego wyboru.",
          },
          {
            name: "Cięte słowa (Cutting Words)",
            level: 3,
            description:
              "Gdy istota w zasięgu 60 stóp wykona rzut ataku, umiejętności lub obrażeń, możesz wydać kość inspiracji barda, aby odjąć jej wynik od rzutu.",
          },
        ],
      },
    ],
  },
  {
    name: "Cleric",
    hitDie: 8,
    savingThrows: ["wisdom", "charisma"],
    features: [
      {
        name: "Rzucanie zaklęć (Spellcasting)",
        description: "Rzucasz zaklęcia kapłana; twoim atrybutem rzucania jest Mądrość.",
        level: 1,
      },
      {
        name: "Boskie natchnienie (Divine Order)",
        description:
          "Wybierasz rolę: Wojownik (biegłość w ciężkich pancerzach i broniach wojennych) albo Uczony (dwa języki i biegłość w dwóch umiejętnościach wiedzy).",
        level: 1,
      },
      {
        name: "Kanał bóstwa (Channel Divinity)",
        description:
          "Raz na krótki odpoczynek możesz skierować energię bóstwa; podstawową opcją jest Boska iskra (Divine Spark): akcją zadajesz obrażenia promieniste lub leczysz za 2k8 + modyfikator Mądrości w zasięgu 60 stóp.",
        level: 2,
      },
    ],
    subclasses: [
      {
        name: "Domena Życia (Life Domain)",
        features: [
          {
            name: "Uczeń życia (Disciple of Life)",
            level: 3,
            description:
              "Zaklęcia leczące rzucane przez sloty 1. poziomu lub wyższe leczą dodatkowo o 2 punkty życia.",
          },
          {
            name: "Kanał bóstwa: Zachowanie życia (Preserve Life)",
            level: 3,
            description:
              "Akcją możesz przywrócić istotom w zasięgu 30 stóp punkty życia z puli równej 5 × poziom kapłana, dzieląc ją według uznania.",
          },
        ],
      },
    ],
  },
  {
    name: "Druid",
    hitDie: 8,
    savingThrows: ["intelligence", "wisdom"],
    features: [
      {
        name: "Rzucanie zaklęć (Spellcasting)",
        description: "Rzucasz zaklęcia druida; twoim atrybutem rzucania jest Mądrość.",
        level: 1,
      },
      {
        name: "Dzikie kształty (Wild Shape)",
        description:
          "Akcją możesz przybrać postać bestii; masz dwa ładunki na krótki odpoczynek, a ich liczba rośnie z poziomem.",
        level: 2,
      },
    ],
    subclasses: [
      {
        name: "Krąg Księżyca (Circle of the Moon)",
        features: [
          {
            name: "Walka w dzikiej formie (Combat Wild Shape)",
            level: 3,
            description:
              "Dziką formę przybierasz jako akcję bonusową i możesz koncentrować się na zaklęciach w dzikiej formie; raz na turę w formie bestii możesz wykonać Smocze uderzenie (Bestial Strike).",
          },
          {
            name: "Ulepszone dzikie kształty (Improved Wild Shape)",
            level: 3,
            description:
              "Twoje dzikie formy mają AC co najmniej 15, a ich ataki liczą się jako magiczne; od 6. poziomu przybierasz również formy o wyższym poziomie wyzwania.",
          },
        ],
      },
    ],
  },
  {
    name: "Fighter",
    hitDie: 10,
    savingThrows: ["strength", "constitution"],
    features: [
      {
        name: "Styl walki (Fighting Style)",
        description: "Wybierasz styl walki, który daje ci stałą premię w walce.",
        level: 1,
      },
      {
        name: "Drugi oddech (Second Wind)",
        description:
          "Akcją bonusową możesz przywrócić sobie 1k10 + poziom wojownika punktów życia — raz na krótki lub długi odpoczynek.",
        level: 1,
      },
      {
        name: "Przypływ akcji (Action Surge)",
        description:
          "Raz na krótki lub długi odpoczynek możesz wykonać dodatkową akcję w swojej turze.",
        level: 2,
      },
    ],
    subclasses: [
      {
        name: "Champion",
        features: [
          {
            name: "Ulepszony krytyk (Improved Critical)",
            level: 3,
            description: "Twoje ataki trafiają krytycznie przy naturalnym 19 lub 20.",
          },
        ],
      },
    ],
  },
  {
    name: "Monk",
    hitDie: 8,
    savingThrows: ["strength", "dexterity"],
    features: [
      {
        name: "Sztuki walki (Martial Arts)",
        description:
          "Ataki bez broni i ataki broniami mnicha używają twojej cechy oraz kości k6; po wykonaniu akcji ataku możesz wykonać atak bez broni jako akcję bonusową.",
        level: 1,
      },
      {
        name: "Obrona bez pancerza (Unarmored Defense)",
        description:
          "Gdy nie nosisz pancerza, twój AC wynosi 10 + modyfikator Zręczności + modyfikator Mądrości.",
        level: 1,
      },
      {
        name: "Nieuzbrojony ruch (Unarmored Movement)",
        description:
          "Twoja szybkość rośnie o 10 stóp, gdy nie nosisz pancerza ani tarczy.",
        level: 2,
      },
      {
        name: "Ki (punkty skupienia, Focus Points)",
        description:
          "Zyskujesz punkty skupienia równe poziomowi mnicha; wydajesz je na techniki ki (np. Flurry of Blows, Step of the Wind) i odzyskujesz na krótkim odpoczynku.",
        level: 2,
      },
    ],
    subclasses: [
      {
        name: "Wojownik Cienia (Warrior of Shadow)",
        features: [
          {
            name: "Sztuki cienia (Shadow Arts)",
            level: 3,
            description:
              "Znasz zaklęcia Przywołanie cienia (Darkness), Wizja w ciemności (Darkvision), Wkradanie się (Pass without Trace) i Cisza (Silence); możesz je rzucać za punkty skupienia, a w swojej Przywołaniu cienia widzisz jak w jasnym świetle.",
          },
        ],
      },
    ],
  },
  {
    name: "Paladin",
    hitDie: 10,
    savingThrows: ["wisdom", "charisma"],
    features: [
      {
        name: "Nałożenie rąk (Lay on Hands)",
        description:
          "Masz pulę leczenia równą 5 × poziom paladyna; akcją możesz wyleczyć dotykając istotę, a 5 punktów z puli może usunąć chorobę lub truciznę.",
        level: 1,
      },
      {
        name: "Boski zmysł (Divine Sense)",
        description:
          "Akcją bonusową możesz wyczuć istoty niebiańskie, diaboliczne i nieumarłe w promieniu 60 stóp; użyć możesz tyle razy, ile wynosi twoja premia z biegłości.",
        level: 1,
      },
      {
        name: "Rzucanie zaklęć (Spellcasting)",
        description: "Rzucasz zaklęcia paladyna; twoim atrybutem rzucania jest Charyzma.",
        level: 2,
      },
      {
        name: "Styl walki (Fighting Style)",
        description: "Wybierasz styl walki, który daje ci stałą premię w walce.",
        level: 2,
      },
      {
        name: "Boskie uderzenie (Divine Smite)",
        description:
          "Gdy trafisz atakiem bronią, możesz wydać slot zaklęcia, aby zadać dodatkowe 2k8 obrażeń promienistych (rosnące za sloty wyższych poziomów).",
        level: 2,
      },
    ],
    subclasses: [
      {
        name: "Przysięga Oddania (Oath of Devotion)",
        features: [
          {
            name: "Kanał bóstwa: Święta broń (Sacred Weapon)",
            level: 3,
            description:
              "Akcją bonusową możesz na 1 minutę dodać modyfikator Charyzmy do ataków wykonywanych jedną bronią i sprawić, że jej ataki liczą się jako magiczne.",
          },
          {
            name: "Kanał bóstwa: Przeciw złu (Turn the Unholy)",
            level: 3,
            description:
              "Akcją możesz zmusić feje i nieumarłych w zasięgu 30 stóp do wykonania rzutu obronnego Mądrości lub ucieczki na 1 minutę.",
          },
        ],
      },
    ],
  },
  {
    name: "Ranger",
    hitDie: 10,
    savingThrows: ["strength", "dexterity"],
    features: [
      {
        name: "Ulubiony wróg (Favored Enemy)",
        description:
          "Wybierasz typ wroga; masz przewagę w testach tropienia go i przypominania sobie informacji o nim.",
        level: 1,
      },
      {
        name: "Styl walki (Fighting Style)",
        description: "Wybierasz styl walki, który daje ci stałą premię w walce.",
        level: 2,
      },
      {
        name: "Rzucanie zaklęć (Spellcasting)",
        description: "Rzucasz zaklęcia łowcy; twoim atrybutem rzucania jest Mądrość.",
        level: 2,
      },
    ],
    subclasses: [
      {
        name: "Łowca (Hunter)",
        features: [
          {
            name: "Łup łowcy (Hunter's Prey)",
            level: 3,
            description:
              "Wybierasz jedną z opcji: Zabójca kolosów (raz na turę +1k8 obrażeń zranionemu celowi), Pogromca hord (dodatkowy atak na inny cel w pobliżu) lub Zabójca olbrzymów (reakcją atak po trafieniu przez większą istotę).",
          },
        ],
      },
    ],
  },
  {
    name: "Rogue",
    hitDie: 8,
    savingThrows: ["dexterity", "intelligence"],
    features: [
      {
        name: "Ekspertyza (Expertise)",
        description:
          "Wybierasz dwie umiejętności, w których masz biegłość; w ich testach podwajasz premię z biegłości.",
        level: 1,
      },
      {
        name: "Cios w plecy (Sneak Attack)",
        description:
          "Raz na turę, gdy atakujesz z przewagą albo sojusznik stoi obok celu, zadajesz dodatkowe 1k6 obrażeń (kości rosną z poziomem).",
        level: 1,
      },
      {
        name: "Gwar zbirów (Thieves' Cant)",
        description:
          "Znasz tajny język złodziei oraz potrafisz zostawiać i rozumieć ukryte znaki.",
        level: 1,
      },
      {
        name: "Zwinna akcja (Cunning Action)",
        description:
          "Akcją bonusową możesz wykonać szarżę (Dash), wycofanie (Disengage) lub ukrycie się (Hide).",
        level: 2,
      },
    ],
    subclasses: [
      {
        name: "Złodziej (Thief)",
        features: [
          {
            name: "Zwinne ręce (Fast Hands)",
            level: 3,
            description:
              "Akcją bonusową możesz użyć przedmiotu, wykonać test Zręczności (np. kradzież kieszonkową) lub użyć narzędzi złodziejskich.",
          },
          {
            name: "Robota na wysokości (Second-Story Work)",
            level: 3,
            description:
              "Szarżowanie kosztuje cię tylko 5 stóp szybkości, a przy skoku z rozbiegu dodajesz modyfikator Zręczności do długości skoku.",
          },
        ],
      },
    ],
  },
  {
    name: "Sorcerer",
    hitDie: 6,
    savingThrows: ["constitution", "charisma"],
    features: [
      {
        name: "Rzucanie zaklęć (Spellcasting)",
        description: "Rzucasz zaklęcia czarnoksiężnika; twoim atrybutem rzucania jest Charyzma.",
        level: 1,
      },
      {
        name: "Wrodzona magia (Innate Sorcery)",
        description:
          "Raz na turę możesz dodać premię z biegłości do rzutu ataku zaklęciem lub ST zaklęcia, a przy koncentracji masz przewagę w rzutach obronnych o jej utrzymanie.",
        level: 1,
      },
      {
        name: "Źródło mocy (Font of Magic)",
        description:
          "Zyskujesz punkty czarów równe poziomowi czarnoksiężnika; możesz zamieniać je na sloty zaklęć i odwrotnie, a odzyskujesz je na długim odpoczynku.",
        level: 2,
      },
    ],
    subclasses: [
      {
        name: "Smocza magia (Draconic Sorcery)",
        features: [
          {
            name: "Smocza wytrzymałość (Draconic Resilience)",
            level: 3,
            description:
              "Gdy nie nosisz pancerza, twój AC wynosi 13 + modyfikator Zręczności, a twoje maksimum punktów życia rośnie o 1 za każdy poziom czarnoksiężnika.",
          },
        ],
      },
    ],
  },
  {
    name: "Warlock",
    hitDie: 8,
    savingThrows: ["wisdom", "charisma"],
    features: [
      {
        name: "Magia paktu (Pact Magic)",
        description:
          "Rzucasz zaklęcia z przydzielonych slotów; twoim atrybutem rzucania jest Charyzma, a wszystkie sloty odzyskujesz po krótkim lub długim odpoczynku.",
        level: 1,
      },
      {
        name: "Mistyczne przyzwania (Eldritch Invocations)",
        description:
          "Wybierasz przyzwania, które dają ci trwałe zdolności magiczne; ich liczba rośnie z poziomem.",
        level: 2,
      },
      {
        name: "Dar paktu (Pact Boon)",
        description:
          "Wybierasz dar paktu: broń paktu (pact weapon), familiera paktu, księgę cieni albo talizman paktu.",
        level: 3,
      },
    ],
    subclasses: [
      {
        name: "Piekielny (The Fiend)",
        features: [
          {
            name: "Piekielne błogosławieństwo (Dark One's Blessing)",
            level: 3,
            description:
              "Gdy pokonasz wroga, zyskujesz tymczasowe punkty życia równe modyfikatorowi Charyzmy + poziomowi czarownika.",
          },
        ],
      },
    ],
  },
  {
    name: "Wizard",
    hitDie: 6,
    savingThrows: ["intelligence", "wisdom"],
    features: [
      {
        name: "Rzucanie zaklęć (Spellcasting)",
        description: "Rzucasz zaklęcia czarodzieja; twoim atrybutem rzucania jest Inteligencja.",
        level: 1,
      },
      {
        name: "Odzyskanie magii (Arcane Recovery)",
        description:
          "Raz na długi odpoczynek, podczas krótkiego odpoczynku, możesz odzyskać sloty zaklęć o łącznym poziomie do połowy twojego poziomu (zaokrąglone w górę), bez slotów 6. poziomu i wyższych.",
        level: 1,
      },
    ],
    subclasses: [
      {
        name: "Zaklinacz (Evoker)",
        features: [
          {
            name: "Rzeźbienie zaklęć (Sculpt Spells)",
            level: 3,
            description:
              "Kiedy rzucasz zaklęcie obszarowe, możesz wybrać istoty, które automatycznie odniosą sukces w rzucie obronnym.",
          },
          {
            name: "Silna cantrip (Potent Cantrip)",
            level: 3,
            description:
              "Gdy istota zda rzut obronny przeciw twojemu cantripowi, nadal otrzymuje połowę obrażeń.",
          },
        ],
      },
    ],
  },
];

export function buildCharacterFeatures(character: {
  race: string;
  className: string;
  subclass?: string;
  level: number;
}): SheetFeature[] {
  const level = Math.max(1, character.level);
  const race = RACES.find((r) => r.name === character.race);
  const klass = CLASSES.find((c) => c.name === character.className);
  if (!race && !klass) return [];

  const features: SheetFeature[] = [...(race?.features ?? [])];
  for (const def of klass?.features ?? []) {
    if (def.level <= level) {
      features.push({
        name: def.name,
        description: def.description,
        level: def.level,
        category: "class",
      });
    }
  }
  const subclass = klass?.subclasses.find((s) => s.name === character.subclass);
  if (subclass) {
    for (const def of subclass.features) {
      if (level >= def.level) {
        features.push({
          name: def.name,
          description: def.description,
          level: def.level,
          category: "subclass",
        });
      }
    }
  }
  return features;
}

export function subclassesForClass(className: string): string[] {
  return CLASSES.find((c) => c.name === className)?.subclasses.map((s) => s.name) ?? [];
}

export function subclassNames(): Record<string, string[]> {
  return Object.fromEntries(CLASSES.map((c) => [c.name, c.subclasses.map((s) => s.name)]));
}

export function subclassLevelForClass(className: string): number | null {
  const klass = CLASSES.find((c) => c.name === className);
  if (!klass || klass.subclasses.length === 0) return null;
  return Math.min(...klass.subclasses.flatMap((s) => s.features.map((f) => f.level)));
}

export function subclassDetails(): Record<
  string,
  { name: string; features: { name: string; description: string }[] }[]
> {
  return Object.fromEntries(
    CLASSES.map((c) => [
      c.name,
      c.subclasses.map((s) => ({
        name: s.name,
        features: s.features.map((f) => ({ name: f.name, description: f.description })),
      })),
    ]),
  );
}
