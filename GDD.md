# "Krone & Kettenhemd" — Game Design Document

*Arbeitstitel. Ein humorvolles Top-Down-Action-Adventure im Mittelalter-Archipel.*

---

## 1. Story-Prämisse

Ser Rüdiger von Hühnerstein ist der jüngste Sohn einer Adelsfamilie, die so unbedeutend ist, dass sie nicht einmal auf der offiziellen Landkarte des Reiches verzeichnet ist. Als der greise Kaiser Bodovan III. auf einem Bankett an einem zu scharfen Wildschweinbraten erstickt, hinterlässt er weder Erben noch ein klares Nachfolgegesetz — nur eine verstreute Ansammlung von Inseln, auf denen sich rivalisierende Fürsten, Raubritter und selbsternannte "Kaiser" sofort gegenseitig an die Gurgel gehen.

Rüdiger, ausgestattet mit einem verbeulten Erbstück-Schwert, einem sturen Segelboot namens *Die Fromme Ente* und einem völlig unangemessenen Maß an Selbstvertrauen, beschließt: Wenn niemand sonst geeignet ist, dann eben er. Die Spieler:innen begleiten ihn dabei, wie er von Insel zu Insel segelt, lokale Fürsten entweder unterwirft oder überzeugt, Verbündete sammelt (ein depressiver Hofnarr, eine Piratin im Ruhestand, ein Huhn mit Führungsanspruch) und sich Stück für Stück den Weg zum Thron freikämpft — bis er am Ende entweder gekrönt wird oder zumindest jemand anderes davon abhält, ein noch schlechterer Kaiser zu werden.

Der Ton ist durchgehend komödiantisch-episch: große Gesten, kleine Konsequenzen, viel Slapstick, aber mit einem warmen Kern (Rüdiger will es eigentlich *richtig* machen, auch wenn er ständig stolpert — buchstäblich).

---

## 2. Das Kampfsystem

Echtzeit, Top-Down, zwei Tasten fürs Wesentliche (Angriff / Ausweichen) plus Item-Slot — leicht zu lernen, aber mit viel Raum für emergentes Chaos. Drei Kernmechaniken tragen den Humor:

### 2.1 Beleidigungs-Parieren ("Verbaler Konter")
Manche Gegner (v. a. Adelige, Wachen, aufgeblasene Ritter) leiten Spezialangriffe mit einer Kampfansage ein — eine Sprechblase erscheint kurz über ihrem Kopf ("Für Kaiser Grimwald!"). Kontert der Spieler im richtigen Timing-Fenster mit der Parade-Taste, spuckt Rüdiger eine passgenaue Beleidigung zurück ("Deine Rüstung glänzt mehr als dein Verstand!"). Der Gegner bleibt kurz fassungslos stehen, bekommt Tränen in die Augen und rennt 2-3 Sekunden lang heulend und schutzlos davon, bevor er sich wieder fängt — ein perfektes Zeitfenster für Zusatzschaden oder Flucht. Je nach besiegtem Gegnertyp schaltet man neue, fiesere Beleidigungen frei (gesammelt in einem "Buch der schlechten Manieren").

### 2.2 Stolperphysik & Waffen-Slapstick
Gegner (besonders Hellebardiere und Elite-Ritter) haben spürbares Trägheitsgewicht in ihren Waffen. Verfehlt ein Gegner einen Schlag, taumelt er kurz und kann über die eigene Waffe, herumliegende Fässer, Hühner oder sogar Rüdigers hingeworfenen Schild stolpern — inklusive Ragdoll-Rutschpartie in den nächsten Gegner (Kegel-Effekt, Dominoschaden). Der Spieler kann das aktiv provozieren: Ausweichen im letzten Moment lässt übermotivierte Gegner regelmäßig ins Leere schlagen und hinfallen. Belohnt Timing statt reinem Button-Mashing und sorgt für die "Castle Crashers"-artigen Chaos-Momente.

### 2.3 Wurfgeschoss-Wildlife
Fast alles auf dem Boden ist eine Waffe: Hühner (panisch gackernd, machen wenig Schaden, aber lösen bei Treffer eine kleine Hühner-Stampede aus, die auch Gegner umrennt), Fässer (explosiv oder — häufiger, zum Lacher — voller Heringe, die alles rundum stinkend einnebeln und Gegner kurzzeitig blind machen), Melonen, ein gelegentlicher aufgebrachter Gänserich (macht überproportional viel Schaden, sehr gesucht). Rüdiger kann alles Tragbare aufheben und werfen; die Physik ist bewusst übertrieben und leicht unberechenbar, was zu wiederholbaren, komischen Zufallsmomenten führt statt zu einem sterilen "Wurfwaffen-Menü".

Zusätzlich: Ein einfaches Ausweich-Dodge mit kurzer i-Frame-Rolle, ein aufladbarer Rundumschlag für Gruppen, und ein Kombosystem, das absichtlich albern benannt ist ("Der Ente-Ente-Gans", "Das Unhöfliche Dreieck").

---

## 3. Gameplay-Loop

Ein dreiteiliger Loop, der sich über die gesamte Spielzeit wiederholt und langsam an Komplexität gewinnt:

1. **Segeln** — Auf der Archipel-Übersichtskarte steuert man *Die Fromme Ente* in 2D (top-down, ähnlich Wind Waker, aber flacher/arcadiger). Wind, kleine Seeschlachten gegen Piratenboote (Kanonen + Ausweichen), versteckte Strudel-Abkürzungen und schwimmende Schatzkisten sorgen dafür, dass Reisen selbst schon Gameplay ist, nicht nur ein Ladebildschirm. Später schaltet man Segel-Upgrades frei (Geschwindigkeit, Kanone, Fischerei-Minispiel für Heilgegenstände).
2. **Erkunden** — Auf jeder Insel: zu Fuß durch Dörfer, Wälder und Wildnis laufen, NPCs für Nebenquests und Gerüchte ansprechen, kleine Rätsel-Schreine, versteckte Truhen und optionale Mini-Dungeons (Lager von Wegelagerern) räumen. Hier greift das Kampfsystem in kleinen, gestreuten Encounters.
3. **Erobern** — Jede Insel hat 1-3 Burgen. Man infiltriert/erstürmt sie (Stealth-light optional, aber Frontalangriff immer möglich), räumt den Dungeon darunter, besiegt den Burgherrn im Bosskampf und übernimmt damit dessen Territorium — was neue Verbündete, Handelsrouten, Ausrüstung und einen sichtbaren Fortschrittsbalken zur Kaiserkrone freischaltet.

Der Loop ist bewusst als sich selbst verstärkende Spirale gebaut: mehr eroberte Burgen → mehr Ruf/Gold → bessere Ausrüstung und Bootsupgrades → Zugang zu weiter entfernten, schwereren Inseln → mehr Burgen. Zwischen den Hauptzielen sorgen Nebenquests, Sammelobjekte (Wappen, Rezepte für die Bordküche, Hühner-Kostüme) und ein wachsendes Anwesen/Hauptquartier für zusätzliche mehrstündige Beschäftigung.

---

## 4. Beispiel-Inseln & Burgen

### Insel 1: Rübenfeld (Tutorial-Insel, frühes Spiel)
Sanfte Hügel, Bauernhöfe, ein einziges bescheidenes Holzkastell. Thematisch: "so klein fängt jeder mal an."
- **Gegner:** Tollpatschige Hellebardiere (lange Reichweite, aber brauchen ewig zum Umdrehen — leicht zu umlaufen), aggressive Wildgänse (schnell, bissig, in Schwärmen), ein betrunkener Nachtwächter, der eigentlich schläft, bis man ihn weckt.
- **Boss:** **Baron Rudibert der Rübenkönig** — ein selbsternannter Adliger in überdimensionierter, aus Gemüsekisten improvisierter "Rüstung". Wirft faules Gemüse, das explodiert und stinkt (Sichtbehinderung), und ruft in Panik seine eigenen Wachen zur Hilfe, die ihn dabei öfter versehentlich selbst treffen als Rüdiger.

### Insel 2: Eisenklamm (Mittleres Spiel)
Gebirgige Minen-Insel mit einer Festung aus grauem Stein, dunklere Beleuchtung, mehr Verteidigungsanlagen. Thematisch: erster "ernster" Gegner, der aber komödiantisch untergraben wird.
- **Gegner:** Viel zu schwer gepanzerte Elite-Ritter (fast unbesiegbar von vorne, aber so langsam, dass man sie mühelos umrundet und in Fallen/Abgründe lockt), Minen-Kobolde mit Spitzhacken (schnell, aber Schaden nur im Nahbereich), Sprengfallen-Ingenieure, die öfter ihre eigenen Fallen auslösen als die des Spielers zu treffen.
- **Boss:** **Eisenherzog Grendal** — trägt die schwerste Rüstung im Spiel, kann kaum laufen (schlurft in Zeitlupe), muss aber gefürchtet werden, sobald er trifft. Kernwitz: Man muss ihn zum Rennen provozieren (z. B. per Beleidigungs-Parieren), damit er sich selbst außer Atem bringt und zusammenklappt — Kraft-Boss wird durch Ausdauer-Mechanik statt reinem Dodge-Tanking besiegt.

### Insel 3: Möwenhort (Spätes Spiel)
Windige Klippen-Insel mit einer Festung, die halb in den Fels gebaut ist, Piratennest in der Bucht darunter. Thematisch: Chaos-Insel, Zusammenspiel aller bisherigen Mechaniken.
- **Gegner:** Piraten-Enterkommandos (nutzen selbst Wurfgeschosse — Spiegelbild des Spielers), Katapult-Bedienungen auf den Wällen, ein Käfig voller besonders aggressiver Kampfgänse, die man auch als Verbündete gegen die Piraten freilassen kann.
- **Boss:** **Kapitänin Möwe "Eiserner Schnabel" Vance** — kämpft auf einem beweglichen Schiffsdeck-Abschnitt der Burg, kombiniert Kanonenschüsse, Enterhaken-Ziehangriffe und ruft zwischendurch echte Möwen herbei, die Rüdiger Gegenstände aus den Händen klauen (inkl. seiner gerade aufgehobenen Waffe) — Boss zwingt zu ständigem Improvisieren mit Umgebungsgegenständen statt einer festen Strategie.

---

## 5. Power-Ups

Fünf Upgrades, die bekannte Adventure-Mechaniken (Dash, Enterhaken, Flächenschaden, Fernkampf, Extra-Leben) mit einem komödiantischen Twist versehen und über die gesamte Spielzeit motivieren, weil jedes neue Gameplay-Möglichkeiten UND wiederkehrende Insider-Witze eröffnet:

1. **Der Heilige Gral (eigentlich: doppelter Espresso)** — Ersetzt den klassischen Speed-Boost/Dash. Rüdiger findet den "sagenumwobenen Gral", der sich als Kaffeebecher eines Einsiedler-Mönchs entpuppt. Kurzzeitiger Speed- und Angriffsgeschwindigkeits-Boost, dafür zittert die Kamera leicht und Rüdiger murmelt zunehmend hektisches Selbstgespräch.
2. **Der Anstands-Enterhaken** — Ein Enterhaken, getarnt als "Zepter höflicher Konversation". Zieht Rüdiger zu Haken-Punkten oder zieht kleinere Gegner zu ihm heran ("Komm her, das müssen wir persönlich klären!"). Standard-Traversal-Tool fürs Erkunden UND Combo-Starter im Kampf.
3. **Das Bannerbuch der Nachbarschaftshilfe** — Ein Flächenangriff, getarnt als Rüdiger, der eine wortreiche Standpauke über Manieren hält, während er sein Banner wild im Kreis schwenkt — trifft alle Gegner im Umkreis, mit kleiner Chance, sie zusätzlich ins Beleidigungs-Parieren-Fluchtverhalten zu schicken.
4. **Die Selbstschussarmbrust "Der Ungebetene Gast"** — Fernkampfwaffe, die eigentlich für Hochzeitseinladungen gedacht war. Verschießt Einladungsscrolle, die explodieren ("Sie sind hiermit... explosiv eingeladen"). Erste Fernkampfoption, wichtig gegen Bogenschützen/Katapulte.
5. **Der Glücksbringer-Hühnerfuß (getrocknet, garantiert nicht von Hektor)** — Extra-Leben-Mechanik: Beim tödlichen Treffer wird Rüdiger stattdessen von einem empörten Riesenhuhn "gerettet" (kurze Slapstick-Zwischensequenz), steht mit 1 HP wieder auf und ist kurz unverwundbar — einmal pro Dungeon aufladbar, motiviert riskanteres, komisches Spiel statt Frustration bei Toden.

Alle Power-Ups leveln sich zusätzlich über Fundstücke/Quests weiter auf (z. B. "Espresso Doppio" für längere Wirkzeit), was einen langfristigen Sammel-Anreiz über die gesamte Spielzeit bietet, ohne das Kernsystem zu verkomplizieren.

---

## 6. Stand des Prototyps

Umgesetzt: Insel 1 (Rübenfeld, Baron Rudibert) und Insel 2 (Eisenklamm, Eisenherzog Grendal — inkl. der in Abschnitt 4 beschriebenen Ausdauer-Mechanik gegen ihn) sind vollständig spielbar, samt eigenem Gegner-Roster, Look und Loot pro Insel. Von den Power-Ups aus Abschnitt 5 ist der Anstands-Enterhaken (2.) implementiert; die übrigen drei folgen als Nächstes.

## 7. Nächste Ausbaustufen (Vorschläge)

Folgende Elemente eignen sich gut, um als Nächstes vertieft zu werden:
- Insel 3 (Möwenhort) inkl. Bosskampf gegen Kapitänin Vance
- Die restlichen Power-Ups: Bannerbuch (Flächenangriff), Selbstschussarmbrust (Fernkampf), Glücksbringer-Hühnerfuß (Extra-Leben)
- Das Segel-Minispiel (Wind, Seeschlachten, Kartenaufbau) im Detail
- Echte Frame-für-Frame-Laufanimationen statt des aktuellen Bewegungs-Bobbings, plus Musik
- Das Fortschrittssystem zum Kaiserthron (Ruf-Mechanik, Verbündete, Enddiplomatie vs. Endkampf)
- NPC- und Verbündeten-Roster im Detail
