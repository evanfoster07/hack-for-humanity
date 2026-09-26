# Water Truck Tracker · Inukjuak

A household water visibility prototype for Inukjuak, Nunavik, Québec, inspired by Amenda Soucy's *H4H Challenge Slides* (2026), especially slides 8 and 10–12.

## Our idea

Keep the truck tracker: residents can see simulated truck positions, approximate arrival times, and individual truck tank readings. Extend visibility through the full journey: source → treatment → truck → household tank → tap. A truck sample does not establish the status of water stored at home.

The interface adds a household tank level, a clear “check needed” status when household samples are missing, and a view of where information is missing along the journey. Status uses words as well as colour. All coordinates are illustrative points near Inukjuak, not actual homes or service routes. ETAs use straight-line distance, not road routing or dispatch schedules.

## Connectivity and maintenance

The text-only view keeps the household and truck information readable without a map. If the map library cannot load, the app falls back to this view. An already loaded page continues using its simulated data without connectivity and labels offline status. Initial offline loading is not supported; Leaflet and map tiles currently require the network.

Next steps to validate with residents and local water operators:
- Cache timestamped, verified readings and clearly distinguish stale or missing information.
- Trial truck GPS and tank sensors, alongside separate household tank and tap testing.
- Explore consent-based nearby-device relays when connectivity is limited; the AirTag-inspired idea is a concept, not an implemented tracking network.
- Co-design plain-language and Inuktitut labels locally, rather than inventing translations.
- Use locally serviceable components, replaceable sensors, calibration records and a repair workflow supported by local staff.

No live sensor, dispatch, advisory, peer-relay or maintenance service is connected. Demo readings are not drinking-water safety advice. The prototype does not represent an endorsement by the presenter or community.

## Run

```sh
python -m http.server 8000
```

Open http://localhost:8000/. Select a truck for readings; use Pause/Resume for the simulation, the home icon to reset the map, and “Use text-only view” for a compact display.
