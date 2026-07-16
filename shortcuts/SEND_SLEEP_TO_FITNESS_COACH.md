# Schlaf an Fitness Coach senden (iOS Shortcut)

Dieser Shortcut liest die Schlafdauer aus Apple Health und sendet sie an den Fitness Coach Server.

## Voraussetzungen

- iPhone mit Apple Health und Schlafdaten
- Tailscale auf dem iPhone aktiviert und im selben Netz wie der Server
- Fitness Coach Server läuft unter `http://100.117.104.116:5176`

## Shortcut anlegen

1. **Shortcuts App öffnen** → Neuer Shortcut → „Standard-Shortcuts“
2. Namen setzen: `Schlaf zu Fitness Coach`
3. Folgende Aktionen hinzufügen:

### Aktion 1: Health-Werte abfragen

- Typ: **Schlaf im Bett**
- Startdatum: **Gestern**
- Enddatum: **Heute**

### Aktion 2: Dauer berechnen

- Aktion: **Berechnen**
- Wert: **Magische Variable** aus Schritt 1
- Operation: `x 60`
- Hinweis: Health gibt Schlaf als Stunden/Minuten aus; hier wird es in Minuten umgerechnet. Falls du Minuten brauchst, passe entsprechend an.

### Aktion 3: Datum von gestern formatieren

- Aktion: **Datum**
- Wert: **Gestern**
- Aktion: **Datum formatieren**
- Format: `yyyy-MM-dd`

### Aktion 4: JSON zusammenbauen

- Aktion: **Text**
- Inhalt:
```
{
  "records": [
    {
      "k": "sleep:Datum",
      "v": "{\"date\":\"Datum\",\"minutes\":Dauer,\"source\":\"apple_health\"}"
    }
  ]
}
```
- Ersetze `Datum` durch die magische Variable aus Aktion 3.
- Ersetze `Dauer` durch die magische Variable aus Aktion 2 (als Zahl).

### Aktion 5: POST an Fitness Coach

- Aktion: **Inhalte von URL abrufen**
- URL: `http://100.117.104.116:5176/api/backup`
- Methode: **PUT**
- Anfragetext: JSON aus Aktion 4
- Kopfzeilen: `Content-Type: application/json`

### Aktion 6 (optional): Ergebnis anzeigen

- Aktion: **Benachrichtigung anzeigen** oder **Schnellansicht**
- Titel: „Schlaf gesendet“

## Automatisierung

1. **Kurzbefehl-App** → Automation → Persönliche Automation
2. Auslöser: **Wecker wird gestoppt** oder **Täglich um 07:30 Uhr**
3. Aktion: **Kurzbefehl ausführen** → `Schlaf zu Fitness Coach`
4. „Vor Ausführen bestätigen“ deaktivieren, damit es wirklich automatisch läuft

## Testen

- Tailscale auf dem iPhone aktivieren
- Shortcut manuell starten
- Auf dem Server prüfen:
  ```bash
  curl -s http://100.117.104.116:5176/api/backup | grep sleep
  ```

## Hinweis

- Falls du morgens den Schlaf vom Vortag senden willst, nutze „Gestern" als Datum.
- Falls du den aktuellen Tag meinst (z.B. Schlaf von Mitternacht bis morgens), nutze „Heute".
