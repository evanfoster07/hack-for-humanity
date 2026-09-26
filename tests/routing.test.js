const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { RoadRouter, parseLimit, distanceKm } = require('../routing.js');

const roads = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'roads.json'), 'utf8'));
const router = new RoadRouter(roads);
const destination = { lat: 63.7467, lng: -68.5170 };
const starts = [
  { lat: 63.7508, lng: -68.5035 },
  { lat: 63.7394, lng: -68.5420 },
  { lat: 63.7563, lng: -68.5340 }
];

test('all demo trucks get a road route with a consistent ETA', () => {
  for (const start of starts) {
    const route = router.route(start, destination);
    assert.ok(route);
    assert.ok(route.legs.length > 1);
    assert.ok(route.distanceKm >= distanceKm(route.snappedStart, route.snappedEnd));
    assert.ok(route.startSnapMetres <= 300);
    assert.ok(route.endSnapMetres <= 300);
    const calculatedMinutes = route.legs.reduce(
      (sum, leg) => sum + leg.distanceKm / leg.speedKmh * 60, 0);
    assert.ok(Math.abs(calculatedMinutes - route.durationMinutes) < 1e-9);
    for (let i = 1; i < route.legs.length; i++) {
      assert.deepEqual(route.legs[i - 1].to, route.legs[i].from);
    }
  }
});

test('mapped limits change truck speed and missing limits remain explicit', () => {
  const profiles = starts.flatMap(start => router.route(start, destination).legs);
  assert.ok(profiles.some(leg => leg.limitKmh === 30 && leg.speedKmh === 24));
  assert.ok(profiles.some(leg => leg.limitKmh === 40 && leg.speedKmh === 32));
  assert.ok(profiles.some(leg => leg.source === 'assumed' && leg.limitKmh === null && leg.speedKmh === 20));
  assert.ok(Math.abs(parseLimit('20 mph') - 32.18688) < 0.00001);
});

test('pins away from the mapped roads have no invented straight-line route', () => {
  assert.equal(router.route(starts[0], { lat: 43.7, lng: -79.4 }), null);
});

test('one-way roads cannot be traversed backwards', () => {
  const square = new RoadRouter({
    bounds: {},
    nodes: {
      a: [0, 0], b: [0, 0.001], c: [0.001, 0.001], d: [0.001, 0]
    },
    ways: [
      { nodes: ['a', 'b'], tags: { highway: 'residential', oneway: 'yes', maxspeed: '30' } },
      { nodes: ['b', 'c', 'd', 'a'], tags: { highway: 'residential', maxspeed: '30' } }
    ]
  });
  const route = square.route({ lat: 0, lng: 0.0008 }, { lat: 0, lng: 0.0002 });
  assert.ok(route);
  assert.ok(route.distanceKm > 0.3, 'must travel around the square');
});
