# Water Truck Tracker · Inukjuak

A simplified household delivery prototype based on Amenda Soucy's H4H challenge. Integrates the road router, destination pin and road-based movement from `hamza` (7b394f5), replacing its Iqaluit snapshot with Inukjuak roads. Keeps the laptop/iPhone preview switch.

## Run

```sh
python -m http.server 8000
```

Open http://localhost:8000/. Choose a location by clicking the map or dragging the home pin. ETAs and road routes recalculate from current truck positions. The nearest road is used within 300 metres; pins outside the road network show no estimate. Use **Choose on map** on the phone layout to scroll to the map.

The main screen shows the earliest available water delivery, trucks sorted by remaining road distance (including scheduled stops), and a text-and-colour water quality indicator. Quality details open on request. A truck sample never confirms household tank/tap safety.

The **Alerts** tab displays explicit demo service updates. Demo controls let reviewers select normal service, an eight-minute loading delay, a collision that stops WT-104, or a quality hold that stops WT-218. Unavailable trucks are excluded from the next-delivery estimate. Restart restores the initial fleet and destination. No live incident feed, sensor, dispatch or booking service is connected.

## Real geography, simulated service

- Real source: Inukjuak Water Treatment Plant, OpenStreetMap way [493122694](https://www.openstreetmap.org/way/493122694), approximately 58.457888, -78.104030. Only one local plant was verified; additional distant plants have not been invented. Plant-to-road departure is snapped to the mapped access road.
- Trucks originate at that facility and are initialized at different points along south village, airport road and west village rounds. Those rounds, stops, sample values and schedules are illustrative, not municipal dispatch routes.
- `roads.json` is an OpenStreetMap API snapshot fetched 2026-09-26, bounds `-78.16,58.42,-78.04,58.51`. Geometry © OpenStreetMap contributors, [ODbL](https://www.openstreetmap.org/copyright). Non-drivable highway types and ways tagged with prohibited/private motor vehicle access are excluded.
- Routing uses mapped one-way directions and 80% of mapped speed limits, or 20 km/h when no limit is mapped. Estimates include three-minute scheduled stops and active scenario delays. Road conditions, turn restrictions, conditional access and actual truck restrictions are not validated; this is not a navigation system.
- Routes end at the roadside; any offset from the household pin is disclosed. Truck positions advance only along road segments. Pausing pauses the simulated movement and delay countdown; restarting resets the demonstration.
- [Kativik Regional Government's Inukjuak intake vulnerability report](https://www.krg.ca/iu/assets/environment/drinking_water_report6.pdf) documents the treatment plant and truck-based distribution context.

Routing runs locally after loading the bundled snapshot, without sending household pins to a routing service. Leaflet and map tiles need internet access on first load. Text-only view works when the map library is unavailable; full offline startup is not implemented.

## Checks

```sh
node --test tests/*.test.js
```

Tests cover road continuity, speed assumptions, one-way routing, off-network destinations, separated rounds, on-road movement, delay/dwell accounting, blocked trucks and rerouting from current positions.
