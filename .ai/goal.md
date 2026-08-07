# Cel

Tooltips w czacie + awans z dialogiem wyboru subklasy i modyfikacją czarów:

1. **Tooltips w czacie**: wiadomości DM parsowane — nazwy czarów (rejestr) i umiejętności (angielskie + polskie nazwy) podświetlane i otwierają tooltip z opisem (komponent `RichMessageText` + współdzielone opisy skilli).
2. **Dialog wyboru subklasy przy awansie**: `subclassLevelForClass` (dane, 3), xp-award payload wzbogacony o `levelUps: [{ characterId, name, level, className }]` (award_xp + end_combat + REST /end); CampaignPage wykrywa (event + refetch po wejściu, gdy level ≥ próg i brak subklasy) → modal z kartami subklas (nazwa + cechy z `subclassDetails` w GET /api/features) → PATCH subclass; hint o modyfikacji zaklęć.
3. **Wybór/modyfikacja czarów**: zarządzanie w arkuszu istnieje; dialog podpowiada, że przy awansie można dodać/zamienić zaklęcia; CharacterSheetPage dostaje banner wyboru subklasy gdy kwalifikuje.

## Kryteria ukończenia

1. Tooltips w czacie na czarach i umiejętnościach (hover), bez psucia renderu wiadomości.
2. Awans na poziom ≥ próg subklasy → dialog z wyborem → PATCH → odświeżenie (też na arkuszu).
3. xp-award events zawierają levelUps; bramki zielone.
