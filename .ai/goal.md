# Cel

Spellbook nad czatem + zarządzanie czarami postaci:

1. **Endpoint `GET /api/spells`**: metadane rejestru SPELLS (nazwa, poziom, szkoła, komponenty, czas rzucania, zasięg, czas trwania, efekt: obrażenia/leczenie/stabilizacja, kości, typ) — czysta funkcja `summarizeSpells()` w rules/spells.ts + route w index.ts.
2. **Spellbook w CampaignPage** (nad czatem): sloty per poziom (used/max), chipy znanych zaklęć (cantrip = ∞, brak slotu = disabled), klik → input "Rzucam X na "; odświeżanie po state.updated / action.resolved / connected / zmianie postaci.
3. **Zarządzanie czarami w CharacterSheetPage**: rejestr z endpointu, grupowane checkboxy (cantripy, 1. poziom), przełączanie → PATCH spells, opis efektu per zaklęcie, polskie etykiety sekcji zaklęć.

## Kryteria ukończenia

1. `GET /api/spells` zwraca pełny rejestr z efektami; test jednostkowy summarizeSpells.
2. Spellbook pokazuje poprawny stan slotów (SRD table z sheet), reaguje na cast/rest.
3. Zarządzanie czarami działa (toggle → PATCH → odświeżenie), bez regresji arkusza.
4. Bramki zielone.

## Poza zakresem

- Nauka zaklęć przy level-upie (auto) — później.
- Więcej zaklęć w rejestrze — osobna iteracja.
