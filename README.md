# Water Truck Tracker

Know water truck delivery status and see the latest reported quality from your delivery truck.

## Our proposal

Equip water trucks with GPS trackers and tank-mounted water-quality sensors. Give residents a simple app showing their assigned truck, arrival estimate, water status and service alerts.

- GPS tracking: Follow actual roads. Include loading, other deliveries and delays in the ETA. Infer activities from location and time stopped.
- Truck sensors: Send live quality readings when connected. Keep technical readings behind a simple status indicator.
- Offline estimates: Save the last update, then estimate progress along the known route. Show the update's age, a red offline dot and a dashed predicted path. Replace estimates when new data arrives.
- Nearby-device sharing: Eventually let another device share its latest timestamped report over Bluetooth. The button is only a placeholder today.

GPS tells us where a truck is, not whether water is flowing. Truck sensors report on the truck's water, not the household tank. Old readings must never look like fresh ones.

## What we've built

A six-truck simulation with road routing, loading/delivery stops, one truck assigned to your home, incident alerts, offline forecasting and laptop/iPhone previews. Home selection unlocks through **Choose on map** and locks after one selection.

All GPS data, sensor readings and incidents are simulated. Stop durations are assumptions, not measured local averages. Green **Safe** and orange **Unsafe** demonstrate the interface; they are not real safety assessments. Live hardware, validated quality reporting and Bluetooth transfer still need to be built and tested.

## Run

link: https://evanfoster07.github.io/hack-for-humanity/

Road data: © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright).
