# Cel

SRD advancement — XP, leveling, nagrody:

1. **Tabele SRD** (`rules/advancement.ts`): XP za CR (0→10, 1/8→25, 1/4→50, 1/2→100, 1→200, 2→450, 3→700, 4→1100, 5→1800, 6→2300, 7→2900, 8→3900, 9→5000, 10→5900), progi poziomów 2-20 (300, 900, 2700, ...), hit die per klasa (d6-d12), przyrost max HP (avg die + CON mod / poziom), levelForXp.
2. **XP za pokonane potwory**: `Combatant.cr` z katalogu; na końcu walki (REST /end ORAZ DM end_combat) suma XP pokonanych (status dead) dzielona równo między postacie członków; narracja + event.
3. **Narzędzie `award_xp`**: ręczna nagroda (quest), równy podział, walidacja.
4. **Level-up automatyczny**: level = levelForXp; wzrost max HP (avg hit die + CON mod za każdy poziom), proficiencyBonus wg SRD; currentHp bez zmian (SRD: level-up nie leczy).
5. **UI**: XP i postęp do następnego poziomu w arkuszu.

## Kryteria ukończenia

1. XP przyznawany identycznie w REST i DM end_combat (wspólna logika).
2. Level-up poprawny wg SRD (max HP, prof bonus), bez regresji death/recovery/spells.
3. `award_xp` w DM_TOOLS z walidacją i eventem.
4. UI pokazuje XP/progi; `Character.xp` w sync (schema + rowToCharacter obie kopie).
5. Testy + bramki zielone.

## Poza zakresem

- Short rest / Hit Dice — osobna iteracja.
- Loot/przedmioty, feats, multiclass — osobna iteracja.
