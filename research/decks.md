# Passagierdecks A und B des LZ 129 „Hindenburg“: Zustand 1936 und 1937

Stand: Recherche vom 23.11.2026. Abgeglichen mit `src/decks.js` und `src/hull.js` (A_Y = −15.0, A_H = 2.5, B_Y = −17.6, B_H = 2.4).
Modellkoordinaten: x = Meter ab Heck (Bug = größeres x), y = Höhe, +z = Steuerbord, −z = Backbord.

## 0. Wichtigste Primärquellen (Zeichnungen)

Die Grundrisse in diesem Bericht stammen fast ganz aus drei Zeichnungen, die auf airships.net veröffentlicht sind. Ich habe sie im Browser vergrößert und ausgemessen:

| Kürzel | Zeichnung | URL | Bewertung |
|---|---|---|---|
| **[DZR36]** | Decksplan A-Deck aus dem DZR-Prospekt 1936 („Plan of Passenger Accommodations …“) | https://www.airships.net/wp-content/uploads/hindenburg-brochure-deckplan-a-deck1.jpg | Zeitgenössisch, schematisch, Raumfolge und Kabinenzählung zuverlässig |
| **[FOW]** | David Fowler: Grundrisse A- und B-Deck „vor dem Umbau 1936/37“ mit Ringen 173 und 188 | https://www.airships.net/wp-content/uploads/lz129-passenger-decks.jpg | Moderne, maßstäbliche Rekonstruktion; beschriftet (Bug oben = Ring 188) |
| **[FOWP]** | David Fowler: Seitenriss der Passagierdecks im Rumpf | https://www.airships.net/wp-content/uploads/passenger-decks-profile.jpg | Höhenlage, Fallreep am Heckende, Bug rechts |
| **[DZR37]** | Patrick Russell nach DZR-Prospekt 1937: B-Deck mit den neuen Kabinen | https://www.airships.net/wp-content/uploads/b-deck-1937-plan.jpg | Zeitgenössische Grundlage, Kabinennummern 51–70 lesbar |

**Ausrichtung:** [FOW] beschriftet die Vorderkante mit Ring 188 und die Hinterkante mit Ring 173. Damit liegt der Bug in [FOW] und [DZR36] oben, und Backbord ist links. Der Speisesaal liegt in beiden Plänen links, also an Backbord, was alle Textquellen bestätigen. In [FOWP] liegen die Führergondel rechts und das Fallreep am linken Ende, also achtern. Das passt zusammen.

**Maßstab:** Für die Umrechnung habe ich Ring 188 → x = 188 und Ring 173 → x = 173 gesetzt, also 15 m Decklänge. Das ergibt bei [FOW] etwa 26,7 px/m. Die Mittellinie (Kielgang) ist z = 0. Die Messgenauigkeit liegt bei etwa ±0,3–0,5 m. Alle Koordinaten unten sind aus Zeichnungen abgegriffen und keine überlieferten Konstruktionsmaße.

---

## 1. Lage und Gesamtmaße

| Angabe | Quelle | Sicherheit |
|---|---|---|
| Passagierbereich zwischen den Hauptringen 173 und 188 (Bucht 12) | [FOW]; indirekt airships.net (neue Kabinen 1937 „in Bay 11, just aft of ring 173“; Mannschaftsschlafraum in Bucht 11 „just aft of the passenger accommodations“), https://www.airships.net/hindenburg/interiors/ , https://www.airships.net/?p=4351 | hoch |
| Zwei Decks übereinander, ganz im Rumpf, über die volle Breite, fast quadratischer Grundriss | airships.net Interiors; Augenzeuge W. B. Courtney (Collier’s 1937) nach https://www.garemaritime.com/sky-cruise-flight-hindenburg/ | hoch |
| A-Deck etwa 22 m breit und 14 m lang | de.wikipedia LZ 129 (nach Waibel 2020), https://de.wikipedia.org/wiki/LZ_129 | mittel |
| A-Deck gemessen: Innenwände der Fensterbänder bei z ≈ ±11,2, Außenkante der Fensterbänder bei ±12,5; Innenlänge etwa x 173,3–187,7 | [FOW] | mittel |
| B-Deck deutlich schmaler, gemessen: Fensterband z ≈ ±4,3 … ±5,2; Länge wie A-Deck | [FOW], [DZR37] (dort ±4,6 … ±5,6) | mittel |
| B-Deck wird mittig vom Kielgang (≈1 m breit) über die volle Länge geteilt | de.wikipedia; [FOW] „Keel Corridor“ | hoch |
| Gesamtfläche etwa 400 m² | Airship Heritage Trust, https://airshipsonline.com/airships/lz-129-hindenburg/ | niedrig (Sekundärquelle) |
| Höhenlage: B-Deck-Boden nur etwa 0,5–0,8 m über dem tiefsten Rumpfpunkt; Deckabstand etwa 2,6 m; B-Deck-Raumhöhe etwa 2,4–2,5 m | [FOWP], abgegriffen | niedrig bis mittel |
| Raumhöhe A-Deck | nicht belegt (siehe „Nicht belegbar“) | – |

**Folgerung für das Modell (mittel):** In der Modellhülle liegt eine halbe Breite von ≈11,2 m (A-Deck-Außenwand laut [FOW]) bei y ≈ −16,8 … −17,0. Eine halbe Breite von ≈5 m (B-Deck) liegt bei y ≈ −19,5. Gerechnet mit `hw()` aus hull.js: Bei x = 180,5 ist hw(−17,0) = 10,9 und hw(−19,5) = 5,1. Beide Decks sitzen im Modell also rund 1,9 m zu hoch: A_Y = −15,0 statt ≈ −16,9 und B_Y = −17,6 statt ≈ −19,5. Der Deckabstand von 2,6 m stimmt. Folge: Das Modell-A-Deck ist ≈27 m breit (hw(−15) ≈ 13,5) statt ≈22 m. Das B-Deck ist ≈20 m breit statt ≈9–10 m. Dazu passt, dass die B-Deck-Fenster fast waagerecht im Rumpfboden lagen. Der Rauchsalon hatte laut Augenzeugen niedrige, waagerechte Fenster mit Blick senkrecht nach unten (airships.net Passagiertagebuch, https://www.airships.net/hindenburg/flight-schedule/hindenburg-flight-passenger-diary/; Courtney; de.wikipedia „fast senkrecht nach unten“). Ein Haken bleibt: Das Modell legt den Kielgang auf keelY ≈ −19,1. Das B-Deck läge dann etwa 0,4 m darunter. Laut Quellen läuft der Kielgang aber durch das B-Deck, beide müssten also auf gleicher Höhe liegen.

---

## 2. A-Deck 1936

### 2.1 Faktentabelle

| Angabe | Quelle | Sicherheit |
|---|---|---|
| Speisesaal an Backbord über die ganze Decklänge, etwa 47 × 13 ft (14,3 × 4,0 m) | airships.net Interiors; [FOW]; [DZR36] | hoch |
| Speisesaal und Backbordpromenade bilden einen Raum. Eine niedrige, geschwungene Brüstung in zwei Abschnitten trennt sie, mit einem Durchgang etwa in der Mitte | [FOW], [DZR36]; Tagebuch: „railing separating the tables from a promenade“ | hoch |
| Speisesaal gemessen: z ≈ −9,2 … −5,3 (Tische), Promenade z ≈ −11,2 … −9,2 | [FOW] | mittel |
| Gesellschaftsraum (Lounge) an Steuerbord, etwa 34 ft (10,4 m) lang | airships.net; [FOW] gemessen ≈ 9,8 m | hoch |
| **Schreib- und Lesezimmer liegt VORN an Steuerbord** (Bugseite), die Lounge dahinter (achtern). Eine Querwand mit Tür trennt beide | [FOW] („Reading Room“ an Ring 188), [DZR36] (oben = vorn); de.wikipedia: „in Fahrtrichtung, durch eine Querwand abgetrennt“; Tagebuch: Lounge und Schreibraum durch halbhohe Trennwand geteilt | hoch |
| Widerspruch: invisiblethemepark.com setzt das Lesezimmer „at the back“ | https://www.invisiblethemepark.com/?p=400 | niedrig. Die Pläne gehen vor |
| Schreibzimmer gemessen: x ≈ 183,1–187,7, z ≈ 5,1–11,2 (Länge ≈ 4,6 m). Eine Quelle nennt 16 ft (4,9 m) | [FOW]; https://metroairportnews.com/the-hindenburg/ (niedrig) | mittel |
| Promenaden an beiden Seiten mit Sitzgelegenheiten und großen, nach außen geneigten Fenstern, im Flug zu öffnen | airships.net; de.wikipedia; Tagebuch (drei Fenster offen) | hoch |
| Kabinenblock mittig: 25 Doppelkabinen, 50 Betten, ohne Fenster | alle Quellen; [DZR36] Bettnummern 1–50 | hoch |
| **Kabinen in vier Längsreihen mit DREI Längsgängen** (nicht zwei) | [DZR36], [FOW]; de.wikipedia „an drei Gängen“; Airship Heritage Trust „four rows“ | hoch |
| Kabinen je Reihe von Backbord nach Steuerbord: 6 + 6 + 6 + 7 = 25 (in der Backbord-Außenreihe nimmt die Anrichte einen Kabinenplatz ein) | [DZR36] | hoch |
| Nummerierung nach Bettpaaren 1/2 … 49/50 in Schlangenlinie: Steuerbord-Außenreihe von achtern (1/2) nach vorn (13/14), Steuerbord-Innenreihe von vorn (15/16) nach achtern (25/26), Backbord-Innenreihe von achtern (27/28) nach vorn (37/38), Backbord-Außenreihe von vorn (39/40) nach achtern (49/50) | [DZR36] | hoch (für den Prospektplan) |
| Kabinen zum Teil Rücken an Rücken: Bettwände und Waschbeckenwände wechseln einander ab | [DZR36] (Bett-Symbole „X“ und Doppel-Waschtisch-Symbole auf den Querwänden) | mittel |
| **Treppenhaus am HECKENDE** mittig: Querhalle (Foyer) über die ganze Breite zwischen Speisesaal und Lounge, dazu zwei Treppenläufe nach unten links und rechts der Mittelachse | [DZR36] („Stairs“ unten), [FOW] („Stairways to ‚B‘ Deck“ an Ring 173) | hoch |
| Foyer mit Anschlagbrett (Funknachrichten, Positionskarte). Von dort führen die Treppe nach unten und Gänge zu den Kabinen | Courtney nach garemaritime.com | mittel |
| Hindenburg-Büste „über der Foyertreppe“, also am Treppenhaus im Achterfoyer | Courtney nach garemaritime.com | mittel (genaue Stelle unbelegt) |
| Anrichte (Serving Pantry) in der Backbord-Außenreihe des Kabinenblocks, etwa Mitte der Länge, offen zum Speisesaal; darunter der Speiseaufzug zur Küche | [FOW] („Serving Pantry“, „Dumbwaiter to Serving Pantry“); [DZR36] (Sonderraum zwischen Kabinen 43/44 und 45/46); airships.net ?p=4351; de.wikipedia | hoch |
| Keine Toiletten auf dem A-Deck. Toiletten und Dusche liegen auf dem B-Deck | airships.net; rarehistoricalphotos.com | hoch |
| Flügel an der vorderen Innenecke der Lounge, gleich hinter der Querwand zum Schreibzimmer | [FOW] | mittel |

### 2.2 Grundriss A-Deck 1936 in Modellkoordinaten (aus [FOW], gegengeprüft mit [DZR36])

| Raum | x0–x1 | z0–z1 | Bemerkung |
|---|---|---|---|
| Fensterband/Hülle Backbord | 173,3–187,7 | −12,5 … −11,2 | geneigte Fenster, oben außen |
| Promenade Backbord | 173,3–187,7 | −11,2 … −9,2 | Brüstung bei z ≈ −9,2, Durchgang bei x ≈ 180,3–180,9 |
| Speisesaal | 173,3–187,7 | −9,2 … −5,3 | 6 Tische in zwei Dreiergruppen bei z ≈ −8,6 … −7,3; Anrichten/Buffets an der Kabinenwand (z ≈ −5,7) |
| Anrichte (Pantry) | ≈180,3–181,8 | −5,3 … −3,4 | in der Kabinenreihe 1 |
| Kabinenreihe 1 (Bb außen, 6 Kabinen + Anrichte) | ≈174,3–187,7 | −5,3 … −3,4 | Kabinen 39/40 … 49/50 |
| Gang 1 | 175,5–187,7 | −3,4 … −2,5 | |
| Kabinenreihe 2 (6 Kabinen) | ≈176,3–187,7 | −2,5 … −0,6 | 27/28 … 37/38, endet vor dem Treppenhaus |
| Mittelgang | 175,5–187,7 | −0,6 … +0,4 | führt zwischen beide Treppenläufe |
| Kabinenreihe 3 (6 Kabinen) | ≈176,3–187,7 | +0,4 … +2,2 | 15/16 … 25/26 |
| Gang 3 | 175,5–187,7 | +2,2 … +3,2 | |
| Kabinenreihe 4 (Stb außen, 7 Kabinen) | ≈174,3–187,7 | +3,2 … +5,1 | 1/2 … 13/14 |
| Treppenlauf Backbord (quer laufend) | ≈174,3–175,3 | −3,4 … −0,6 | Stufen quer zur Schiffsachse |
| Treppenlauf Steuerbord (quer laufend) | ≈174,3–175,3 | +0,4 … +3,2 | |
| Foyer/Querhalle achtern | 173,3–174,3 (bis 175,5 zwischen den Läufen) | −5,3 … +5,1 | Verbindung Speisesaal ↔ Lounge; Büste, Anschlagbrett |
| Schreib- und Lesezimmer | 183,1–187,7 | +5,1 … +11,2 | Querwand bei x ≈ 183,1 mit Tür |
| Gesellschaftsraum (Lounge) | 173,3–183,1 | +5,1 … +8,8 (Sitzgruppen), Brüstung bei z ≈ 8,8 | Flügel bei x ≈ 180,9–182,7, z ≈ 5,4–7,3 |
| Promenade Steuerbord | 173,3–187,7 | +8,8 … +11,2 | |
| Fensterband/Hülle Steuerbord | 173,3–187,7 | +11,2 … +12,6 | |

Maßprobe: Eine Kabinenreihe ist ≈1,9–2,0 m breit (z). Das passt zur Kabinengröße 78 × 66 in = 198 × 168 cm (airships.net). Daraus folgt: Die 1,98 m liegen quer zur Schiffsachse, die 1,68 m längs. Die Gänge sind etwa 0,9–1,0 m breit.

### 2.3 Ausstattung A-Deck

| Angabe | Quelle | Sicherheit |
|---|---|---|
| Speisesaal: Rohrmöbel aus Aluminium von Breuhaus, Stühle rot gepolstert | airships.net; simpleflying.com | hoch |
| Speisesaal: 6 Tische im Prospektplan, 4 quadratische mit je 4 Stühlen und 2 runde mit etwa 6 Stühlen (≈28 Plätze) | [DZR36], [FOW] | mittel |
| Widersprüche zur Tischzahl: „sechs quadratische Tische à vier Stühle plus Wandtische, alle 50 Passagiere auf einmal“ (Airship Heritage Trust); „11 Tische, 34 Plätze je Sitzung“ (metroairportnews.com); „alle fünfzig in einer Sitzung“ (cruiselinehistory.com); de.wikipedia: bis 1936 gemeinsam, ab 1937 zwei Tischzeiten, Tische zu einer Tafel zusammenstellbar | jeweilige URLs | niedrig bis mittel |
| Tischwäsche aus Leinen, feines Porzellan und Glas | Airship Heritage Trust; metroairportnews | mittel |
| Lounge: Aluminiummöbel, braun gepolstert | airships.net | hoch |
| Wände der Gesellschaftsräume mit Ballonstoff/Seide bespannt, darauf Malereien von Otto Arpke in Spritz- bzw. Schablonentechnik | de.wikipedia; Google Arts & Culture (Zeppelin Museum), https://artsandculture.google.com/asset/salon-of-the-lz-129-hindenburg-fritz-august-breuhaus-de-groot/YQG354EvUEoi5g | hoch |
| Wandbild Speisesaal: Südamerikafahrten des „Graf Zeppelin“ (airships.net) bzw. „Reiseziele der Zeppeline“ (de.wikipedia) | wie genannt | hoch (Thema), Formulierungen weichen ab |
| Wandbild Lounge: stilisierte Weltkarte mit Routen von Magellan, Cook, Vasco da Gama, Kolumbus, LZ 126, Graf Zeppelin sowie der Schnelldampfer Bremen und Europa | airships.net; en.wikipedia | hoch |
| Wandbilder Schreibzimmer: **Widerspruch.** airships.net: Szenen aus aller Welt; de.wikipedia: Geschichte der Postbeförderung | wie genannt | mittel |
| Schreibzimmer: Schreibplätze, Lesetische, Sessel, Bücher- und Zeitungsschrank (vom Steward aufgeschlossen), Briefkasten | de.wikipedia; Courtney; invisiblethemepark (zwei Schreibtische) | mittel |
| Blüthner-Stutzflügel aus Aluminium/Duralumin, mit gelbem Schweinsleder bezogen, 1936 an Bord, vor der Saison 1937 ausgebaut | airships.net; de.wikipedia; en.wikipedia | hoch |
| Gewicht des Flügels: **Widerspruch.** 356 lb/161 kg (airships.net), 377 lb (cruiselinehistory.com), ≈180 kg (de.wikipedia), „unter 400 lb“ (invisiblethemepark) | wie genannt | mittel |
| Flügel 1943 bei einem Luftangriff auf Leipzig zerstört | de.wikipedia | mittel |
| Porträt Hitlers in der Lounge (Fotobeschriftung) | airships.net, Bildunterschrift mit Emilie Imhof | hoch |
| Beheizung durch Warmluft, erwärmt mit Kühlwasser der vorderen Motoren | airships.net | hoch |
| Bodenbeläge, Deckenleuchten, Wandfarben der Gesellschaftsräume | nicht belegt | – |

### 2.4 Kabinen (A-Deck)

| Angabe | Quelle | Sicherheit |
|---|---|---|
| Etwa 78 × 66 in (198 × 168 cm). Ein Passagiertagebuch nennt etwa 5 × 8 ft | airships.net; Tagebuch https://www.airships.net/hindenburg/flight-schedule/hindenburg-flight-passenger-diary/ | hoch |
| Unteres Bett fest, oberes tagsüber an die Wand geklappt | airships.net | hoch |
| Klappwaschbecken aus weißem Kunststoff/Zelluloid mit warmem und kaltem Wasser, Klapptisch bzw. Schreibbrett, Klapphocker, Rufknopf, schmaler Schrank mit Vorhang, Kleiderhaken, Gepäck unter dem unteren Bett | airships.net; de.wikipedia; Courtney; Tagebuch | hoch |
| Wände und Türen aus dünnem, stoffbespanntem Leichtschaum, hellhörig; Rahmen aus Aluminium | airships.net; Tagebuch (Perkal-Stoff, Aluminiumrahmen) | hoch |
| Kabinenfarben hellblau, grau oder beige, jede Kabine in eigenem Ton | airships.net; Tagebuch | hoch |
| Matratze aus Luftkissen, Federbett | Courtney | mittel |
| Schild „Rauchen verboten“ neben dem Bett | Tagebuch | mittel |
| Breuhaus entwarf die Kabine zusammen mit Cäsar F. Pinnau (1935–37) | de.wikipedia Fritz August Breuhaus | mittel |
| Schiebe- oder Drehtür | **nicht belegt** | – |
| Metroairportnews behauptet „Möbel und Wände aus feuerfestem Leder“ | metroairportnews.com | niedrig. Widerspricht allen anderen Quellen |

---

## 3. B-Deck 1936

### 3.1 Faktentabelle

| Angabe | Quelle | Sicherheit |
|---|---|---|
| Kielgang mittig über die volle Länge. Backbord: Mannschaftsbereich, Steuerbord: Passagierbereich | de.wikipedia; [FOW] | hoch |
| **Backbord von vorn nach achtern:** Offiziersmesse → Küche (mit Speiseaufzug an der Außenseite, achteres Ende) → Mannschaftsmesse → Dusche und eine Toilette → Treppe/Fallreep | [FOW] beschriftet; [DZR37] („Officers’ Mess, Kitchen, Crews Mess, Shower Bath“) | hoch |
| Widerspruch: de.wikipedia setzt Küche und Spülküche „zwischen“ die Messen. Das passt zu [FOW], nur die Reihenfolge Offiziers- vor Mannschaftsmesse steht in den Plänen. Courtney verortet die Duschen backbords, airships.net nennt „eine Dusche“ | wie genannt | – |
| **Steuerbord von vorn nach achtern:** Rauchsalon → (innen) Zahlmeisterkabine/-büro, (außen) Bar, dazwischen Luftschleuse → Passagiertoiletten → Treppe zum A-Deck/Fallreep | [FOW] beschriftet; [DZR37] („Smoking Room, Pursers Office, Bar“) | hoch |
| Rauchsalon: Überdruck gegen eindringendes Gas, Zugang nur über die Bar und eine Doppeltür-Schleuse, ein einziges elektrisches Feuerzeug, Barmann Max Schulze überwacht die Schleuse | airships.net; en/de.wikipedia; Courtney | hoch |
| Rauchsalon: Polsterbank in L-Form an Vorder- und Außenwand, 4 Sitzgruppen mit kleinen Tischen | [DZR37] (punktierte Bankfläche), [FOW] | mittel |
| Rauchsalonmöbel: **Widerspruch.** Dunkel blau-graues Leder (airships.net) gegen schwarzes Leder (Airship Heritage Trust). Wände blau mit gelbem Schweinsleder (airships.net), Lederwände mit vergoldeten Luftschiffmotiven (Tagebuch). Wandbilder: Geschichte der Luftfahrt leichter als Luft von der Montgolfière bis LZ 127, dazu eine Karte des Nordhimmels (de.wikipedia) | wie genannt | mittel |
| Rauchsalon: niedrige Brüstung vor waagerechten, nicht zu öffnenden Fenstern, Blick senkrecht nach unten | airships.net (sealed windows); Tagebuch | hoch |
| Bar: kleiner Vorraum zwischen Rauchsalon und Schleusentür zum Flur | airships.net | hoch |
| Toiletten getrennt für Damen und Herren; [FOW] zeigt 4 WCs innen am Kielgang, Urinale an der Vorderwand, Waschbecken | airships.net; [FOW]; cruiselinehistory (Urinale) | hoch (Lage) / mittel (Zahl) |
| Eine Dusche mit schwachem Wasserstrahl und Zeitabschaltung | airships.net; Courtney | hoch |
| Küche vollelektrisch: Herd mit 4 Platten, Back- und Bratofen, Kühlschrank; Speisen per Aufzug zur Anrichte | de.wikipedia; Courtney | hoch |
| Messen: Mannschaft 24 Plätze, Offiziere 12 Plätze | de.wikipedia (nach Waibel) | mittel. In [FOW] wirkt die Offiziersmesse dafür sehr klein |
| Kabine des Chefstewards Heinrich Kubis mit Tür zum Kielgang, die einzige Verbindung zwischen Mannschafts- und Passagierbereich | airships.net | mittel (Lage in den Plänen nicht beschriftet; [FOW]/[DZR37] zeigen nur eine Zahlmeisterkabine bzw. ein Zahlmeisterbüro) |
| Fallreep: zwei nach unten schwenkbare Treppen | de.wikipedia | hoch |
| Fallreep am HECKENDE des B-Decks, je ein Treppenschacht beiderseits des Kielgangs; dort liegen vorn die Treppe zum A-Deck und dahinter das Fallreep | [FOW] („Stairway to ‚A‘ Deck“, „Embarking/Disembarking Gangway“), [FOWP] | mittel bis hoch |
| Am oberen Ende des Fallreeps liegt das Foyer, wo ein Steward Kameras und Feuerzeuge einsammelte | Tagebuch; facesofthehindenburg (Adelt) | mittel |

### 3.2 Grundriss B-Deck 1936 in Modellkoordinaten (aus [FOW], gegengeprüft mit [DZR37])

| Raum | x0–x1 | z0–z1 | Bemerkung |
|---|---|---|---|
| Kielgang | 173,3–187,7 (setzt sich vorn und achtern fort) | −0,5 … +0,5 | |
| Fensterband Backbord | 173,3–187,7 | −5,2 … −4,3 | |
| Offiziersmesse | 185,3–187,7 | −4,3 … −0,5 | Rundtisch/Bank; Tür zum Kielgang vorn innen |
| Küche | 180,8–185,3 | −4,3 … −0,5 | Herdzeile vorn, Arbeitstische innen |
| Speiseaufzug | ≈181,3–181,8 | −4,3 … −3,6 | senkrecht unter der Anrichte des A-Decks |
| Mannschaftsmesse | 178,1–180,8 | −4,3 … −0,5 | zwei Tische mit Bänken |
| Dusche | ≈176,7–177,9 | −1,9 … −0,5 | |
| Toilette (Backbord) | ≈175,6–176,7 | −3,0 … −0,5 | |
| Treppe zum A-Deck + Fallreep Backbord | 173,3–175,6 | −3,3 … −0,5 | Seitengang außen bei z ≈ −4,3 … −3,3 |
| Rauchsalon | 183,3–187,7 | +0,5 … +4,2 | |
| Zahlmeisterkabine | ≈180,3–183,1 | +0,5 … +1,6 | |
| Luftschleuse | ≈180,5–181,6 | +1,6 … +2,6 | |
| Bar | ≈180,8–182,6 | +2,4 … +4,2 | |
| Passagiertoiletten | 175,8–179,8 | +0,5 … +3,0 | 4 WCs innen, Urinale vorn |
| Treppe zum A-Deck + Fallreep Steuerbord | 173,3–175,6 | +0,5 … +3,7 | Seitengang außen z ≈ 3,7–4,3 |
| Fensterband Steuerbord | 173,3–187,7 | +4,2 … +5,1 | |

---

## 4. Fenster

| Angabe | Quelle | Sicherheit |
|---|---|---|
| A-Deck: lange Reihen geneigter Fenster an beiden Seiten über die ganze Länge, unten nach außen geneigt, etwa 45° | en.wikipedia; Airship Heritage Trust (45°); metroairportnews (45°) | hoch (Reihe), mittel (Winkel) |
| A-Deck: im Flug zu öffnen; ein Zeitzeuge sah drei offene Fenster im Speisesaal | airships.net; Tagebuch; cruiselinehistory | hoch. Welche Scheiben genau öffneten, ist unbelegt |
| Fensterzahl A-Deck: im Seitenriss [FOWP] etwa 12 Scheiben je Seite (je 4 pro 5-m-Feld zwischen Hilfsringen) | [FOWP] | niedrig |
| Fensterzahl A-Deck: „sechs 45°-Plexiglasfenster je Promenade“ | metroairportnews.com | niedrig (dieselbe Quelle nennt 100 ft Promenadenlänge, was nicht stimmen kann) |
| Fensterbänder in den Plänen in drei Felder je 5 m gegliedert, passend zu den Hilfsringen | [FOW], [DZR37] | mittel |
| B-Deck: Fenster fast waagerecht im Rumpfboden, nahe Bodenhöhe, Blick senkrecht nach unten; im Rauchsalon nicht zu öffnen | Tagebuch; Airship Heritage Trust; de.wikipedia; airships.net | hoch |
| Fluchtsprung durch die Lounge-Fenster bei der Katastrophe aus etwa 15 ft Höhe | facesofthehindenburg (Adelt) | mittel |

## 5. Zugang

| Angabe | Quelle | Sicherheit |
|---|---|---|
| Einstieg über zwei herabklappbare Treppen (Fallreeps) aus dem Rumpfboden am Heckende des Passagierbereichs, ins B-Deck und weiter über die Treppen zum Foyer des A-Decks | de.wikipedia; [FOW]; [FOWP] | mittel bis hoch |
| Vom Passagierbereich zum Kielgang: Kubis’ Kabine mit Tür zum Kielgang (airships.net); bei Führungen über eine „Vorhalle“ auf den Laufsteg (Tagebuch); Zugang zum B-Deck durch eine Schotttür (Courtney) | wie genannt | mittel |
| Zur Führergondel: im Kielgang nach vorn, dann eine Leiter von etwa 12 ft aus einer kleinen Kammer hinunter | Tagebuch | mittel |

---

## 6. Änderungen 1937 (Umbau Winter 1936/37 in Frankfurt)

| Angabe | Quelle | Sicherheit |
|---|---|---|
| Neue Kabinen auf dem B-Deck **achtern des Passagierbereichs, in Bucht 11 hinter Ring 173**, an **Steuerbord** des Kielgangs, mit Fenstern, etwas größer als die A-Deck-Kabinen | airships.net; [DZR37]; en.wikipedia/rarehistoricalphotos („starboard side aft“); facesofthehindenburg (Doehner-Kabine „aft of the smoking room“, Fensterreihe im Boden) | hoch |
| Plan 1937: vorn eine Steward-Kabine, dann 8 Doppelkabinen (Betten 51/52 … 65/66) und am Ende eine Vierbettkabine (67–70); innen ein Längsgang mit 3 WCs zum Kiel hin | [DZR37] | hoch |
| Zahl: **Widerspruch.** 9 Kabinen (airships.net, en.wikipedia: 8 × 2 + 1 × 4 Betten) gegen 10 Kabinen (de.wikipedia). Auflösung: 9 Passagierkabinen plus 1 Steward-Kabine = 10 Räume | [DZR37] | hoch |
| Kapazität 1937: **70** Betten (Bettnummern bis 70 im Prospekt 1937) | airships.net; en.wikipedia; [DZR37] | hoch |
| Widerspruch: 72 (de.wikipedia, Airship Heritage Trust, en.wikipedia-Spezifikation „later upgraded to 72“). en.wikipedia führt die 72 auf die 72 Passagiere der „Millionärsfahrt“ im Oktober 1936 zurück | wie genannt | Die 72 als Bettenzahl ist unwahrscheinlich |
| Grundriss des Anbaus (abgegriffen; Maßstab 25 px/m aus dem Haupt-B-Deck): x ≈ 158–173, Gang z ≈ +2,4 … +3,1, Kabinen z ≈ +3,1 … +6,1, Fensterband z ≈ +6,1 … +8,0; WC-Ausbuchtung z ≈ +1,6 … +2,4 bei x ≈ 163–168; je Kabine etwa 1,45–1,5 m lang (x); Vierbettkabine über die volle Breite z ≈ 2,4–6,1 bei x ≈ 158–159,5 | [DZR37] | niedrig (schematisch; der Fensterabstand weicht vom Haupt-B-Deck ab) |
| Zugang zum Anbau über den äußeren Seitengang am Steuerbord-Treppenschacht nach achtern | [DZR37] („Stairs“ mit Durchgang nach achtern) | mittel |
| Übriges B-Deck 1937 gegenüber [FOW] 1936 unverändert (Messen, Küche, Rauchsalon, Bar, Toiletten, Treppen) | Vergleich [FOW] mit [DZR37] | mittel |
| Blüthner-Flügel ausgebaut | airships.net; de/en.wikipedia | hoch |
| Speisesaal ab 1937 in zwei Tischzeiten | de.wikipedia | mittel |
| Olympische Ringe außen entfernt (betrifft die Hülle, nicht die Decks) | rarehistoricalphotos.com | mittel |
| Fahrpreis von 400 auf 450 US-Dollar | simpleflying.com | mittel |
| Änderungen am A-Deck 1937 außer dem Flügel | nicht belegt | – |

---

## 7. Abweichungen des Modells (decks.js)

Legende: **grob falsch** / **leicht abweichend** / **passt**

### Allgemein

| Thema | Ist (Modell) | Soll (belegt) | Dringlichkeit |
|---|---|---|---|
| Deckhöhe | A_Y −15,0, B_Y −17,6 | A ≈ −16,9, B ≈ −19,5 (Kielganghöhe); Deckabstand 2,6 passt | grob falsch (mittel sicher) |
| Breite A-Deck | Böden bis an die Hülle (≈ ±13,5), Promenade bis ±12,9, Handlauf ±13,75 | Außenwand/Fensterfuß ≈ ±11,2, Gesamtbreite ≈ 22 m | grob falsch |
| Breite B-Deck | Räume bis z ±9,2 | Fensterband ≈ ±4,3 … ±5,2 | grob falsch |
| Ausrichtung | Treppe/Büste vorn, Schreibzimmer achtern | Treppenhaus/Foyer/Fallreep achtern (Ring 173), Schreibzimmer und Offiziersmesse/Rauchsalon vorn (Ring 188) | grob falsch |

### A-Deck

| Raum | Ist (decks.js) | Soll | Dringlichkeit |
|---|---|---|---|
| Speisesaal | x 173,2–187,8, z −11,2…−6,6; 8 Tische (2 × 4), alle eckig, rote Stühle | x 173,3–187,7, z −9,2…−5,3; 6 Tische (4 eckig, 2 rund), Buffets an der Kabinenwand; rote Polster passen | leicht abweichend (Lage), Tische grob |
| Promenade Bb | z −12,9…−11,2, Geländer mit zwei Lücken bei z −11,2 | z −11,2…−9,2, niedrige geschwungene Brüstung in zwei Abschnitten, eine Lücke etwa mittschiffs | leicht abweichend |
| Gesellschaftsraum | x 177,6–187,8 (vorn), z 6,6–11,2 | x 173,3–183,1 (achtern), z 5,1–8,8 + Promenade | grob falsch (vertauscht) |
| Schreibzimmer | x 173,2–177,4 (achtern), Wand bei x 177,5 | x 183,1–187,7 (vorn), Querwand bei ≈183,1 | grob falsch (vertauscht) |
| Promenade Stb | z 11,2–12,9 | z 8,8–11,2 | leicht abweichend |
| Flügel | x 179,3, z 7,9 | ≈ x 181,8, z 6,3 (vordere Innenecke der Lounge) | leicht abweichend; nach dem Tausch der Räume liegt er wieder richtig zur Lounge |
| Wandkarte Lounge | an der Kabinenwand z 6,56, x ≈ 179,7–186,7 | an der Lounge-Innenwand (Kabinenblock), dann x ≈ 173,3–183,1 | leicht abweichend |
| Kabinenblock | x 174,4–186,6, z ±6,5 | x ≈ 174,3–187,7, z −5,3…+5,1 | leicht abweichend |
| Kabinenreihen | 4 Reihen, 7/6/5/7 Kabinen, 2 Längsgänge bei z ±3,85, geschlossener Mittelbereich z ±1,25 mit Treppe | 4 Reihen, 6/6/6/7 Kabinen (Bb → Stb), 3 Längsgänge (z ≈ −3,0, 0, +2,7), Anrichte in Reihe 1 | grob falsch |
| Kabinenmaß | Reihenbreite ≈1,9 m (passt), Länge 12,2/n (1,74–2,44 m) | ≈1,98 × 1,68 m | leicht abweichend |
| Kabinennummern | 1–25 fortlaufend je Reihe | Bettpaare 1/2 … 49/50 in Schlangenlinie (siehe 2.1) | leicht abweichend |
| Kabinenwände | M.wallBlue für alle | hellblau, grau oder beige im Wechsel; Stoff auf Schaum | leicht abweichend |
| Kabinentüren | Schiebetüren aus hellem Holz | Bauart unbelegt; Material Schaum mit Stoffbezug | leicht abweichend (Material) |
| Etagenbett, Klappwaschbecken, Hocker, Klapptisch, Vorhangschrank | vorhanden | belegt | passt |
| Querflure | zwei Querflure (achtern x 173,2–174,3, vorn x 186,7–187,8) | nur eine Querhalle achtern (Foyer mit Treppen); vorn grenzen die Kabinen direkt an die Wand | grob falsch |
| Treppe A↔B | eine Treppe mittig, längs, x 185,6 → 181,6, z 0,1–1,2 | zwei quer laufende Läufe am Achterende, x ≈ 174,3–175,3, z −3,4…−0,6 und +0,4…+3,2 | grob falsch |
| Büste | x 186, z −0,9 (vorn) | am Foyer/Treppenhaus achtern (genaue Stelle unbelegt) | grob falsch |
| Anrichte/Pantry | fehlt; Speiseaufzug nur auf dem B-Deck bei x 185,2–186, z −2,3…−1,45 | Anrichte im Kabinenblock x ≈ 180,3–181,8, z −5,3…−3,4; Aufzug darunter | grob falsch |
| Wandbilder Speisesaal | 3 prozedurale Landschaften mit Zeppelin | Arpke, Südamerikafahrten; Darstellung prozedural vertretbar | passt (inhaltlich ungefähr) |
| Infotext Kabinen „50 auf 72“ | 72 | 70 | leicht abweichend |
| Infotext Flügel „160 kg“ | 160 kg | 161 kg (airships.net), andere Angaben bis 180 kg | passt |

### B-Deck

| Raum | Ist (decks.js) | Soll | Dringlichkeit |
|---|---|---|---|
| Mittelflur | z ±1,2/±1,3, an beiden Enden Schotttüren und Rampen zum Kielgang | Kielgang ≈1 m breit (z ±0,5) läuft durch; Passagier- und Mannschaftsseite durch Wände getrennt | leicht abweichend |
| Offiziersmesse | Bb achtern, x 173,3–176,8, z −9,2…−1,4 | Bb vorn, x 185,3–187,7, z −4,3…−0,5 | grob falsch |
| Mannschaftsmesse | x 177–180,6 | x 178,1–180,8 (Lage ungefähr passend, aber schmaler) | leicht abweichend |
| Küche | x 180,8–186,0 | x 180,8–185,3 | leicht abweichend (Breite falsch) |
| Speiseaufzug | x 185,2–186, innen am Flur | x ≈ 181,3–181,8, außen (z ≈ −4) | grob falsch |
| Dusche | Stb, x 180,2–184,0, großer Raum | Bb achtern, ≈1,2 × 1,4 m bei x ≈ 176,7–177,9 | grob falsch |
| Toiletten | Stb innen, x 173,3–175,8 | Stb x 175,8–179,8, z 0,5–3,0 (4 WCs + Urinale), dazu 1 WC backbords | grob falsch |
| Bar | Stb innen, x 176–180, Theke längs | Stb außen, x ≈ 180,8–182,6, z 2,4–4,2, direkt hinter dem Rauchsalon | grob falsch |
| Luftschleuse | Tür bei x ≈ 179, z ≈ 4,9 (Bar → Rauchsalon) | Schleuse zwischen Flur und Bar bei x ≈ 180,5–181,6, z 1,6–2,6; Rauchsalon über eine Tür in seiner Achterwand von der Bar aus | grob falsch |
| Rauchsalon | z 5,0–9,2 über die ganze Länge x 173,3–186 | vorn Stb, x 183,3–187,7, z 0,5–4,2; L-Bank an Vorder- und Außenwand | grob falsch |
| Zahlmeisterkabine | fehlt | x ≈ 180,3–183,1, z 0,5–1,6 | grob falsch (fehlt) |
| Fallreeps | fehlen; „Niedergang zum Kielgang“ als Rampen an beiden Enden | zwei Fallreeps achtern beiderseits des Kielgangs, x ≈ 173,3–174,5 | grob falsch |
| Treppe zum A-Deck | eine, mittig | zwei, achtern beiderseits des Kielgangs | grob falsch |
| B-Deck-Fenster | Handlauf bei z ≈ 9,8 | waagerechte Bodenfenster außen z ≈ ±4,3 … ±5,2 mit niedriger Brüstung | grob falsch |
| Möbel Rauchsalon blau, Lederwand | M.upBlue, M.wallLeather | blau-graues bzw. schwarzes Leder (Widerspruch), Wände blau/gelbes Schweinsleder | passt ungefähr |

### Zustand 1937 (noch nicht modelliert)

| Element | Ist | Soll | Dringlichkeit |
|---|---|---|---|
| Kabinenanbau B-Deck | fehlt | Bucht 11, x ≈ 158–173, Stb, Steward-Kabine + 8 Doppelkabinen + 1 Vierbettkabine, Fenster, Längsgang, 3 WCs | grob falsch (fehlt) |
| Flügel 1937 | Kommentar „nur 1936“, aber fest eingebaut | 1937 ausblenden | leicht abweichend |
| Kapazität im Infotext | 72 | 70 | leicht abweichend |

---

## 8. Nicht belegbar (bzw. nicht gefunden)

- Lichte Raumhöhe des A-Decks und genaue Deckhöhen in Metern. Nur aus dem Seitenriss [FOWP] grob abgeschätzt.
- Exakte Fensterzahl je Deck und Seite, Scheibengrößen und welche Scheiben sich öffnen ließen. Belegt ist nur „teils/einige öffenbar“.
- Fensterneigung des A-Decks als Messwert. „45°“ steht nur in Sekundärquellen.
- Bauart der Kabinentüren (Schiebe- oder Drehtür).
- Bodenbeläge (Teppich, Linoleum) und ihre Farben, Deckenausführung, Leuchtentypen.
- Wandfarben der Gesellschaftsräume. Belegt sind nur Ballonseide und Arpke-Malereien.
- Polsterfarbe im Schreibzimmer; im Modell grün, nicht belegt.
- Genauer Standort und Sockel der Hindenburg-Büste. Belegt ist nur „über der Foyertreppe“.
- Laufrichtung der beiden A↔B-Treppen (nach innen oder außen absteigend). Die Pläne zeigen nur quer liegende Läufe.
- Lage der Kubis-Kabine. airships.net nennt eine Tür zum Kielgang; die Pläne zeigen keine eigens beschriftete Kubis-Kabine.
- Einrichtung der B-Deck-Kabinen 1937 im Detail (Waschbecken, Fenstergröße) und genaue Maße des Anbaus.
- Ob das B-Deck auch an Backbord Fenster hatte, die sich öffnen ließen. Die Pläne zeigen dort durchgehende Fensterbänder, der Seitenriss nur einige.
- Sitzplatzzahl im Speisesaal: Die Quellen widersprechen sich (28 laut Plan, 34, „alle 50“).
- Zahl der Plätze in den Messen (24/12 nur laut de.wikipedia; das passt schlecht zur Raumgröße in [FOW]).

## Quellenliste

- airships.net, Passenger Decks: https://www.airships.net/hindenburg/interiors/
- airships.net, Inside the Hindenburg: https://www.airships.net/hindenburg-inside/
- airships.net, Crew Areas: https://www.airships.net/?p=4351
- airships.net, Passagiertagebuch 1936: https://www.airships.net/hindenburg/flight-schedule/hindenburg-flight-passenger-diary/
- airships.net, Design: https://www.airships.net/hindenburg/hindenburg-design-technology/
- Zeichnungen [DZR36], [FOW], [FOWP], [DZR37]: URLs siehe Abschnitt 0
- de.wikipedia LZ 129 (stützt sich auf Waibel, *LZ 129 Hindenburg*, 2020): https://de.wikipedia.org/wiki/LZ_129
- en.wikipedia LZ 129: https://en.wikipedia.org/wiki/LZ_129_Hindenburg
- en.wikipedia Hindenburg-class: https://en.wikipedia.org/wiki/Hindenburg-class_airship
- de.wikipedia Fritz August Breuhaus: https://de.wikipedia.org/wiki/Fritz_August_Breuhaus
- de.wikipedia Otto Arpke: https://de.wikipedia.org/wiki/Otto_Arpke
- Gare Maritime (W. B. Courtney, Collier’s 1937): https://www.garemaritime.com/sky-cruise-flight-hindenburg/
- Faces of the Hindenburg, Doehner: https://facesofthehindenburg.blogspot.com/2009/02/doehner-family.html
- Faces of the Hindenburg, Adelt: https://facesofthehindenburg.blogspot.com/2009/10/leonhard-and-gertrud-adelt.html
- Airship Heritage Trust: https://airshipsonline.com/airships/lz-129-hindenburg/
- Google Arts & Culture / Zeppelin Museum: https://artsandculture.google.com/asset/salon-of-the-lz-129-hindenburg-fritz-august-breuhaus-de-groot/YQG354EvUEoi5g
- Zeppelin Museum, LZ 129: https://www.zeppelin-museum.de/en/discover/part-l-lz-129-hindenburgl
- simpleflying.com: https://simpleflying.com/hindenburg-interior-guide/
- cruiselinehistory.com: https://www.cruiselinehistory.com/the-fabulous-hindenburg/
- metroairportnews.com (wenig verlässlich): https://metroairportnews.com/the-hindenburg/
- rarehistoricalphotos.com: https://rarehistoricalphotos.com/hindenburg-interior-photos/
- invisiblethemepark.com: https://www.invisiblethemepark.com/?p=368 , https://www.invisiblethemepark.com/?p=400
