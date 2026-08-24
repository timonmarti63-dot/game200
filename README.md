# Orden der Wildnis

Ein rundenbasiertes Kreaturen-Sammel-Abenteuer im Reich von *Krone & Kettenhemd* — inspiriert vom klassischen "Pokémon"-Aufbau (Zonen mit Fortschrittssperren, Erkunden mit Zufallsbegegnungen, typenbasierte Rundenkämpfe, Fangmechanik), aber mit eigenem Kreaturen-Roster, eigenem Typensystem und mittelalterlichem Anstrich. Gebaut mit reinem Vanilla-JS/HTML/CSS und Vite — kein Canvas-Framework nötig, da das Spiel komplett menügetrieben ist. Alle Sprites sind handgezeichnete Pixel-Art (`public/sprites/`, generiert über `tools/generate_pixel_art.py` und `tools/generate_creatures.py`); Soundeffekte sind prozedural per Web Audio API synthetisiert (`src/systems/Sfx.js`) — keine externen Audio-Dateien nötig.

## Spielen

```bash
npm install
npm run dev
```

Dann im Browser die angezeigte URL öffnen (Standard: http://localhost:5173).

## Spielprinzip

1. **Worldbuilding & Fortschritt:** Drei begehbare Zonen (Wiesenmark → Nebelwald → Eisenklamm), jede mit eigenem Wetter, eigener Fauna und einem Zonen-Boss ("Ordensmeister"). Der Weg zur nächsten Zone öffnet sich erst, wenn der aktuelle Ordensmeister besiegt wurde und seinen Orden überreicht hat. Eine vierte Zone (Möwenhort) ist als "kommt bald" sichtbar.
2. **Erkundung:** Pro Zone gibt es einen kurzen Bereichs-Pfad. Aktionen: **Erkunden** (70 % Zufallsbegegnung, 20 % Fund, 10 % Lore-Text; ein unsichtbarer Gefahren-Zähler erzwingt bei 100 % garantiert eine Begegnung), **Rasten** (heilt leicht, 15 % Hinterhalt-Risiko), **Weiterziehen** (zum nächsten Bereich, am Ende zum Zonen-Boss) und **Team & Beutel**.
3. **Kampf:** Rundenbasiert mit Initiative nach Tempo-Wert, vier gleichzeitig aktiven Attacken pro Kreatur, neun Elementtypen mit eigener Effektivitäts-Matrix (Feuer/Flut/Erde/Sturm/Wald/Stahl/Licht/Schatten/Normal), Statuseffekten (Gift, Paralyse, Verbrennung, Schlaf, Frost) und einer transparenten Fangchance-Berechnung beim Einsatz eines Bindesiegels.

## Steuerung

Vollständig maus-/touch-bedienbar über Buttons — keine Tastatursteuerung nötig.

## Kern-Formeln

- **Statuswerte:** `Stat(Level) = floor(Basiswert * Level / 50) + 5` (KP: `+ Level + 10`), keine IVs/EVs — deterministisch aus Basiswert + Level.
- **Schaden:** angelehnt an die klassische Formel, mit Typen-Multiplikator, STAB (1.5× bei typgleicher Attacke), 1/16-Volltreffer-Chance (1.5×) und einem Zufallsfaktor 0.85–1.0.
- **Fangchance:** exakt `P = ((MaxKP·3 − AktKP·2) / (MaxKP·3)) · Ball-Bonus · Status-Bonus`, mit Status-Bonus 2.0 bei Schlaf/Frost, 1.5 bei Gift/Paralyse/Verbrennung.
- **EP-Kurve:** `EP(Level) = Level³`; EP-Ertrag pro Sieg `floor(BasisEP · Gegner-Level / 7)`.

Alle Formeln liegen zentral in `src/data/formulas.js`.

## Projektstruktur

- `src/data/` – Inhalte: Typen+Matrix (`types.js`), Formeln (`formulas.js`), Attacken (`moves.js`), Kreaturen-Roster (`creatures.js`), Zonen (`zones.js`), Ordensmeister (`trainers.js`), Items (`items.js`)
- `src/engine/` – reine Spiellogik ohne UI: Kreaturen-Instanzen/Leveln/Entwicklung (`team.js`), Rundenkampf (`battle.js`), Erkundung/Gefahren-Zähler (`exploration.js`), Speicherstand (`gamestate.js`)
- `src/ui/` – die komplette Oberfläche als state-machine-getriebene Vanilla-JS-App (`app.js`) plus Styling (`app.css`)
- `src/systems/Sfx.js` – prozeduraler Web-Audio-Soundeffekt-Synthesizer (unverändert aus dem Vorgänger-Prototyp übernommen)
- `public/sprites/creatures/`, `public/sprites/trainers/` – handgezeichnete Kreaturen-/Ordensmeister-Pixel-Art
- `tools/generate_pixel_art.py` – Basis-Zeichenprimitive (Rechteck/Ellipse/Polygon/Schattierung/Outline) plus Alt-Assets (Eisenklamm-Grendal-Sprite wird als `trainer_grendal` weiterverwendet)
- `tools/generate_creatures.py` – erzeugt den kompletten Kreaturen-/Ordensmeister-Roster; `python3 tools/generate_creatures.py` zum Neu-Generieren (Kontaktabzug unter `tools/_preview/creatures_sheet.png`)

## Umfang von v1

- 3 Starter-Linien (je 3 Entwicklungsstufen): Wurzling→Dornwicht→Eichenwart (Wald), Flackling→Glutgeist→Feuerdrake (Feuer), Tropfling→Flussgeist→Sturmwal (Flut)
- 6 wilde Arten (2 pro Zone) + 3 einzigartige Ordensmeister-Kreaturen
- 3 begehbare Zonen mit je einem Ordensmeister-Kampf; eine vierte Zone als Ausblick
- Team-Kappe 6, unbegrenzte Kiste für überzählige gefangene Kreaturen

## Nächste Schritte

Möwenhort als vierte begehbare Zone mit eigenem Roster und Ordensmeister, weitere Entwicklungslinien/wilde Arten, Attacken-Ersetzen bei mehr als 4 gelernten Attacken (aktuell werden automatisch die vier neuesten aktiv gehalten), sowie ein optionaler Cloud-Speicher-Anschluss (z. B. erneut über Supabase, analog zum Vorgänger-Prototyp) für geräteübergreifenden Fortschritt.
