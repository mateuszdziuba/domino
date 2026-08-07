# Cel

SRD combat depth — przewaga/utrudnienie, stany, krótki odpoczynek:

1. **Advantage/disadvantage** (SRD): `rollD20(adv/disadv)` w resolveAttack + rzuty czarów (ataki i save'y); flagi w AttackInput i rzutach zaklęć; REST + DM tools przekazują opcjonalnie; rider Guiding Bolt (przewaga na następny atak) — flaga na combatancie.
2. **Stany (conditions, SRD 5.2.1)**: mechaniczne podzbiór — blinded, frightened, poisoned, prone, restrained, paralyzed, unconscious (+ incapacitated/stunned/petrified jako "nie może działać"); `Combatant.conditions: string[]`; `rules/conditions.ts` (definicje PL + modyfikatory ataku: przewaga przeciw prone/restrained/blinded..., utrudnienie ataków przy blinded/poisoned/frightened/prone/restrained, brak akcji przy incapacitated family); narzędzia DM `apply_condition`/`remove_condition`; badge w CombatPanel.
3. **Krótki odpoczynek / Hit Dice** (SRD): `Character.hitDiceUsed` (migracja 0005), `take_short_rest { hitDice? }` (leczenie = HD spędzone × kość klasy + CON mod, max = level − used), long rest przywraca połowę HD (min 1), sheet pokazuje dostępne HD, preview trigger.

## Kryteria ukończenia

1. Przewaga/utrudnienie działają w atakach i czarach (testy deterministyczne z injekcją rzutów).
2. Stany wpływają na walkę (ataki/przewaga/blokada akcji), narzędzia DM walidują nazwy wg SRD, UI pokazuje badge.
3. Short rest leczy wg HD (SRD), long rest resetuje połowę; sheet + preview działają.
4. Bramki zielone.

## Poza zakresem (kolejne rundy)
- Więcej zaklęć (poziomy 2-3), łupy/skarb, widok drużyny (HP sojuszników), onboarding.
