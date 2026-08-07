# Cel

Wygodna gra wieloosobowa — 3 obszary:

1. **Zaproszenia (invite codes)**: `inviteCode` na kampanii (migracja), `POST /:id/invite` (właściciel generuje/kod z linkiem), `GET /api/campaigns/invite/:code` (rozwiązywanie kodu), `POST /api/campaigns/join` (dołączenie po kodzie), strona `/join?code=` (logowanie/rejestracja → wybór postaci → join → redirect), UI "Zaproś graczy" z linkiem i kopiowaniem.
2. **Biblioteka darmowych kampanii D&D 5e dla agenta**: dane `rules/adventures.ts` (3 darmowe przygody: "A Most Potent Brew", "The Wolves of Welton", "The Delian Tomb" — hook, lokacje, beaty, potwory, po polsku), narzędzia DM `start_adventure { title }` (preferowane) i `create_adventure { description }` (customowe z opisu), prompt każe preferować bibliotekę, preview triggery ("zacznijmy przygodę" / "wymyśl kampanię o X").
3. **Czytelność (Baymard)**: czat — większa, nie-italic czcionka, leading, kontrast; globalna typografia (body 15-16px, line-height, hierarchia, mniej italików dla treści).

## Kryteria ukończenia

1. Nowy gracz: rejestracja → link zaproszenia → wybór postaci → w grze (E2E 2 graczy).
2. DM (LLM + preview) potrafi wystartować przygodę z biblioteki lub wygenerować customową z opisu; stan kampanii (location/scene/worldProgress) aktualizowany przez silnik.
3. Czat i cała aplikacja czytelne (non-italic body, dobre leadingi, kontrast); bramki zielone.
