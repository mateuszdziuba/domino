# Cel

SRD death & recovery — domknięcie luk critic rundy 2 i pętla zdrowienia:

1. **Lethal damage**: trafienie w combatanta na 0 HP = 1 nieudany death save (kryt = 2); obrażenia >= max HP przy 0 HP = natychmiastowa śmierć (SRD 5.2.1 "Instant Death" / "Damage at 0 Hit Points").
2. **Status "stable"**: 3 sukcesy death save = stabilizacja (0 HP, ale nieumierający) — odrębny status od "downed"; stabilny nie rzuca więcej death saves.
3. **Long rest**: nowe narzędzie DM `take_long_rest` (SRD: min. 8h → pełne HP) + trigger w preview ("we rest"/"sleep"/"camp"); tylko poza walką. Zamyka pętlę: HP trwa → potrzebne leczenie.
4. Preview: finishing blows (celowanie w downed, nie w dead), stabilny combatant pomija turę bez akcji, trigger "hit" z granicą słowa (false-positive "hitching").

## Kryteria ukończenia

1. `performAttack` nakłada failed death saves / instant death na downed/stable targets; `performDeathSave` odrzuca stable; `applyDeathSave` ustawia status "stable".
2. `take_long_rest` w DM_TOOLS: leczy wszystkich członków do max HP, działa tylko poza walką, emituje przez saveState/pushEvent.
3. UI: badge "stable" w CombatPanel; typ `CombatantStatus` rozszerzony (sync shared).
4. Preview działa z nowymi regułami (finishing blows, stabilizacja, rest).
5. Testy + bramki (typecheck/test/lint/build) zielone.

## Poza zakresem

- Short rest / Hit Dice — osobna iteracja.
- Zaklęcia, conditions — osobna iteracja.
