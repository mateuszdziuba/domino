# Cel

Ekwipunek z widokiem slotów na części ciała (typowe dla gier UX) + katalog przedmiotów SRD:

1. **Sloty ekwipunku** (warstwa prezentacji nad typami przedmiotów SRD): głowa, szyja, płaszcz, zbroja, rękawice, pas, pierścień ×2, broń, tarcza, buty; UI nie ogranicza liczby noszonych przedmiotów poza SRD (atunement max 3 magiczne przedmioty — licznik w UI).
2. **`InventoryItem.slot`/`attuned`** (JSON, bez migracji); `rules/equipment.ts`: EQUIPMENT_SLOTS (PL) + SRD_GEAR (kuratorowany katalog: zbroje, bronie, sprzęt podróżny, magiczne przedmioty z atunementem); `GET /api/equipment`.
3. **UI (CharacterSheetPage)**: siatka kafelków slotów (ekwipowane przedmioty / puste), zarządzanie: equip z listy (dropdown slotów), unequip z kafelka, atunement (0-3, blokada powyżej), badge slotu na liście ekwipunku, picker "Dodaj przedmiot z SRD" (PATCH inventory).
4. **grant_loot**: itemy z opcjonalnym slotem (walidacja) i attuned.

## Kryteria ukończenia

1. Siatka slotów działa (equip/unequip/atunement przez PATCH inventory).
2. Katalog SRD dostępny w UI i po API; grant_loot przyjmuje slot/attuned.
3. Nota w UI: sloty to grupowanie — SRD nie ogranicza liczby, atunement max 3.
4. Bramki zielone.
