'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
  buildStravaSnapshot,
  readAthleteZones,
  storeAthleteZones,
} = require('../server.js');

const DATA_DIR = path.join(__dirname, '..', 'data');
const ZONES_FILE = path.join(DATA_DIR, 'athlete-zones.json');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function makeActivity(overrides = {}) {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  return {
    id: Math.floor(Math.random() * 1e9),
    name: 'Test Ride',
    sport_type: 'Ride',
    start_date: `${day}T10:00:00Z`,
    start_date_local: `${day}T12:00:00`,
    distance: 20000,
    moving_time: 3600,
    total_elevation_gain: 100,
    ...overrides,
  };
}

// Sichern des aktuellen Zonen-Datei-Zustands, um das Repo sauber zu halten.
const zonesExisted = fs.existsSync(ZONES_FILE);
let zonesBackup = null;
if (zonesExisted) {
  zonesBackup = fs.readFileSync(ZONES_FILE, 'utf8');
}

function restoreZonesFile() {
  if (zonesExisted) {
    fs.writeFileSync(ZONES_FILE, zonesBackup);
  } else {
    try { fs.unlinkSync(ZONES_FILE); } catch { /* ignore */ }
  }
}

// 1. storeAthleteZones akzeptiert Strava-API-Format und speichert Metadaten
const apiResponse = {
  heart_rate: { zones: [114, 133, 152, 171, 190] },
  power: { zones: [150, 200, 250, 300, 350] },
};
const stored = storeAthleteZones(apiResponse);
assert(stored === true, 'storeAthleteZones should return true for valid zones');

// 2. Ungültige Zonen werden abgelehnt
const invalid = storeAthleteZones({ power: { zones: [] } });
assert(invalid === false, 'storeAthleteZones should reject zones without heart_rate');

// 3. readAthleteZones liefert normalisierte Struktur
const zones = readAthleteZones();
assert(zones !== null, 'should read athlete zones');
assert(Array.isArray(zones.heartRateZones), 'heartRateZones should be an array');
assert(zones.heartRateZones.length === 5, 'five heart rate zones');
assert(zones.source === 'strava', 'source should be strava');
assert(typeof zones.fetchedAt === 'string', 'fetchedAt should be set');

// 4. buildStravaSnapshot integriert Zonen in dailyLoads korrekt
const hrActivity = makeActivity({
  id: 5001,
  has_heartrate: true,
  average_heartrate: 145,
  moving_time: 60 * 60,
  relative_effort: undefined,
});
const snapshot = buildStravaSnapshot([hrActivity], zones);
assert(snapshot.activities[0].summary.load === 180, 'zone-based load should be 60 min * zone 3');
assert(snapshot.activities[0].summary.load_source === 'hr_zones', 'load source should be hr_zones');

// 5. Ohne Zonen fällt der Snapshot auf estimate zurück
const fallbackSnapshot = buildStravaSnapshot([hrActivity], null);
assert(fallbackSnapshot.activities[0].summary.load_source === 'estimate', 'fallback source should be estimate');
assert(fallbackSnapshot.activities[0].summary.load === 55, `fallback estimate should be 20 km * 2 + 60 min * 0.25, got ${fallbackSnapshot.activities[0].summary.load}`);

// 6. Fitness-Trend berücksichtigt HF-basierte Loads
const today = new Date().toISOString().slice(0, 10);
const highIntensity = makeActivity({
  id: 6001,
  has_heartrate: true,
  average_heartrate: 180,
  moving_time: 60 * 60,
});
const snapshotHigh = buildStravaSnapshot([highIntensity], zones);
const dailyLoad = snapshotHigh.ctlSpark[snapshotHigh.ctlSpark.length - 1];
assert(dailyLoad > 0, 'daily load should be positive');

// 7. Zustand der Zonen-Datei wiederherstellen/löschen
restoreZonesFile();

console.log('\nAlle HF-Zonen-Tests bestanden.');
