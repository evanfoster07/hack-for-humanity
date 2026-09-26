# hack-for-humanity

## Challenge

- Make water quality visible, understandable and accessible at the household level?
    - Detect & provide info about quality
    - Communicate complex quality info into simple status

## Ideas
- Truck tracker (ETA, quality per truck, water quality sensors in tanks) -> airtag idea
- Water quality updates, pinging other phones/devices that recently updated in case of connectivity lack
- Simple app UI for people, as they have phones
123

213


## Run Command
- python3 -m http.server 8000

## Web Address
- http://localhost:8000/

## Road-based demo

Open `http://localhost:8000/` and click the map to drop a destination pin. The three simulated trucks follow drivable OpenStreetMap road geometry within the bundled Iqaluit snapshot (`roads.json`, fetched 2026-09-26). Select a truck to see its remaining route, road distance, arrival estimate, current speed, and mapped road limit. Pause/Resume controls movement.

Mapped `maxspeed` values determine each truck's simulated speed at 80% of the limit; a road without a usable speed-limit tag uses a clearly labeled 25 km/h demo assumption. ETAs omit traffic, stops, weather, turn restrictions, and conditional speed limits. The route ends at the nearest road when a pin is off-road. Pins more than 300 m from a mapped drivable road and locations outside the snapshot show no route. The prototype does not use live truck positions.

The road snapshot comes from OpenStreetMap contributors through the OSM API 0.6 map endpoint, bounding box `-68.60,63.71,-68.45,63.78`. OpenStreetMap attribution appears on the map and page footer.
