# HF-Zonen-basierte Belastung

## Entscheidung

Wir holen die athletenweiten Herzfrequenz-Zonen über `GET /api/v3/athlete/zones` von Strava, speichern sie lokal in `data/athlete-zones.json` und nutzen sie für eine realistischere Belastungsschätzung pro Aktivität.

## Warum Option A (und nicht B oder C)

- **Option B** (pro Aktivität den `heartrate`-Stream abrufen) ist genau, aber massiv API-intensiv. Bei 100 Aktivitäten pro Sync würde das den Rate-Limit schnell belasten und viel Bandbreite verbrauchen.
- **Option C** (nur avg/max + Dauer) ist einfach, aber ignoriert die persönlichen HF-Zonen komplett und würde eine Einheit mit avg 120 bpm und eine andere mit avg 170 bpm bei gleicher Dauer gleich bewerten.
- **Option A** ist der pragmatische Mittelweg: die Zonen sind athletenweit, werden einmal pro Sync abgerufen und erlauben eine deutlich realistischere Einschätzung als Option C, ohne die API-Last von Option B.

## Implementierung

1. **Abruf:** `fetchStravaAthleteZones()` ruft `GET /api/v3/athlete/zones` ab.
2. **Speicherung:** `storeAthleteZones()` schreibt `heart_rate.zones` und Metadaten nach `data/athlete-zones.json`.
3. **Load-Berechnung:**
   - Primär bleibt Stravas `relative_effort` (Suffer Score), falls vorhanden.
   - Falls nicht vorhanden, aber HF-Zonen und Aktivitäts-HF vorhanden sind, wird ein vereinfachter HF-Zonen-Load berechnet:
     - Die Ø-HF wird einer Zone (1–5) zugeordnet.
     - Die Bewegungszeit wird mit dem Zonen-Faktor gewichtet (Zone × Minuten).
     - Ein leichter Max-HF-Cap verhindert Überbewertung durch kurze Spikes.
   - Falls keine Zonen/HF vorhanden sind, greift die bekannte Dauer+Distanz-Schätzung.
4. **Fitness-Trend:** Der berechnete Load fließt in die tägliche Last ein und damit in das Banister-Modell (CTL/ATL).
5. **UI:**
   - Die HF-Zonen werden in der Übersicht der letzten Aktivitäten angezeigt.
   - Pro Aktivität wird die Load-Quelle gezeigt (Strava / HF-Zonen / Schätzung).
   - Das Aktivitäts-Popup erklärt, wie der Load zustande kam.

## Einschränkungen

- Es handelt sich um eine **Schätzung**, keine medizinische TRIMP-Berechnung.
- Ruhepuls und Geschlecht sind Strava in diesem Endpunkt nicht bekannt, daher bleibt der Score konservativ.
- Wir kennen pro Aktivität nur Ø- und Max-HF, nicht die echte Zeit pro Zone.

## Datenschutz

- HF-Zonen werden nur lokal im Repo-Ordner gespeichert.
- Sie werden nicht geloggt und nicht an Dritte übertragen.
- Beim Trennen der Strava-Verbindung wird `data/athlete-zones.json` mitgelöscht.
