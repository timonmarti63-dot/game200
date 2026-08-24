# "Orden der Wildnis" — Game Design Document

## 1. Prämisse

Im selben Reich wie *Krone & Kettenhemd* — aber statt eines einzelnen Ritters mit Schwert spielt man einen wandernden Kreaturen-Bündler, der das Archipel durchquert, wilde Kreaturen fängt und trainiert, und sich Zone für Zone den örtlichen "Ordensmeistern" stellt, um irgendwann selbst als würdig für den Kaiserthron zu gelten. Ton: warmherzig-mittelalterlich statt komödiantisch-derb (im Gegensatz zum Vorgänger-Prototyp), mit ruhigem Fortschrittsgefühl statt Echtzeit-Action.

## 2. Die drei Säulen

### 2.1 Worldbuilding & Progression
Jede Zone hat eine feste Bedrohungsstufe (Level-Bereich der wilden Fauna), ein festes Wetter (das bestimmte Attackentypen leicht begünstigt/abschwächt) und einen Ordensmeister, der den Zugang zur nächsten Zone freigibt. Kein Grinden ohne Ziel: jeder Orden ist ein sichtbarer Fortschrittsschritt.

### 2.2 Fortbewegung & Exploration
Kein Koordinatensystem — pro Besuch wählt man eine Aktion:
- **Erkunden** — löst ein Ereignis aus (70 % Begegnung / 20 % Fund / 10 % Lore), mit einem unsichtbaren Gefahren-Zähler, der bei Erreichen von 100 % eine Begegnung erzwingt.
- **Weiterziehen** — zum nächsten Bereich der Zone, am Ende zum Ordensmeister.
- **Rasten** — leichte Heilung, mit 15 % Hinterhalt-Risiko.
- **Team & Beutel** — kostenlose Menü-Aktion.

### 2.3 Kampfsystem
Rundenbasiert, Initiative nach Tempo. Vier aktive Attacken pro Kreatur (bei mehr gelernten bleiben automatisch die vier neuesten aktiv). Typen-Matrix mit neun Elementen (siehe `src/data/types.js`), STAB, Volltreffer, klassische Statuseffekte. Fangchance transparent angezeigt, exakte Formel in `src/data/formulas.js`.

## 3. Zonen (v1)

### Zone 1: Wiesenmark (Bedrohung 2–8)
Dorf und offenes Grasland. Fauna: Wieselratz (Normal), Mottling (Sturm). Ordensmeister: **Bertram**, ein stämmiger Dorf-Champion mit Bertrams Widder (Normal/Erde).

### Zone 2: Nebelwald (Bedrohung 10–18)
Dichter, nebelverhangener Wald — Nebel schwächt Sturm-/Licht-Attacken leicht ab. Fauna: Moosschleicher (Wald/Schatten), Nebelhusch (Schatten). Ordensmeisterin: **Sylvana**, eine Hüterin des Waldes mit Sylvanas Gefährte (Wald/Schatten).

### Zone 3: Eisenklamm (Bedrohung 20–30)
Kalte Erzschlucht — Rückgriff auf den Schauplatz aus *Krone & Kettenhemd*. Fauna: Klippenkrabbe (Erde/Flut), Ambosskäfer (Stahl). Ordensmeister: **Grendal**, der Eisenherzog aus dem Vorgänger-Prototyp — nun ein Ordensmeister mit Grendals Koloss (Stahl/Erde).

### Zone 4: Möwenhort (Ausblick, noch nicht begehbar)
Küstenfeste im Sturm — als nächster Ausbauschritt vorgesehen.

## 4. Starter-Linien

| Linie | Stufe 1 (Lv. 1) | Stufe 2 (Lv. 16) | Stufe 3 (Lv. 32) |
|---|---|---|---|
| Wald | Wurzling | Dornwicht | Eichenwart (Wald/Erde) |
| Feuer | Flackling | Glutgeist | Feuerdrake (Feuer/Stahl) |
| Flut | Tropfling | Flussgeist | Sturmwal (Flut/Sturm) |

## 5. Stand von v1

Vollständig spielbar: Starter-Wahl, alle drei Zonen mit Erkunden/Rasten/Weiterziehen, Zufallsbegegnungen mit allen 6 wilden Arten, Fangen, Team-/Beutel-Verwaltung, alle drei Ordensmeister-Kämpfe, EP/Level/Entwicklung, lokale Speicherung (localStorage, übersteht Neuladen).

## 6. Nächste Ausbaustufen (Vorschläge)

- Möwenhort als vierte Zone samt eigenem Roster und Ordensmeister
- Attacken-Ersetzen-Dialog statt automatischem "letzte 4 aktiv"
- Zweit-/Dritt-Entwicklungen für die wilden Nicht-Starter-Arten
- Cloud-Speicher (Supabase, analog zum Vorgänger-Prototyp) für geräteübergreifenden Fortschritt
- Musik/Ambient-Loops pro Zone (aktuell nur kurze Sfx-Stings)
