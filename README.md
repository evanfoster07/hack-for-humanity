# Water Truck Tracker — Inukjuak

## The proposal

We want residents to be able to answer three questions without calling around: **Where is my water truck? When should I expect water? What do we know about the water in that truck?**

Our proposal combines GPS tracking on delivery trucks with water-quality sensors installed in their tanks. A simple phone interface shows the truck assigned to a household, its expected arrival, service alerts, and the latest reported water status. When connectivity drops, the app keeps the last received information and estimates the truck's progress along its known route. It tells the resident when it is estimating instead of receiving an update.

The idea responds to the household water-visibility challenge presented by Amenda Soucy, who is from Inukjuak, Nunavik. Truck tracking is the starting point. The larger purpose is to make the journey from treatment to the household easier to understand, including the points where information is missing.

**This repository is a working demonstration, not a connected municipal service. GPS positions, sensor readings, incidents and schedules are simulated. No tracking device or water sensor is connected to the website.**

## Why Inukjuak

Inukjuak's drinking water comes from the Innuksuac River. Water travels through a roughly 3 km heated pipeline to the treatment plant, where it is filtered, disinfected and stored before being loaded into delivery trucks. Trucks carry it to storage tanks at homes and other buildings. The [Kativik Regional Government's January 2025 report](https://www.krg.ca/iu/assets/environment/drinking_water_report6.pdf) documents this system.

The household experience depends on more than the treatment plant. A truck can be delayed, a route can change, and water can spend time in storage after delivery. Knowing that water was treated earlier does not tell a resident when it will arrive or establish the condition of the water in their own tank.

The challenge slides also ask us to account for limited connectivity, straightforward maintenance and local support. That is why the main screen concentrates on the next delivery and a short status message, with technical readings available only when someone wants them.

## What a resident would see

A resident chooses their home once. The location then locks so that normal map browsing does not accidentally change the delivery address. To move it, they press **Choose on map**, tap a new point or drag the pin, and the app locks the new selection automatically. The same button can cancel an unfinished change.

One truck is assigned to that household. Its card shows an expected arrival and its current activity. Other trucks remain visible, but they serve their own households and are labeled accordingly. Only the assigned truck's delivery path is highlighted.

Selecting a truck opens the details: where it is, what it appears to be doing, how long it has been stopped, its estimated remaining stop time, and its reported water status. An Alerts tab collects delays, incidents and quality holds so they are not buried in the map.

## GPS tracking and arrival estimates

In the proposed system, each truck would report a timestamped GPS position through an onboard device or a driver device. A dispatcher-provided route and assignment would tell the app which households that truck is serving. GPS by itself cannot tell us who is next on the delivery list.

The arrival estimate would combine the remaining road route with scheduled stops, expected loading time and known delays. A truck returning empty would need time to reach the plant and refill before it could make another delivery.

Position and time stopped can also suggest an activity. A truck that remains near the plant may be loading. A truck stopped at a household may be filling a tank. We would show these as inferred activities unless an operator or an additional sensor confirms them. GPS cannot prove that a hose is connected, that water is flowing, or that a delivery is complete.

The demo follows mapped roads and keeps trucks stationary during loading and filling. It includes six trucks at different positions and stages so those differences are easy to review. The six-truck fleet and staggered shift starts are presentation scenarios, not claims about Inukjuak's current fleet or dispatch schedule.

## Water-quality sensors in the trucks

**The proposal assumes water-quality sensors would be installed in the truck tanks to provide live readings while a connection is available.** Those readings would travel with a truck ID, a measurement timestamp and the sensor's status. They are a separate source of information from GPS.

The interface currently illustrates pH, turbidity, chlorine and temperature. The intended benefit is visibility after water leaves the plant: an operator could see a concerning change, hold a truck for a recheck and communicate that hold to residents.

There are two limits we need to explain when presenting:

- The prototype's green **Safe** and orange **Unsafe** labels are simulated states. They are not calculated safety judgments from the example values on screen. A real deployment would need a validated testing process, agreed reporting rules and water-operator review before using these labels.
- A reading from a truck does not establish the safety of water already in a household tank or coming from a tap. Household checks remain a separate part of the challenge.

Sensor calibration, cleaning, replacement and failed readings would need to be part of the service. A disconnected or faulty sensor must not silently leave an old green status looking current.

## What happens without a connection

Offline mode starts with the last received snapshot: each truck's position, route, activity, expected stop duration and the time of the update. The app estimates progress from that point rather than pretending it is still receiving GPS.

For example, if the last report placed a truck on a delivery road, the app can estimate how far it may have travelled using the saved route and speed assumptions. If it was filling a tank, the app can include the remaining assumed stop time before estimating the next leg. A new crash, unexpected delay or route change would not be known until another update arrives. Forecasts become less dependable as that information gets older.

The interface makes that distinction visible:

- The online/offline control sits beside the Laptop/iPhone preview controls.
- Offline dots turn red and the age of the last update is shown.
- Quality information is labeled as coming from the last update; it is not a new reading.
- Only the assigned truck can have a projected path. Offline, that dashed path is shown only when its last reported and predicted activities are household travel or household filling. Loading, dispatch waiting and return-to-plant states do not produce an offline delivery path.
- Reconnecting replaces the forecast with the latest available report. Offline mode does not create a new truck assignment or accept a changed home location.

The current demo preserves an unchanged last-online snapshot and runs a separate forecast from it. It does not include a complete offline installation: the page and road data must already have loaded, and map tiles may be unavailable without internet.

## Sharing a recent update with another device

We also want to explore whether a nearby device with a more recent update could share it over Bluetooth. That could help a resident who has no connection of their own.

A future transfer would need to preserve the original timestamp and source. Receiving a file now must not make an old reading look new. We would also need rules for consent, trusted senders and conflicting reports.

**Get latest data via Bluetooth is currently a placeholder button.** It does not scan for devices, request permission, connect or transfer data. Clicking it explains the proposed behavior and confirms that nothing was fetched.

## What we can demonstrate today

| Available in the prototype | Still proposed or unverified |
| --- | --- |
| Local road routing, locked home selection and one assigned truck | Actual municipal assignments and dispatch integration |
| Six trucks moving, stopping, filling and returning to the plant | Real GPS devices and operator-confirmed activities |
| Estimated arrivals that include stops and delays | Measured local loading and delivery durations |
| Simulated Safe/Unsafe states and detailed example readings | Installed tank sensors and validated quality decisions |
| Last-update timestamps and offline position forecasts | Field-tested forecast accuracy and full offline startup |
| Alerts for demonstration incidents | A live incident feed |
| Bluetooth button and explanation | Bluetooth data exchange |

## Timing assumptions used for the review

The app exposes these assumptions rather than presenting them as GPS measurements:

| Event | Demo duration | Basis |
| --- | --- | --- |
| Loading at the treatment plant | 25–35 minutes | Demonstration assumption; no Inukjuak loading duration was verified |
| Household filling stop | 6–10 minutes; 8 minutes at the assigned tank | Demonstration assumption informed by reporting that fills take a few minutes in nearby Puvirnituq |
| Plant dispatch queue | 10 minutes | Demonstration assumption |
| Initial staging wait for one truck | 2 hours | Deliberate longer-wait scenario |
| Road travel | 80% of a mapped speed limit, or 20 km/h if none is mapped | Routing assumption, not recorded driving behavior |

[APTN's reporting from Puvirnituq](https://www.aptnnews.ca/investigates/pipe-dreams-the-water-crisis-in-nunavik/) provides context for household filling, not measured Inukjuak service times. Pumping, pipeline transit and treatment durations remain unknown. Delivery trucks do not normally visit the raw-water intake or move through the pipeline.

## Suggested presentation walkthrough

1. **Start with the household.** “We want someone to know when their water is coming and what information is available about it.” Show the arrival card before opening technical details.
2. **Choose a location.** Press Choose on map, select a point near a road and show that it locks. Identify the assigned truck and explain why the others are serving different homes.
3. **Open the assigned truck.** Show its activity and stop timer. Explain the difference between time stopped, inferred work and an estimated finish time.
4. **Open the water readings.** Explain the proposed truck-mounted sensors, then state plainly that today's values and Safe/Unsafe statuses are simulated. A truck reading does not cover the household tank.
5. **Switch offline.** Point out the red dot, last-update time and any dashed route. “This is where we expect the truck to be, based on its last report. We cannot confirm a new delay until we receive an update.”
6. **Show the Bluetooth button.** Explain the idea of sharing a newer report and identify the button as a placeholder.
7. **Reconnect and show an alert.** In Demo controls, select a collision or quality hold. Explain that unavailable trucks are excluded from the delivery assignment.
8. **Finish with what needs testing.** We need residents and local water operators to review the wording, route information, sensor placement, maintenance needs and acceptable uncertainty in arrival estimates.

For a short presentation, keep the focus on the household, GPS, truck sensors and offline uncertainty. The detailed timing table and technical notes can support questions afterward.

## Before a real pilot

We would start with a small trial agreed with local residents, drivers and water operators. We need to measure actual stop times, compare arrival estimates with deliveries and check how often connectivity drops. The interface should be reviewed locally for language, accessibility and whether the statuses are understood as intended.

The hardware plan also needs someone responsible for maintaining trackers and sensors, with replacement parts and troubleshooting that can be supported locally. Household locations and driver movement should only be shared with the people who need them. A resident-facing tracker should not expose another household's identity or a driver's full location history.

Useful pilot measures would include arrival-estimate error, how often residents see stale information, whether alerts are understood, and how quickly failed devices are detected and repaired. We have not measured those outcomes yet.

## Run the demo

From the repository folder:

```sh
python -m http.server 8000
```

Open **http://localhost:8000/**. Use the bottom bar to switch between Laptop and iPhone previews or online and offline modes. Demo controls contain incident scenarios and 60×/300× playback so loading stops can be reviewed without waiting half an hour. Restart demo resets the fleet while keeping the chosen home locked.

Run the checks with:

```sh
node --test tests/*.test.js
```

## Technical notes and sources

The road router incorporates the work from the `hamza` branch. Routing runs locally using `roads.json`; household pins are not sent to an external routing service. Leaflet and OpenStreetMap tiles need a network connection on first load. The app can show a text-only view if the map library fails to load.

Road geometry comes from an OpenStreetMap snapshot fetched on September 26, 2026, covering `-78.16,58.42,-78.04,58.51`. The router uses mapped one-way directions and filters non-drivable or prohibited/private motor-vehicle access. It does not validate turn restrictions, conditional access, road conditions or all truck restrictions. A home pin must be within 300 metres of the mapped road network; an offset to the roadside is disclosed. This is a prototype, not a navigation system.

- **Challenge context:** Amenda Soucy's *H4H Challenge Slides* (2026), particularly the household visibility and designing-for-the-North sections.
- **Local water system:** [KRG, Inukjuak intake vulnerability report, January 2025](https://www.krg.ca/iu/assets/environment/drinking_water_report6.pdf). The river-intake marker uses Table 1's coordinates. No pipeline geometry is invented.
- **Plant location:** [Inukjuak Water Treatment Plant, OpenStreetMap way 493122694](https://www.openstreetmap.org/way/493122694), approximately 58.457888, -78.104030. Only one verified local plant is modeled.
- **Delivery context:** [APTN, *Pipe Dreams: The water crisis in Nunavik*, November 10, 2025](https://www.aptnnews.ca/investigates/pipe-dreams-the-water-crisis-in-nunavik/). Its household-filling observations are from Puvirnituq.
- **Map attribution:** © OpenStreetMap contributors, available under the [Open Database License](https://www.openstreetmap.org/copyright).
