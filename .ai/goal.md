# Cel

Real-time combat: strumieniowe aktualizacje (Server-Sent Events) dla walki i czatu DM, tak aby zmiany (ruch w inicjatywie, ataki, death saves, wiadomości DM) pojawiały się u wszystkich graczy bez ręcznego odświeżania strony.

## Kryteria ukończenia

1. Serwer emituje zdarzenia walki i czatu do połączonych klientów kampanii.
2. Klient subskrybuje kampanię i aktualizuje UI na żywo (bez F5) — combat, chat, stan kampanii.
3. Wielu graczy widzi te same zmiany (multiplayer bez refresh).
4. Nie regresujemy: build, typecheck, lint, testy przechodzą.
