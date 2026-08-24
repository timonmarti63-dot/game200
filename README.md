# Krone & Kettenhemd

Spielbarer Prototyp zum [Game Design Document](GDD.md) — ein 2D-Top-Down-Action-Adventure im humorvollen Mittelalter-Setting, gebaut mit [Phaser 3](https://phaser.io/) und Vite. Charaktere, Gegner, Items, das Boot und alle Bodentexturen sind handgezeichnete Pixel-Art (`public/sprites/`, generiert über `tools/generate_pixel_art.py`); nur ein paar kleine UI-Glyphen (Herzen, Ausrufezeichen, Icons) werden weiterhin zur Laufzeit prozedural gezeichnet (`src/assets.js`). Soundeffekte sind prozedural per Web Audio API synthetisiert (`src/systems/Sfx.js`) — keine externen Audio-Dateien nötig.

## Spielen

```bash
npm install
npm run dev
```

Dann im Browser die angezeigte URL öffnen (Standard: http://localhost:5173).

## Umfang dieses Prototyps

- **Tutorial:** Beim ersten Start erklärt eine kurze Seiten-Sequenz Story, Segeln, Erkunden, Kampf und Ausrüstung (überspringbar mit Esc, jederzeit über [T] im Titelbildschirm erneut ansehbar).
- **Titel & Segeln:** Boot auf offener See steuern (zeigt immer nach Norden), zur Insel Rübenfeld segeln. Eisenklamm schaltet sich nach der Eroberung Rübenfelds frei; Möwenhort ist als eigene, unterschiedlich gestaltete Insel sichtbar, aber noch als "nicht erreichbar" markiert (nächster Ausbauschritt).
- **Insel Rübenfeld:** eine große, echte Insel mit Wasser/Strand-Ring um ein weitläufiges Grasland, verstreuten Bäumen/Büschen/Felsen/Blumen, einem kleinen Dorf (3 handgezeichnete Häuser) im Westen und einer Burg im Norden. Gegner: tollpatschige Hellebardiere, aggressive Wildgänse. Boss: Baron Rudibert.
- **Insel Eisenklamm:** freigeschaltet nach Rübenfeld, gleiche Insel-Geometrie in düsterem Fels-/Minen-Look (eigene Boden-/Wand-Texturen, Kiefern statt Bäume, Mineneingänge statt Dorf). Gegner: schwer gepanzerte Elite-Ritter (fast unbesiegbar von vorn durch ihren Turmschild, aber so langsam, dass man sie mühelos umrundet), schnelle Minen-Kobolde mit Spitzhacke, Sprengfallen-Ingenieure, die häufiger sich selbst als den Spieler erwischen. Boss: **Eisenherzog Grendal** — hält meist stand wie eine Wand, muss aber per Beleidigungs-Parieren zu einem hektischen Wutsprint provoziert werden, der ihn kurz darauf erschöpft und verwundbar zu Boden gehen lässt (Bonusschaden-Fenster).
- **Kampfsystem:** Nahkampf mit austauschbaren Waffen, Ausweichrolle, Beleidigungs-Parieren (kontert telegraphierte Angriffe, Gegner flieht weinend), Wurfgeschosse (Huhn/Fass/Melone), sowie **Der Anstands-Enterhaken** — ein freischaltbarer Enterhaken (Fund auf Eisenklamm), der auf [F] Gegner im Zielkegel heranzieht (kurze Betäubung) oder Rüdiger nach vorn zieht, wenn kein Ziel in Reichweite ist.
- **Ausrüstung & Inventar:** Waffen (Schwert, Kriegshammer), Rüstung (Lederrüstung, mehr Herzen), Tränke und der "Heilige Gral" als Hotbar-Trinket lassen sich auf den Inseln finden (am Boden, in Truhen, als Beute besiegter Gegner). Verbrauchsgegenstände (Tränke, Wurfgeschosse) stapeln sich jetzt in einem Slot (Mengenanzeige) statt je einen eigenen Platz zu belegen. Hotbar unten (Slots [1]-[4]); volles Inventar mit Rucksack/Ausrüstungs-Slots über [E] (pausiert das Spiel).
- **Bewegungs-Feedback:** kein Frame-für-Frame-Lauf-Sprite, aber ein leichtes Stauch-/Streck-Bobbing synchron zur Bewegungsgeschwindigkeit lässt Spieler und Gegner beim Laufen "animiert" wirken.
- **Sound:** kurze prozedural erzeugte Retro-Sounds für Angriff, Treffer, Ausweichen, erfolgreiches Kontern, Aufheben, Truhe öffnen, Wurf, Enterhaken, Gegner-/Boss-Tod, Toröffnung und Spieler-Schaden/-Tod.

## Steuerung

| Aktion | Taste |
|---|---|
| Bewegen | WASD / Pfeiltasten |
| Angriff | Leertaste / J |
| Ausweichrolle | Shift / K |
| Beleidigungs-Parieren | Q / L |
| Anstands-Enterhaken (nach Fund) | F |
| Hotbar-Slot benutzen | 1 / 2 / 3 / 4 |
| Inventar öffnen/schließen | E (oder Esc im Inventar) |

## Cloud-Speicher (optional, kostenlos, geräteübergreifend)

Standardmäßig läuft das Spiel komplett ohne Backend — Fortschritt bleibt nur für die aktuelle Browser-Sitzung erhalten. Optional lässt sich ein kostenloser [Supabase](https://supabase.com)-Account anbinden, damit Ausrüstung/Hotbar/Rucksack/eroberte Inseln mit einem Login geräteübergreifend gespeichert werden — ganz ohne eigenen Server-Code, da das Spiel direkt (über die öffentliche "anon"-Taste + Row-Level-Security) mit Supabase spricht.

**Einrichtung (ca. 3 Minuten):**
1. Kostenloses Projekt auf [supabase.com](https://supabase.com) anlegen.
2. Im Supabase-Dashboard unter *SQL Editor* den Inhalt von `supabase/schema.sql` einfügen und ausführen (legt die Tabelle + Zugriffsrechte an).
3. Unter *Settings → API* die **Project URL** und den **anon public key** kopieren.
4. Beides in `src/systems/CloudSave.js` eintragen (`SUPABASE_URL`, `SUPABASE_ANON_KEY`).
5. Neu bauen/deployen (`npm run build`, bzw. bei Vercel reicht ein Push).

Im Spiel dann über **[C]** auf dem Titelbildschirm oder auf See ein Konto registrieren/anmelden. Ohne Einrichtung zeigt der Cloud-Speicher-Dialog einfach "nicht eingerichtet" und das Spiel funktioniert wie zuvor lokal weiter.

**Wichtig:** Der Cloud-Login funktioniert nur auf einer echten Deployment-URL (z. B. Vercel) — die Vorschau in einem geteilten Claude-Artifact blockiert aus Sicherheitsgründen Netzwerkzugriffe zu fremden Servern und zeigt daher immer "nicht eingerichtet", selbst mit echten Zugangsdaten im Code.

## Projektstruktur

- `src/scenes/` – Boot, Title, Tutorial, Sailing, Island (jetzt konfigurationsgetrieben für mehrere Inseln), UI, Inventory
- `src/entities/` – Player, Enemy-Basisklasse, Halberdier, Goose, Boss (Rudibert), EliteKnight, MineGoblin, Sapper, DukeGrendal, Pickup/Wurfgeschosse
- `src/systems/Items.js` – Item-Definitionen (Waffen, Rüstung, Tränke, Wurfgeschosse, Trinkets, Fähigkeiten)
- `src/systems/Inventory.js` – Inventar-Logik (Hotbar, Rucksack, Waffen-/Rüstungs-Slot, Item-Stapel)
- `src/systems/Insults.js` – Beleidigungs- und Kampfansage-Texte
- `src/systems/Sfx.js` – prozeduraler Web-Audio-Soundeffekt-Synthesizer
- `src/systems/PlayerState.js` / `src/systems/CloudSave.js` – lokale Sitzungs-Persistenz bzw. optionale Supabase-Cloud-Speicherung
- `src/assets.js` – prozeduraler Generator für kleine UI-Icons (Herzen, Ausrufezeichen, Nebel-VFX)
- `public/sprites/` – handgezeichnete Pixel-Art-PNGs (Spieler, Gegner, Bosse, Items, Häuser, Deko, Boot, Tiles), von BootScene geladen
- `tools/generate_pixel_art.py` – Python/Pillow-Skript, das `public/sprites/` erzeugt; `python3 tools/generate_pixel_art.py` zum Neu-Generieren/Anpassen (legt zusätzlich ein Kontaktabzug-Preview unter `tools/_preview/` an)

## Nächste Schritte

Möwenhort ist bisher nur als Insel-Grafik auf der Seekarte vorhanden, aber nicht begehbar (dritte Insel + Piraten-Boss stehen noch aus). Echte Lauf-Animationen (mehrere Sprite-Frames statt Bewegungs-Bobbing), Musik, sowie die übrigen GDD-Power-Ups (Bannerbuch, Selbstschussarmbrust, Glücksbringer-Hühnerfuß) sind noch nicht implementiert.
