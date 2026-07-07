'use strict';

const {
  buildStravaSnapshot,
  activityLoad,
  computeHeartrateLoad,
  zoneIndexForHr,
} = require('../server.js');

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

const sampleZones = { heartRateZones: [114, 133, 152, 171, 190] };

// 1. HF-Daten werden übernommen und gerundet
const withHr = buildStravaSnapshot([makeActivity({
  id: 1001,
  has_heartrate: true,
  average_heartrate: 142.7,
  max_heartrate: 178.5,
})], sampleZones);
assert(withHr.activities[0].summary.heartrate.avg === 143, 'avg HR should be rounded to 143');
assert(withHr.activities[0].summary.heartrate.max === 179, 'max HR should be rounded to 179');

// 2. has_heartrate=false erzeugt leeres Objekt
const withoutHr = buildStravaSnapshot([makeActivity({ id: 1002, has_heartrate: false, average_heartrate: 0, max_heartrate: 0 })], sampleZones);
assert(Object.keys(withoutHr.activities[0].summary.heartrate).length === 0, 'has_heartrate=false should not expose HR');

// 3. Fehlende HF-Felder erzeugen leeres Objekt
const missing = buildStravaSnapshot([makeActivity({ id: 1003 })], sampleZones);
assert(Object.keys(missing.activities[0].summary.heartrate).length === 0, 'missing HR fields should yield empty object');

// 4. Gemischte Aktivitäten: mit und ohne HF
const mixed = buildStravaSnapshot([
  makeActivity({ id: 2001, has_heartrate: true, average_heartrate: 130, max_heartrate: 160 }),
  makeActivity({ id: 2002, has_heartrate: false }),
  makeActivity({ id: 2003, has_heartrate: true, average_heartrate: 145 }),
], sampleZones);
assert(mixed.activities[0].summary.heartrate.avg === 130, 'first activity avg HR');
assert(Object.keys(mixed.activities[1].summary.heartrate).length === 0, 'second activity no HR');
assert(mixed.activities[2].summary.heartrate.avg === 145, 'third activity avg HR');
assert(!('max' in mixed.activities[2].summary.heartrate), 'third activity should not have max HR');

// 5. Dashboard-HF-Überblick: avg über Aktivitäten mit HF berechnet sicher anzeigbar
const hrActivities = mixed.activities.filter((a) => Number.isFinite(a.summary.heartrate.avg));
assert(hrActivities.length === 2, 'two HR activities in mixed list');
const avgHr = Math.round(hrActivities.reduce((sum, a) => sum + a.summary.heartrate.avg, 0) / hrActivities.length);
assert(avgHr === Math.round((130 + 145) / 2), 'dashboard avg HR calculation');

// 6. Zone-Zuordnung: Werte direkt auf Grenzen liegen korrekt
assert(zoneIndexForHr(100, sampleZones.heartRateZones) === 1, 'HR below first bound = zone 1');
assert(zoneIndexForHr(114, sampleZones.heartRateZones) === 1, 'HR equal first bound = zone 1');
assert(zoneIndexForHr(115, sampleZones.heartRateZones) === 2, 'HR just above first bound = zone 2');
assert(zoneIndexForHr(190, sampleZones.heartRateZones) === 5, 'HR at top bound = zone 5');
assert(zoneIndexForHr(200, sampleZones.heartRateZones) === 5, 'HR above top bound = zone 5');
assert(zoneIndexForHr(0, sampleZones.heartRateZones) === 0, 'invalid HR returns zone 0');

// 7. HF-Zonen-Load wird aus Dauer und avg-Zone berechnet
const hrLoad = computeHeartrateLoad(makeActivity({
  has_heartrate: true,
  average_heartrate: 145,
  moving_time: 3600,
}), sampleZones);
assert(hrLoad.load === 180, `60 min in zone 3 should yield 180 load, got ${hrLoad.load}`);
assert(hrLoad.source === 'hr_zones', 'source should be hr_zones');

// 8. activityLoad bevorzugt relative_effort vor HF-Zonen
const withEffort = activityLoad(makeActivity({
  relative_effort: 95,
  has_heartrate: true,
  average_heartrate: 180,
}), sampleZones);
assert(withEffort.load === 95, 'relative_effort wins');
assert(withEffort.source === 'relative_effort', 'source should be relative_effort');

// 9. activityLoad nutzt HF-Zonen, wenn kein relative_effort vorliegt
const hrBased = activityLoad(makeActivity({
  has_heartrate: true,
  average_heartrate: 120,
  moving_time: 1800,
}), sampleZones);
assert(hrBased.load === 60, '30 min in zone 2 should yield 60');
assert(hrBased.source === 'hr_zones', 'source should be hr_zones');

// 10. activityLoad Fallback ohne Zonen und ohne HR
const fallback = activityLoad(makeActivity({ distance: 15000, moving_time: 3600 }), null);
assert(fallback.load === 45, `fallback load should be 45 (15*2 + 60*0.25), got ${fallback.load}`);
assert(fallback.source === 'estimate', 'source should be estimate');

// 11. Snapshot enthält HF-Zonen, wenn welche übergeben wurden
assert(Array.isArray(mixed.heartrateZones.zones), 'snapshot should expose heart rate zones');
assert(mixed.heartrateZones.zones.length === 5, 'five zone boundaries');

// 12. Snapshot ohne Zonen enthält kein heartrateZones-Feld
const noZonesSnapshot = buildStravaSnapshot([makeActivity({ id: 4001 })]);
assert(!noZonesSnapshot.heartrateZones, 'snapshot should not contain zones when none provided');

console.log('\nAlle Herzfrequenz-Tests bestanden.');
