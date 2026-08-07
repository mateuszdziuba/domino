# Cel

SRD spellcasting (v1, mechaniczne zaklęcia):

1. **Silnik zaklęć** (`rules/spells.ts`): SRD-faithful definicje zaklęć kleryka — cantrips: Sacred Flame (save vs DEX 1d8 radiant), Spare the Dying (stabilizacja); 1st: Cure Wounds (1d8+mod heal), Healing Word (1d4+mod heal), Guiding Bolt (attack, 4d6 radiant), Inflict Wounds (attack, 3d10 necrotic). Czyste funkcje + deterministyczne rzuty (injection).
2. **Sloty zaklęć** (SRD tabela kleryka, poziomy 1-5): `Character.spellSlotsUsed`, reset przy `take_long_rest`.
3. **Narzędzie DM `cast_spell`**: walidacja (zna zaklęcie, slot, żywy caster, w walce = tura castera + cel to combatant, poza walką = heal na postać), efekty przez silnik, saveState/pushEvent, writeback HP.
4. **Preview**: "I cast X on Y" — parsowanie po znanych zaklęciach, cast przez narzędzie.
5. **UI**: sloty w arkuszu postaci (used/max per level), nazwa postaci zamiast id w czacie DM i liście Party.

## Kryteria ukończenia

1. `cast_spell` w DM_TOOLS działa (walidacja jak attack: tura, żywy caster; target combatant w walce / postać poza walką).
2. Obrażenia/zabicie/leczenie/wskrzeszenie (heal z 0 HP → active) poprawne wg SRD; death saves przy 0 HP nienaruszone.
3. Sloty: koszt przy cast, reset przy long rest, wyświetlane w arkuszu.
4. Czystki: `senderName` = nazwa postaci, Party pokazuje nazwy.
5. Testy + bramki zielone.

## Poza zakresem

- Zaklęcia wyższych poziomów, concentration, buffs (Bless/Bane), area spells — osobna iteracja.
- Short rest / Hit Dice — osobna iteracja.
