import type { AbilityScore, SheetFeature, SkillName } from "@domino/shared";
import { BACKGROUNDS } from "./backgrounds.js";

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

const SKILL_LABEL_PL: Record<SkillName, string> = {
  acrobatics: "Akrobatyka",
  animalHandling: "Opieka nad zwierzętami",
  arcana: "Tajemnice",
  athletics: "Atletyka",
  deception: "Oszustwo",
  history: "Historia",
  insight: "Intuicja",
  intimidation: "Zastraszanie",
  investigation: "Śledztwo",
  medicine: "Medycyna",
  nature: "Natura",
  perception: "Percepcja",
  performance: "Występy",
  persuasion: "Perswazja",
  religion: "Religia",
  sleightOfHand: "Zwinne dłonie",
  stealth: "Skradanie",
  survival: "Przetrwanie",
};

function skillLabelPL(skill: SkillName): string {
  return SKILL_LABEL_PL[skill] ?? skill;
}

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
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 4,
      },
      {
        name: "Atak dodatkowy (Extra Attack)",
        description:
          "Zamiast raz możesz atakować dwa razy, gdy w swojej turze wykonujesz akcję Ataku.",
        level: 5,
      },
      {
        name: "Szybki ruch (Fast Movement)",
        description: "Twoja szybkość rośnie o 10 stóp, gdy nie nosisz ciężkiego pancerza.",
        level: 5,
      },
      {
        name: "Cecha ścieżki (Subclass Feature)",
        description: "Zyskujesz kolejną zdolność swojej podklasy (ścieżki).",
        level: 6,
      },
      {
        name: "Dziki instynkt (Feral Instinct)",
        description: "Masz przewagę w rzutach na inicjatywę.",
        level: 7,
      },
      {
        name: "Instynktowny skok (Instinctive Pounce)",
        description:
          "Jako część akcji bonusowej wejścia w szał możesz przesunąć się o połowę swojej szybkości.",
        level: 7,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 8,
      },
      {
        name: "Brutalne uderzenie (Brutal Strike)",
        description:
          "Gdy używasz Zuchwałego ataku, możesz zrezygnować z przewagi przy jednym ataku; przy trafieniu cel otrzymuje dodatkowe 1k10 obrażeń i jeden efekt Brutalnego uderzenia (np. odrzucenie).",
        level: 9,
      },
      {
        name: "Cecha ścieżki (Subclass Feature)",
        description: "Zyskujesz kolejną zdolność swojej podklasy (ścieżki).",
        level: 10,
      },
      {
        name: "Nieugięty szał (Relentless Rage)",
        description:
          "Gdy podczas szału spadniesz do 0 punktów życia, możesz wykonać rzut obronny Kondycji (ST 10), aby zamiast tego zostać przy 1 punkcie życia.",
        level: 11,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 12,
      },
      {
        name: "Ulepszone brutalne uderzenie (Improved Brutal Strike)",
        description:
          "Zyskujesz nowe opcje Brutalnego uderzenia, m.in. Zataczające ciosy (oszołomienie celu).",
        level: 13,
      },
      {
        name: "Cecha ścieżki (Subclass Feature)",
        description: "Zyskujesz kolejną zdolność swojej podklasy (ścieżki).",
        level: 14,
      },
      {
        name: "Nieustający szał (Persistent Rage)",
        description:
          "Gdy rzucasz na inicjatywę, możesz odzyskać wszystkie użycia Szału — raz na długi odpoczynek.",
        level: 15,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 16,
      },
      {
        name: "Ulepszone brutalne uderzenie (Improved Brutal Strike)",
        description:
          "Dodatkowe obrażenia Brutalnego uderzenia rosną do 2k10, a przy użyciu możesz zastosować dwa efekty naraz.",
        level: 17,
      },
      {
        name: "Niezwyciężona siła (Indomitable Might)",
        description:
          "Jeśli suma testu Siły lub rzutu obronnego Siły jest niższa niż twój wynik Siły, możesz użyć wyniku Siły w zamian.",
        level: 18,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 19,
      },
      {
        name: "Pierwotny mistrz (Primal Champion)",
        description: "Twoja Siła i Kondycja rosną o 4, maksymalnie do 25.",
        level: 20,
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
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 4,
      },
      {
        name: "Źródło inspiracji (Font of Inspiration)",
        description:
          "Odzyskujesz wszystkie użycia Inspiracji barda po krótkim lub długim odpoczynku, a wydając slot zaklęcia, możesz odzyskać jedno użycie. Twoja kość inspiracji rośnie do k8.",
        level: 5,
      },
      {
        name: "Cecha kolegium (Subclass Feature)",
        description: "Zyskujesz kolejną zdolność swojego kolegium bardów.",
        level: 6,
      },
      {
        name: "Kontrpieśń (Countercharm)",
        description:
          "Jeśli ty lub istota w zasięgu 30 stóp nie zdacie rzutu obronnego przeciw efektowi nakładającemu uroczenie lub przerażenie, możesz użyć reakcji, aby zmusić do ponownego rzutu.",
        level: 7,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 8,
      },
      {
        name: "Ekspertyza (Expertise)",
        description:
          "Wybierasz dwie umiejętności, w których masz biegłość, ale nie Ekspertyzę, i zyskujesz w nich Ekspertyzę.",
        level: 9,
      },
      {
        name: "Tajemnice magiczne (Magical Secrets)",
        description:
          "Gdy rośnie liczba przygotowanych zaklęć barda, możesz wybierać nowe zaklęcia także z list kapłana, druida i czarodzieja. Twoja kość inspiracji rośnie do k10.",
        level: 10,
      },
      {
        name: "Nowy krąg zaklęć (New Spell Circle)",
        description: "Uzyskujesz dostęp do zaklęć 6. kręgu wraz ze slotami tego kręgu.",
        level: 11,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 12,
      },
      {
        name: "Nowy krąg zaklęć (New Spell Circle)",
        description: "Uzyskujesz dostęp do zaklęć 7. kręgu wraz ze slotami tego kręgu.",
        level: 13,
      },
      {
        name: "Cecha kolegium (Subclass Feature)",
        description: "Zyskujesz kolejną zdolność swojego kolegium bardów.",
        level: 14,
      },
      {
        name: "Większa kość inspiracji (Bardic Inspiration, d12)",
        description: "Twoja kość Inspiracji barda rośnie do k12.",
        level: 15,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 16,
      },
      {
        name: "Nowy krąg zaklęć (New Spell Circle)",
        description: "Uzyskujesz dostęp do zaklęć 9. kręgu wraz ze slotami tego kręgu.",
        level: 17,
      },
      {
        name: "Wyższa inspiracja (Superior Inspiration)",
        description:
          "Gdy rzucasz na inicjatywę, odzyskujesz użycia Inspiracji barda do dwóch, jeśli masz ich mniej.",
        level: 18,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 19,
      },
      {
        name: "Słowa stworzenia (Words of Creation)",
        description:
          "Opanowujesz słowa życia i śmierci: zawsze masz przygotowane zaklęcia Power Word Heal i Power Word Kill, a rzucając je, możesz wskazać drugi cel w promieniu 10 stóp.",
        level: 20,
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
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 4,
      },
      {
        name: "Porażanie nieumarłych (Sear Undead)",
        description:
          "Gdy użyjesz Turn Undead, każdy nieumarły, który nie zda rzutu obronnego, otrzymuje promieniste obrażenia równe rzutowi kością k8 za każdy punkt modyfikatora Mądrości (min. 1k8).",
        level: 5,
      },
      {
        name: "Cecha domeny (Subclass Feature)",
        description: "Zyskujesz kolejną zdolność swojej domeny.",
        level: 6,
      },
      {
        name: "Kanał bóstwa (trzy użycia)",
        description: "Liczba użyć Kanału bóstwa między odpoczynkami rośnie do 3.",
        level: 6,
      },
      {
        name: "Błogosławione ciosy (Blessed Strikes)",
        description:
          "Boska moc przenika twoją walkę: wybierasz Boskie uderzenie (dodatkowe k8 obrażeń przy trafieniu bronią) albo Potężne zaklęcia (premia Mądrości do obrażeń cantripów kapłana).",
        level: 7,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 8,
      },
      {
        name: "Nowy krąg zaklęć (New Spell Circle)",
        description: "Uzyskujesz dostęp do zaklęć 5. kręgu wraz ze slotami tego kręgu.",
        level: 9,
      },
      {
        name: "Boska interwencja (Divine Intervention)",
        description:
          "Akcją magiczną możesz wezwać interwencję bóstwa i rzucić dowolne zaklęcie kapłana 5. kręgu lub niższego bez wydawania slotu — raz na długi odpoczynek.",
        level: 10,
      },
      {
        name: "Nowy krąg zaklęć (New Spell Circle)",
        description: "Uzyskujesz dostęp do zaklęć 6. kręgu wraz ze slotami tego kręgu.",
        level: 11,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 12,
      },
      {
        name: "Nowy krąg zaklęć (New Spell Circle)",
        description: "Uzyskujesz dostęp do zaklęć 7. kręgu wraz ze slotami tego kręgu.",
        level: 13,
      },
      {
        name: "Ulepszone błogosławione ciosy (Improved Blessed Strikes)",
        description:
          "Wybrana opcja Błogosławionych ciosów rośnie w siłę: Boskie uderzenie zadaje 2k8, a Potężne zaklęcia zyskują dodatkowy efekt.",
        level: 14,
      },
      {
        name: "Nowy krąg zaklęć (New Spell Circle)",
        description: "Uzyskujesz dostęp do zaklęć 8. kręgu wraz ze slotami tego kręgu.",
        level: 15,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 16,
      },
      {
        name: "Cecha domeny (Subclass Feature)",
        description: "Zyskujesz kolejną zdolność swojej domeny.",
        level: 17,
      },
      {
        name: "Kanał bóstwa (cztery użycia)",
        description: "Liczba użyć Kanału bóstwa między odpoczynkami rośnie do 4.",
        level: 18,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 19,
      },
      {
        name: "Większa boska interwencja (Greater Divine Intervention)",
        description:
          "Używając Boskiej interwencji, możesz wybrać zaklęcie Wish; jeśli to zrobisz, nie możesz ponownie użyć Boskiej interwencji, dopóki nie zakończysz 2k4 długich odpoczynków.",
        level: 20,
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
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 4,
      },
      {
        name: "Dzika odnowa (Wild Resurgence)",
        description:
          "Raz na turę, gdy nie masz użyć Dzikich kształtów, możesz odzyskać jedno użycie, wydając slot zaklęcia; możesz też wydać użycie Dzikich kształtów, aby odzyskać slot 1. kręgu.",
        level: 5,
      },
      {
        name: "Cecha kręgu (Subclass Feature)",
        description: "Zyskujesz kolejną zdolność swojego kręgu druidów.",
        level: 6,
      },
      {
        name: "Żywiołowa furia (Elemental Fury)",
        description:
          "Wybierasz Potężne zaklęcia (premia Mądrości do obrażeń cantripów druida) albo Pierwotne uderzenie (dodatkowe k8 obrażeń przy trafieniu atakiem).",
        level: 7,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 8,
      },
      {
        name: "Nowy krąg zaklęć (New Spell Circle)",
        description: "Uzyskujesz dostęp do zaklęć 5. kręgu wraz ze slotami tego kręgu.",
        level: 9,
      },
      {
        name: "Cecha kręgu (Subclass Feature)",
        description: "Zyskujesz kolejną zdolność swojego kręgu druidów.",
        level: 10,
      },
      {
        name: "Nowy krąg zaklęć (New Spell Circle)",
        description: "Uzyskujesz dostęp do zaklęć 6. kręgu wraz ze slotami tego kręgu.",
        level: 11,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 12,
      },
      {
        name: "Nowy krąg zaklęć (New Spell Circle)",
        description: "Uzyskujesz dostęp do zaklęć 7. kręgu wraz ze slotami tego kręgu.",
        level: 13,
      },
      {
        name: "Cecha kręgu (Subclass Feature)",
        description: "Zyskujesz kolejną zdolność swojego kręgu druidów.",
        level: 14,
      },
      {
        name: "Ulepszona żywiołowa furia (Improved Elemental Fury)",
        description:
          "Wybrana opcja Żywiołowej furii rośnie w siłę: zasięg cantripów wzrasta o 300 stóp albo Pierwotne uderzenie zadaje 2k8 obrażeń.",
        level: 15,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 16,
      },
      {
        name: "Nowy krąg zaklęć (New Spell Circle)",
        description: "Uzyskujesz dostęp do zaklęć 9. kręgu wraz ze slotami tego kręgu.",
        level: 17,
      },
      {
        name: "Zaklęcia bestii (Beast Spells)",
        description:
          "Podczas Dzikich kształtów możesz rzucać zaklęcia w formie bestii, z wyjątkiem zaklęć wymagających składnika materialnego o określonym koszcie lub go zużywających.",
        level: 18,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 19,
      },
      {
        name: "Arcydruid (Archdruid)",
        description:
          "Witalność natury stale w tobie kwitnie: gdy rzucasz na inicjatywę i nie masz użyć Dzikich kształtów, odzyskujesz jedno z nich.",
        level: 20,
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
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 4,
      },
      {
        name: "Atak dodatkowy (Extra Attack)",
        description:
          "Zamiast raz możesz atakować dwa razy, gdy w swojej turze wykonujesz akcję Ataku.",
        level: 5,
      },
      {
        name: "Taktyczna zmiana (Tactical Shift)",
        description:
          "Gdy akcją bonusową używasz Drugiego oddechu, możesz przesunąć się o połowę swojej szybkości, nie prowokując ataków okazyjnych.",
        level: 5,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 6,
      },
      {
        name: "Cecha podklasy (Subclass Feature)",
        description: "Zyskujesz kolejną zdolność swojej podklasy wojownika.",
        level: 7,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 8,
      },
      {
        name: "Niezłomność (Indomitable)",
        description:
          "Gdy nie zdasz rzutu obronnego, możesz powtórzyć go z premią równą twojemu poziomowi wojownika — raz na długi odpoczynek.",
        level: 9,
      },
      {
        name: "Mistrz taktyki (Tactical Master)",
        description:
          "Atakując bronią, której właściwość mistrzostwa znasz, możesz na czas ataku zastąpić ją właściwością Push, Sap lub Slow.",
        level: 9,
      },
      {
        name: "Cecha podklasy (Subclass Feature)",
        description: "Zyskujesz kolejną zdolność swojej podklasy wojownika.",
        level: 10,
      },
      {
        name: "Dwa ataki dodatkowe (Two Extra Attacks)",
        description:
          "Zamiast raz możesz atakować trzy razy, gdy w swojej turze wykonujesz akcję Ataku.",
        level: 11,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 12,
      },
      {
        name: "Niezłomność (dwa użycia)",
        description: "Liczba użyć Niezłomności między długimi odpoczynkami rośnie do 2.",
        level: 13,
      },
      {
        name: "Przestudiowane ataki (Studied Attacks)",
        description:
          "Gdy chybisz atakiem, masz przewagę w następnym rzucie ataku przeciw temu samemu celowi przed końcem twojej następnej tury.",
        level: 13,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 14,
      },
      {
        name: "Cecha podklasy (Subclass Feature)",
        description: "Zyskujesz kolejną zdolność swojej podklasy wojownika.",
        level: 15,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 16,
      },
      {
        name: "Przypływ akcji (dwa użycia)",
        description: "Liczba użyć Przypływu akcji między odpoczynkami rośnie do 2.",
        level: 17,
      },
      {
        name: "Niezłomność (trzy użycia)",
        description: "Liczba użyć Niezłomności między długimi odpoczynkami rośnie do 3.",
        level: 17,
      },
      {
        name: "Cecha podklasy (Subclass Feature)",
        description: "Zyskujesz kolejną zdolność swojej podklasy wojownika.",
        level: 18,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 19,
      },
      {
        name: "Trzy ataki dodatkowe (Three Extra Attacks)",
        description:
          "Zamiast raz możesz atakować cztery razy, gdy w swojej turze wykonujesz akcję Ataku.",
        level: 20,
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
        name: "Zręczne ataki (Dexterous Attacks)",
        description:
          "W atakach bez broni i broniami mnicha używasz modyfikatora Zręczności zamiast Siły do rzutów na atak i obrażenia. Bronie mnicha: proste bronie do walki wręcz oraz wojskowe bronie do walki wręcz z cechą Lekka. Ponadto przy Chwycie lub Odepchnięciu atakiem bez broni możesz użyć Zręczności do ST rzutu obronnego.",
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
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 4,
      },
      {
        name: "Powolne opadanie (Slow Fall)",
        description:
          "Gdy upadasz, możesz użyć reakcji, aby zmniejszyć obrażenia od upadku o pięć razy twój poziom mnicha.",
        level: 4,
      },
      {
        name: "Atak dodatkowy (Extra Attack)",
        description:
          "Zamiast raz możesz atakować dwa razy, gdy w swojej turze wykonujesz akcję Ataku.",
        level: 5,
      },
      {
        name: "Oszałamiające uderzenie (Stunning Strike)",
        description:
          "Raz na turę, gdy trafisz bronią mnicha lub atakiem bez broni, możesz wydać 1 punkt skupienia, aby cel wykonał rzut obronny Kondycji lub został oszołomiony do końca twojej następnej tury.",
        level: 5,
      },
      {
        name: "Większa kość skupienia (Focus Points, d8)",
        description: "Twoja kość punktów skupienia rośnie do k8.",
        level: 5,
      },
      {
        name: "Umacniające uderzenia (Empowered Strikes)",
        description:
          "Twoje ataki bez broni mogą zadawać obrażenia siłowe zamiast zwykłego typu obrażeń.",
        level: 6,
      },
      {
        name: "Cecha podklasy (Subclass Feature)",
        description: "Zyskujesz kolejną zdolność swojej podklasy mnicha.",
        level: 6,
      },
      {
        name: "Unikanie (Evasion)",
        description:
          "Gdy efekt wymaga od ciebie rzutu obronnego Zręczności, przy sukcesie nie otrzymujesz obrażeń, a przy porażce — połowę.",
        level: 7,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 8,
      },
      {
        name: "Akrobatyczny ruch (Acrobatic Movement)",
        description:
          "Podczas swojej tury możesz przemieszczać się po pionowych powierzchniach i ponad cieczami, nie upadając w trakcie ruchu.",
        level: 9,
      },
      {
        name: "Wyostrzona koncentracja (Heightened Focus)",
        description:
          "Twoje techniki Flurry of Blows, Patient Defense i Step of the Wind zyskują dodatkowe efekty — np. Flurry of Blows może oznaczać trzy ataki bez broni.",
        level: 10,
      },
      {
        name: "Samouzdrawianie (Self-Restoration)",
        description:
          "Na końcu każdej swojej tury możesz usunąć z siebie jeden ze stanów: uroczenie, przerażenie lub zatrucie.",
        level: 10,
      },
      {
        name: "Cecha podklasy (Subclass Feature)",
        description: "Zyskujesz kolejną zdolność swojej podklasy mnicha.",
        level: 11,
      },
      {
        name: "Większa kość skupienia (Focus Points, d10)",
        description: "Twoja kość punktów skupienia rośnie do k10.",
        level: 11,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 12,
      },
      {
        name: "Odparcie energii (Deflect Energy)",
        description:
          "Twoja zdolność Odparcia ataków działa przeciw obrażeniom wszelkich typów, nie tylko obuchowym, ciętym i przebijającym.",
        level: 13,
      },
      {
        name: "Zdyscyplinowany ocalały (Disciplined Survivor)",
        description:
          "Zyskujesz biegłość we wszystkich rzutach obronnych; gdy nie zdasz rzutu obronnego, możesz wydać 1 punkt skupienia, aby powtórzyć go.",
        level: 14,
      },
      {
        name: "Doskonałe skupienie (Perfect Focus)",
        description:
          "Gdy rzucasz na inicjatywę, odzyskujesz punkty skupienia do czterech, jeśli masz ich trzy lub mniej.",
        level: 15,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 16,
      },
      {
        name: "Cecha podklasy (Subclass Feature)",
        description: "Zyskujesz kolejną zdolność swojej podklasy mnicha.",
        level: 17,
      },
      {
        name: "Większa kość skupienia (Focus Points, d12)",
        description: "Twoja kość punktów skupienia rośnie do k12.",
        level: 17,
      },
      {
        name: "Wyższa obrona (Superior Defense)",
        description:
          "Na początku swojej tury możesz wydać 3 punkty skupienia, aby na 1 minutę uzyskać odporność na wszystkie obrażenia oprócz siłowych.",
        level: 18,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 19,
      },
      {
        name: "Ciało i umysł (Body and Mind)",
        description: "Twoja Zręczność i Mądrość rosną o 4, maksymalnie do 25.",
        level: 20,
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
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 4,
      },
      {
        name: "Atak dodatkowy (Extra Attack)",
        description:
          "Zamiast raz możesz atakować dwa razy, gdy w swojej turze wykonujesz akcję Ataku.",
        level: 5,
      },
      {
        name: "Wierny wierzchowiec (Faithful Steed)",
        description:
          "Zawsze masz przygotowane zaklęcie Find Steed i możesz je rzucić raz bez wydawania slotu; tę zdolność odzyskujesz po długim odpoczynku.",
        level: 5,
      },
      {
        name: "Aura ochrony (Aura of Protection)",
        description:
          "Ty i sojusznicy w promieniu 10 stóp dodajecie modyfikator Charyzmy (min. +1) do wszystkich rzutów obronnych.",
        level: 6,
      },
      {
        name: "Cecha przysięgi (Subclass Feature)",
        description: "Zyskujesz kolejną zdolność swojej przysięgi paladyna.",
        level: 7,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 8,
      },
      {
        name: "Odpędzanie wrogów (Abjure Foes)",
        description:
          "Akcją magiczną możesz wydać użycie Kanału bóstwa, aby istoty w zasięgu 30 stóp wykonały rzut obronny Mądrości lub zostały przerażone i nie mogły się do ciebie zbliżyć.",
        level: 9,
      },
      {
        name: "Aura odwagi (Aura of Courage)",
        description:
          "Ty i sojusznicy w obrębie twojej Aury ochrony jesteście odporni na przerażenie (immunity).",
        level: 10,
      },
      {
        name: "Promienne ciosy (Radiant Strikes)",
        description:
          "Gdy trafisz atakiem bronią białą lub atakiem bez broni, cel otrzymuje dodatkowe 1k8 obrażeń promienistych.",
        level: 11,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 12,
      },
      {
        name: "Nowy krąg zaklęć (New Spell Circle)",
        description: "Uzyskujesz dostęp do zaklęć 4. kręgu wraz ze slotami tego kręgu.",
        level: 13,
      },
      {
        name: "Uzdrawiający dotyk (Restoring Touch)",
        description:
          "Używając Nałożenia rąk, możesz usunąć z istoty jeden lub więcej stanów: oślepienie, uroczenie, ogłuszenie, przerażenie, porażenie lub obezwładnienie.",
        level: 14,
      },
      {
        name: "Cecha przysięgi (Subclass Feature)",
        description: "Zyskujesz kolejną zdolność swojej przysięgi paladyna.",
        level: 15,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 16,
      },
      {
        name: "Nowy krąg zaklęć (New Spell Circle)",
        description: "Uzyskujesz dostęp do zaklęć 5. kręgu wraz ze slotami tego kręgu.",
        level: 17,
      },
      {
        name: "Rozszerzona aura (Aura Expansion)",
        description: "Zasięg twojej Aury ochrony rośnie do 30 stóp.",
        level: 18,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 19,
      },
      {
        name: "Cecha przysięgi (Subclass Feature)",
        description: "Zyskujesz kolejną zdolność swojej przysięgi paladyna.",
        level: 20,
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
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 4,
      },
      {
        name: "Atak dodatkowy (Extra Attack)",
        description:
          "Zamiast raz możesz atakować dwa razy, gdy w swojej turze wykonujesz akcję Ataku.",
        level: 5,
      },
      {
        name: "Wędrówka (Roving)",
        description:
          "Twoja szybkość rośnie o 10 stóp, gdy nie nosisz ciężkiego pancerza; masz też szybkość wspinaczki i pływania równą twojej szybkości.",
        level: 6,
      },
      {
        name: "Cecha podklasy (Subclass Feature)",
        description: "Zyskujesz kolejną zdolność swojej podklasy łowcy.",
        level: 7,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 8,
      },
      {
        name: "Ekspertyza (Expertise)",
        description:
          "Wybierasz dwie umiejętności, w których masz biegłość, ale nie Ekspertyzę, i zyskujesz w nich Ekspertyzę.",
        level: 9,
      },
      {
        name: "Niestrudzony (Tireless)",
        description:
          "Akcją magiczną możesz zyskać tymczasowe punkty życia równe 1k8 + modyfikator Mądrości; podczas krótkiego odpoczynku możesz też usuwać poziomy wyczerpania.",
        level: 10,
      },
      {
        name: "Cecha podklasy (Subclass Feature)",
        description: "Zyskujesz kolejną zdolność swojej podklasy łowcy.",
        level: 11,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 12,
      },
      {
        name: "Nieustępliwy łowca (Relentless Hunter)",
        description:
          "Otrzymanie obrażeń nie przerywa twojej koncentracji na zaklęciu Hunter's Mark.",
        level: 13,
      },
      {
        name: "Zasłona natury (Nature's Veil)",
        description:
          "Akcją bonusową możesz stać się niewidzialny do końca swojej następnej tury; możesz to zrobić tyle razy, ile wynosi twoja premia z biegłości, i odzyskujesz użycia po długim odpoczynku.",
        level: 14,
      },
      {
        name: "Cecha podklasy (Subclass Feature)",
        description: "Zyskujesz kolejną zdolność swojej podklasy łowcy.",
        level: 15,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 16,
      },
      {
        name: "Precyzyjny łowca (Precise Hunter)",
        description:
          "Masz przewagę w rzutach ataku przeciw istocie oznaczonej twoim zaklęciem Hunter's Mark.",
        level: 17,
      },
      {
        name: "Dzikie zmysły (Feral Senses)",
        description: "Zyskujesz widzenie w ciemności (blindsight) w promieniu 30 stóp.",
        level: 18,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 19,
      },
      {
        name: "Pogromca wrogów (Foe Slayer)",
        description: "Kość obrażeń twojego zaklęcia Hunter's Mark rośnie do k10.",
        level: 20,
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
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 4,
      },
      {
        name: "Cios specjalny (Cunning Strike)",
        description:
          "Zadając obrażenia Ciosu w plecy, możesz zrezygnować z części kości obrażeń, aby dodać efekt, np. wytrącenie broni albo spowolnienie celu. Twój Cios w plecy rośnie do 3k6.",
        level: 5,
      },
      {
        name: "Nadludzki refleks (Uncanny Dodge)",
        description:
          "Gdy atakujący, którego widzisz, trafi cię rzutem ataku, możesz użyć reakcji, aby zmniejszyć obrażenia o połowę.",
        level: 5,
      },
      {
        name: "Ekspertyza (Expertise)",
        description:
          "Wybierasz dwie umiejętności, w których masz biegłość, i zyskujesz w nich Ekspertyzę (podwójna premia z biegłości).",
        level: 6,
      },
      {
        name: "Unikanie (Evasion)",
        description:
          "Gdy efekt wymaga od ciebie rzutu obronnego Zręczności, przy sukcesie nie otrzymujesz obrażeń, a przy porażce — połowę.",
        level: 7,
      },
      {
        name: "Niezawodny talent (Reliable Talent)",
        description:
          "Gdy wykonujesz test umiejętności z biegłością, wynik k20 równy 9 lub niższy liczysz jako 10.",
        level: 7,
      },
      {
        name: "Cios w plecy 4k6 (Sneak Attack, 4d6)",
        description: "Twoja kość Ciosu w plecy rośnie do 4k6.",
        level: 7,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 8,
      },
      {
        name: "Cecha podklasy (Subclass Feature)",
        description: "Zyskujesz kolejną zdolność swojej podklasy łotrzyka.",
        level: 9,
      },
      {
        name: "Cios w plecy 5k6 (Sneak Attack, 5d6)",
        description: "Twoja kość Ciosu w plecy rośnie do 5k6.",
        level: 9,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 10,
      },
      {
        name: "Ulepszony cios specjalny (Improved Cunning Strike)",
        description:
          "Zadając obrażenia Ciosu w plecy, możesz użyć dwóch efektów Ciosu specjalnego naraz, płacąc koszt w kościach za każdy. Twój Cios w plecy rośnie do 6k6.",
        level: 11,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 12,
      },
      {
        name: "Cecha podklasy (Subclass Feature)",
        description: "Zyskujesz kolejną zdolność swojej podklasy łotrzyka.",
        level: 13,
      },
      {
        name: "Cios w plecy 7k6 (Sneak Attack, 7d6)",
        description: "Twoja kość Ciosu w plecy rośnie do 7k6.",
        level: 13,
      },
      {
        name: "Złoczyńcze ciosy (Devious Strikes)",
        description:
          "Zyskujesz nowe opcje Ciosu specjalnego, m.in. oszołomienie (Daze) i powalenie, dostępne za odpowiedni koszt kości.",
        level: 14,
      },
      {
        name: "Śliski umysł (Slippery Mind)",
        description:
          "Zyskujesz biegłość w rzutach obronnych Mądrości i Charyzmy. Twój Cios w plecy rośnie do 8k6.",
        level: 15,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 16,
      },
      {
        name: "Cecha podklasy (Subclass Feature)",
        description: "Zyskujesz kolejną zdolność swojej podklasy łotrzyka.",
        level: 17,
      },
      {
        name: "Cios w plecy 9k6 (Sneak Attack, 9d6)",
        description: "Twoja kość Ciosu w plecy rośnie do 9k6.",
        level: 17,
      },
      {
        name: "Nieuchwytny (Elusive)",
        description:
          "Żaden rzut ataku nie może mieć przewagi przeciw tobie, chyba że jesteś obezwładniony.",
        level: 18,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 19,
      },
      {
        name: "Traf szczęścia (Stroke of Luck)",
        description:
          "Jeśli nie zdasz testu k20, możesz zamienić wynik rzutu na 20 — raz na krótki lub długi odpoczynek.",
        level: 20,
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
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 4,
      },
      {
        name: "Czarodziejska odnowa (Sorcerous Restoration)",
        description:
          "Po krótkim odpoczynku możesz odzyskać wydane punkty czarów w liczbie do połowy twojego poziomu (zaokrąglonej w dół) — raz na długi odpoczynek.",
        level: 5,
      },
      {
        name: "Cecha pochodzenia (Subclass Feature)",
        description: "Zyskujesz kolejną zdolność swojego smoczego pochodzenia.",
        level: 6,
      },
      {
        name: "Ucieleśniona czarowność (Sorcery Incarnate)",
        description:
          "Gdy nie masz użyć Wrodzonej magii, możesz ją aktywować, wydając 2 punkty czarów; podczas jej trwania możesz użyć do dwóch opcji Metamagii na jedno zaklęcie.",
        level: 7,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 8,
      },
      {
        name: "Nowy krąg zaklęć (New Spell Circle)",
        description: "Uzyskujesz dostęp do zaklęć 5. kręgu wraz ze slotami tego kręgu.",
        level: 9,
      },
      {
        name: "Metamagia (Metamagic)",
        description:
          "Wybierasz dwie opcje Metamagii, np. Podwójne zaklęcie albo Wzmocnione zaklęcie, które możesz stosować za punkty czarów.",
        level: 10,
      },
      {
        name: "Nowy krąg zaklęć (New Spell Circle)",
        description: "Uzyskujesz dostęp do zaklęć 6. kręgu wraz ze slotami tego kręgu.",
        level: 11,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 12,
      },
      {
        name: "Nowy krąg zaklęć (New Spell Circle)",
        description: "Uzyskujesz dostęp do zaklęć 7. kręgu wraz ze slotami tego kręgu.",
        level: 13,
      },
      {
        name: "Cecha pochodzenia (Subclass Feature)",
        description: "Zyskujesz kolejną zdolność swojego smoczego pochodzenia.",
        level: 14,
      },
      {
        name: "Nowy krąg zaklęć (New Spell Circle)",
        description: "Uzyskujesz dostęp do zaklęć 8. kręgu wraz ze slotami tego kręgu.",
        level: 15,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 16,
      },
      {
        name: "Metamagia (Metamagic)",
        description: "Wybierasz dodatkową opcję Metamagii.",
        level: 17,
      },
      {
        name: "Cecha pochodzenia (Subclass Feature)",
        description: "Zyskujesz kolejną zdolność swojego smoczego pochodzenia.",
        level: 18,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 19,
      },
      {
        name: "Arcymagiczna apoteoza (Arcane Apotheosis)",
        description:
          "Podczas trwania Wrodzonej magii możesz raz na turę użyć opcji Metamagii bez wydawania punktów czarów.",
        level: 20,
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
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 4,
      },
      {
        name: "Nowe przyzwania (Eldritch Invocations)",
        description: "Liczba znanych ci przyzwań rośnie do 5 — wybierasz dodatkowe przyzwanie.",
        level: 5,
      },
      {
        name: "Cecha patrona (Subclass Feature)",
        description: "Zyskujesz kolejną zdolność swojego patrona.",
        level: 6,
      },
      {
        name: "Nowe przyzwania (Eldritch Invocations)",
        description: "Liczba znanych ci przyzwań rośnie do 6.",
        level: 7,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 8,
      },
      {
        name: "Kontakt z patronem (Contact Patron)",
        description:
          "Zawsze masz przygotowane zaklęcie Contact Other Plane i możesz je rzucić bez wydawania slotu, aby skontaktować się bezpośrednio ze swoim patronem.",
        level: 9,
      },
      {
        name: "Cecha patrona (Subclass Feature)",
        description: "Zyskujesz kolejną zdolność swojego patrona.",
        level: 10,
      },
      {
        name: "Mistyczne arkanum (Mystic Arcanum)",
        description:
          "Patron obdarza cię arkanum: wybierasz zaklęcie czarownika 6. kręgu, które możesz rzucić raz bez wydawania slotu na długi odpoczynek.",
        level: 11,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 12,
      },
      {
        name: "Mistyczne arkanum (Mystic Arcanum)",
        description: "Wybierasz zaklęcie czarownika 7. kręgu jako kolejne arkanum.",
        level: 13,
      },
      {
        name: "Cecha patrona (Subclass Feature)",
        description: "Zyskujesz kolejną zdolność swojego patrona.",
        level: 14,
      },
      {
        name: "Mistyczne arkanum (Mystic Arcanum)",
        description: "Wybierasz zaklęcie czarownika 8. kręgu jako kolejne arkanum.",
        level: 15,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 16,
      },
      {
        name: "Mistyczne arkanum (Mystic Arcanum)",
        description: "Wybierasz zaklęcie czarownika 9. kręgu jako ostatnie arkanum.",
        level: 17,
      },
      {
        name: "Nowe przyzwania (Eldritch Invocations)",
        description: "Liczba znanych ci przyzwań rośnie do 10.",
        level: 18,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 19,
      },
      {
        name: "Mistrz paktu (Eldritch Master)",
        description:
          "Gdy używasz Magicznej przebiegłości, odzyskujesz wszystkie wydane sloty Magii paktu.",
        level: 20,
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
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 4,
      },
      {
        name: "Zapamiętanie zaklęcia (Memorize Spell)",
        description:
          "Po krótkim odpoczynku możesz przestudiować księgę zaklęć i zastąpić jedno przygotowane zaklęcie czarodzieja innym zaklęciem z księgi.",
        level: 5,
      },
      {
        name: "Cecha szkoły (Subclass Feature)",
        description: "Zyskujesz kolejną zdolność swojej szkoły magii.",
        level: 6,
      },
      {
        name: "Nowy krąg zaklęć (New Spell Circle)",
        description: "Uzyskujesz dostęp do zaklęć 4. kręgu wraz ze slotami tego kręgu.",
        level: 7,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 8,
      },
      {
        name: "Nowy krąg zaklęć (New Spell Circle)",
        description: "Uzyskujesz dostęp do zaklęć 5. kręgu wraz ze slotami tego kręgu.",
        level: 9,
      },
      {
        name: "Cecha szkoły (Subclass Feature)",
        description: "Zyskujesz kolejną zdolność swojej szkoły magii.",
        level: 10,
      },
      {
        name: "Nowy krąg zaklęć (New Spell Circle)",
        description: "Uzyskujesz dostęp do zaklęć 6. kręgu wraz ze slotami tego kręgu.",
        level: 11,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 12,
      },
      {
        name: "Nowy krąg zaklęć (New Spell Circle)",
        description: "Uzyskujesz dostęp do zaklęć 7. kręgu wraz ze slotami tego kręgu.",
        level: 13,
      },
      {
        name: "Cecha szkoły (Subclass Feature)",
        description: "Zyskujesz kolejną zdolność swojej szkoły magii.",
        level: 14,
      },
      {
        name: "Nowy krąg zaklęć (New Spell Circle)",
        description: "Uzyskujesz dostęp do zaklęć 8. kręgu wraz ze slotami tego kręgu.",
        level: 15,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 16,
      },
      {
        name: "Nowy krąg zaklęć (New Spell Circle)",
        description: "Uzyskujesz dostęp do zaklęć 9. kręgu wraz ze slotami tego kręgu.",
        level: 17,
      },
      {
        name: "Mistrzostwo zaklęć (Spell Mastery)",
        description:
          "Wybierasz zaklęcie 1. i 2. kręgu z księgi z czasem rzucania równym akcji: masz je zawsze przygotowane i rzucasz je bez wydawania slotów.",
        level: 18,
      },
      {
        name: "Poprawa cech (ASI)",
        description:
          "Zwiększ jedną cechę o 2 albo dwie o 1 (maks. 20) lub wybierz feat zamiast poprawy.",
        level: 19,
      },
      {
        name: "Zaklęcia sygnaturowe (Signature Spells)",
        description:
          "Wybierasz dwa zaklęcia 3. kręgu z księgi: zawsze masz je przygotowane i możesz rzucić każde z nich raz bez wydawania slotu na długi odpoczynek.",
        level: 20,
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

export type FeatDef = {
  name: string;
  label: string;
  description: string;
  abilityBonus?: (keyof AbilityScore)[];
};

export const FEATS: FeatDef[] = [
  {
    name: "Alert",
    label: "Czujność",
    description:
      "Dodajesz premię z biegłości do rzutów na inicjatywę; po rzucie na inicjatywę możesz zamienić się inicjatywą z jednym chętnym sojusznikiem.",
  },
  {
    name: "Athlete",
    label: "Atleta",
    description:
      "Wspinaczka i wstawanie z pozycji leżącej kosztują mniej ruchu, a skoki są dłuższe. Zwiększasz Siłę lub Zręczność o 1.",
    abilityBonus: ["strength", "dexterity"],
  },
  {
    name: "Charger",
    label: "Szarżant",
    description:
      "Gdy w swojej turze szarżujesz co najmniej 10 stóp, możesz atakować z premia do obrażeń albo popchnąć cel przy trafieniu.",
  },
  {
    name: "Crafter",
    label: "Rzemieślnik",
    description:
      "Biegłość w narzędziach rzemieślnika pozwala ci tworzyć przedmioty; podczas długiego odpoczynku możesz wyprodukować do pięciu przedmiotów za połowę ceny.",
  },
  {
    name: "Crossbow Expert",
    label: "Ekspert kuszy",
    description:
      "Ignorujesz właściwość Przeładowanie kusz i nie masz utrudnienia przy atakach z kuszy w zwarciu; ataki kuszą nie prowokują ataków okazyjnych.",
  },
  {
    name: "Defense",
    label: "Obrona",
    description:
      "Niosąc lekki, średni lub ciężki pancerz, zyskujesz premię +1 do klasy pancerza.",
  },
  {
    name: "Dual Wielder",
    label: "Podwójna broń",
    description:
      "Zyskujesz +1 do klasy pancerza, gdy walczysz dwiema broniami, i możesz dobierać bronie lekkie bez kosztowania akcji.",
  },
  {
    name: "Dungeon Delver",
    label: "Znawca lochów",
    description:
      "Masz przewagę w testach poszukiwania pułapek i zrozumienia ich działania, a obrażenia od pułapek zmniejszasz o połowę przy porażce w rzucie obronnym.",
  },
  {
    name: "Durable",
    label: "Wytrzymały",
    description:
      "Podczas krótkiego odpoczynku odzyskujesz punkty życia w liczbie co najmniej dwa razy większej niż modyfikator Kondycji. Zwiększasz Kondycję o 1.",
    abilityBonus: ["constitution"],
  },
  {
    name: "Elemental Adept",
    label: "Adept żywiołów",
    description:
      "Wybierasz typ obrażeń żywiołowych; twoje zaklęcia tego typu ignorują odporność, a rzuty na obrażenia minimum 1 traktujesz jak 2.",
  },
  {
    name: "Fey Touched",
    label: "Dotknięty fejami",
    description:
      "Znasz zaklęcia Misty Step i jedno zaklęcie 1. kręgu z listy Iluzji lub Wróżbiarstwa; możesz rzucić je bez wydawania slotu raz na długi odpoczynek. Zwiększasz Inteligencję, Mądrość lub Charyzmę o 1.",
    abilityBonus: ["intelligence", "wisdom", "charisma"],
  },
  {
    name: "Grappler",
    label: "Zapaśnik",
    description:
      "Masz przewagę w rzutach ataku przeciw istocie, którą chwytasz; możesz obalić złapaną istotę, gdy poruszasz się z nią. Zwiększasz Siłę lub Zręczność o 1.",
    abilityBonus: ["strength", "dexterity"],
  },
  {
    name: "Great Weapon Master",
    label: "Mistrz wielkiej broni",
    description:
      "Gdy trafisz krytycznie albo pokonasz wroga ciężką bronią, możesz wykonać dodatkowy atak; możesz też przyjąć utrudnienie -5 do ataku za +10 do obrażeń.",
  },
  {
    name: "Healer",
    label: "Medyk",
    description:
      "Użycie zestawu medycznego akcją przywraca istocie 1k6 + 4 + jej maksymalną liczbę kości wytrzymałości punktów życia, raz na krótki odpoczynek.",
  },
  {
    name: "Heavily Armored",
    label: "Biegłość w ciężkich pancerzach",
    description:
      "Zyskujesz biegłość w ciężkich pancerzach. Zwiększasz Siłę o 1.",
    abilityBonus: ["strength"],
  },
  {
    name: "Heavy Armor Master",
    label: "Mistrz ciężkich pancerzy",
    description:
      "Nosząc ciężki pancerz, zmniejszasz obrażenia od obuchów, cięć i przebić o premię z biegłości. Zwiększasz Siłę o 1.",
    abilityBonus: ["strength"],
  },
  {
    name: "Inspiring Leader",
    label: "Inspirujący przywódca",
    description:
      "Po krótkim lub długim odpoczynku możesz wygłosić przemowę, dając do sześciu sojusznikom tymczasowe punkty życia równe poziomowi + modyfikator Charyzmy.",
  },
  {
    name: "Keen Mind",
    label: "Bystry umysł",
    description:
      "Zapamiętujesz wszystko, co widziałeś przez ostatni miesiąc, a orientacja w przestrzeni i czasie jest dla ciebie niezawodna. Zwiększasz Inteligencję o 1.",
    abilityBonus: ["intelligence"],
  },
  {
    name: "Lightly Armored",
    label: "Lekki pancerz",
    description:
      "Zyskujesz biegłość w lekkich pancerzach. Zwiększasz Siłę lub Zręczność o 1.",
    abilityBonus: ["strength", "dexterity"],
  },
  {
    name: "Linguist",
    label: "Lingwista",
    description:
      "Uczysz się trzech języków i potrafisz tworzyć proste kody, które mogą odczytać tylko wtajemniczeni. Zwiększasz Inteligencję o 1.",
    abilityBonus: ["intelligence"],
  },
  {
    name: "Lucky",
    label: "Szczęściarz",
    description:
      "Masz trzy punkty szczęścia na długi odpoczynek: wydając jeden, możesz powtórzyć test k20 albo zmienić rzut ataku wymierzony w ciebie.",
  },
  {
    name: "Mage Slayer",
    label: "Pogromca magów",
    description:
      "Masz przewagę w rzutach obronnych przeciw zaklęciom, a gdy istota w zasięgu 5 stóp rzuca zaklęcie, możesz zaatakować ją reakcją.",
  },
  {
    name: "Magic Initiate",
    label: "Inicjacja magiczna",
    description:
      "Uczysz się dwóch cantripów z listy kapłana, druida lub czarodzieja oraz jednego zaklęcia 1. kręgu z tej samej listy, które możesz rzucić raz bez slotu na długi odpoczynek.",
  },
  {
    name: "Martial Adept",
    label: "Adept sztuk walki",
    description:
      "Uczysz się dwóch manewrów z zestawu mistrza wojennego oraz jednej kości walki k6, którą odzyskujesz na krótkim odpoczynku.",
  },
  {
    name: "Savage Attacker",
    label: "Dzikie uderzenie",
    description:
      "Raz na turę, gdy trafisz bronią, możesz rzucić kośćmi obrażeń broni dwukrotnie i użyć wyższego wyniku.",
  },
  {
    name: "Medium Armor Master",
    label: "Mistrz średnich pancerzy",
    description:
      "Nosisz średnie pancerze, nie mając utrudnienia w testach Zręczności, a ich modyfikator Zręczności do AC wynosi maksymalnie 3. Zwiększasz Siłę lub Zręczność o 1.",
    abilityBonus: ["strength", "dexterity"],
  },
  {
    name: "Mobile",
    label: "Mobilność",
    description:
      "Twoja szybkość rośnie o 10 stóp, a po ataku wręcz możesz oddalić się bez prowokowania ataku okazyjnego.",
  },
  {
    name: "Moderately Armored",
    label: "Średni pancerz",
    description:
      "Zyskujesz biegłość w średnich pancerzach i tarczach. Zwiększasz Siłę lub Zręczność o 1.",
    abilityBonus: ["strength", "dexterity"],
  },
  {
    name: "Mounted Combatant",
    label: "Jeździec bojowy",
    description:
      "Masz przewagę w atakach wręcz przeciw istotom mniejszym od twojego wierzchowca; możesz też zmusić atak wymierzony w wierzchowca, by trafił ciebie.",
  },
  {
    name: "Observant",
    label: "Spostrzegawczy",
    description:
      "Zyskujesz biegłość w Percepcji i Zbadaniu albo Ekspertyzę w jednej z nich; potrafisz też czytać z ruchu warg. Zwiększasz Mądrość lub Inteligencję o 1.",
    abilityBonus: ["wisdom", "intelligence"],
  },
  {
    name: "Sentinel",
    label: "Wartownik",
    description:
      "Gdy trafisz istotę atakiem okazyjnym, jej szybkość spada do 0; istoty w zasięgu nie mogą uniknąć twoich ataków okazyjnych, a ty możesz kontratakować przy opuszczeniu przez nie zasięgu.",
  },
  {
    name: "Sharpshooter",
    label: "Strzelec wyborowy",
    description:
      "Ataki dystansowe bronią nie mają utrudnienia w zwarciu i ignorują osłonę; możesz też przyjąć utrudnienie -5 do ataku za +10 do obrażeń.",
  },
  {
    name: "Shield Master",
    label: "Mistrz tarczy",
    description:
      "Możesz odepchnąć cel, który zadasz tarczą; gdy efekt wymaga rzutu obronnego Zręczności, przy sukcesie nie otrzymujesz obrażeń, a przy porażce — połowę.",
  },
  {
    name: "Skilled",
    label: "Wszechstronnie uzdolniony",
    description:
      "Zyskujesz biegłość w dowolnej kombinacji trzech umiejętności lub narzędzi. Możesz wybrać ten atut więcej niż raz.",
  },
  {
    name: "Skulker",
    label: "Zaczajony",
    description:
      "Możesz ukryć się, gdy jesteś tylko lekko przesłonięty, a chybienie atakiem dystansowym nie zdradza twojej pozycji.",
  },
  {
    name: "Spell Sniper",
    label: "Snajper zaklęć",
    description:
      "Zasięg twoich cantripów z rzutem ataku podwaja się, a ataki zaklęciem nie mają utrudnienia w zwarciu; uczysz się jednego cantripu z dowolnej listy.",
  },
  {
    name: "Tavern Brawler",
    label: "Awanturnik z karczmy",
    description:
      "Twoje ataki bez broni i improwizowane zadają k4 obrażeń, a gdy trafisz, możesz chwycić cel jako akcję bonusową. Zwiększasz Siłę lub Kondycję o 1.",
    abilityBonus: ["strength", "constitution"],
  },
  {
    name: "Tough",
    label: "Twardziel",
    description:
      "Twoje maksimum punktów życia rośnie o 2 za każdy twój poziom.",
  },
  {
    name: "War Caster",
    label: "Wojenny czarownik",
    description:
      "Masz przewagę w rzutach obronnych o utrzymanie koncentracji i możesz wykonywać składniki somatyczne zajętą ręką; w ataku okazyjnym możesz rzucić zaklęcie z czasem rzucania równym akcji.",
  },
  {
    name: "Weapon Master",
    label: "Mistrz broni",
    description:
      "Zyskujesz biegłość w czterech broniach według wyboru. Zwiększasz Siłę lub Zręczność o 1.",
    abilityBonus: ["strength", "dexterity"],
  },
];

export function findFeat(name: string): FeatDef | undefined {
  const query = name.trim().toLowerCase();
  return FEATS.find(
    (f) => f.name.toLowerCase() === query || f.label.toLowerCase() === query,
  );
}

export function buildCharacterFeatures(character: {
  race: string;
  className: string;
  subclass?: string;
  background?: string;
  level: number;
  feats?: string[];
  asiLevels?: number[];
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
  if (character.background) {
    const background = BACKGROUNDS.find((b) => b.name === character.background);
    if (background) {
      features.push({
        name: background.label,
        description: `Biegłości: ${background.skills.map(skillLabelPL).join(", ")}; narzędzie: ${background.tool}.`,
        level: 1,
        category: "background",
      });
    }
  }
  const asiLevels = character.asiLevels ?? [];
  for (const [index, featName] of (character.feats ?? []).entries()) {
    const feat = findFeat(featName);
    if (!feat) continue;
    features.push({
      name: feat.label,
      description: feat.description,
      level: asiLevels[index] ?? 4,
      category: "feat",
    });
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
