const DEMO_HOME = {
  lat: 58.4540,
  lng: -78.1010,
  label: "Demo household · Inukjuak, Nunavik"
};

// Everything here is simulated for the prototype.
const trucks = [
  {
    id: "WT-104",
    driver: "Alex N.",

    lat: 58.4580,
    lng: -78.0950,

    speedKmh: 26,

    quality: "good",
    qualityLabel: "Sample available",

    qualitySummary:
      "Truck sample available · household unchecked",

    sampled: "12 min before demo start",

    ph: "7.2",
    turbidity: "0.4 NTU",
    chlorine: "0.7 mg/L",
    temperature: "7.5 °C"
  },

  {
    id: "WT-218",
    driver: "Jordan T.",

    lat: 58.4490,
    lng: -78.1080,

    speedKmh: 22,

    quality: "caution",
    qualityLabel: "Check advised",

    qualitySummary:
      "Turbidity flagged for recheck",

    sampled: "19 min before demo start",

    ph: "7.0",
    turbidity: "4.2 NTU",
    chlorine: "0.5 mg/L",
    temperature: "8.1 °C"
  },

  {
    id: "WT-337",
    driver: "Morgan K.",

    lat: 58.4610,
    lng: -78.1060,

    speedKmh: 28,

    quality: "good",
    qualityLabel: "Sample available",

    qualitySummary:
      "Truck sample available · household unchecked",

    sampled: "7 min before demo start",

    ph: "7.4",
    turbidity: "0.7 NTU",
    chlorine: "0.6 mg/L",
    temperature: "6.9 °C"
  }
];

let home = {
  ...DEMO_HOME
};

let selectedTruckId = null;

let simulationRunning = true;

/* ---------------------------------
   MAP
---------------------------------- */

const map = typeof L !== "undefined" ? L.map("map").setView(
  [
    DEMO_HOME.lat,
    DEMO_HOME.lng
  ],
  14
) : null;

if (map) L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    maxZoom: 19,

    attribution:
      "&copy; OpenStreetMap contributors"
  }
).addTo(map);

/* ---------------------------------
   HOME MARKER
---------------------------------- */

const homeIcon = map ? L.divIcon({
  className: "home-marker",

  iconSize: [18, 18]
}) : null;

const homeMarker = map ? L.marker(
  [
    home.lat,
    home.lng
  ],
  {
    icon: homeIcon,

    zIndexOffset: 1000
  }
)
  .addTo(map)
  .bindPopup(
    "<strong>Demo household · Inukjuak</strong>"
  ) : null;

/* ---------------------------------
   TRUCK MARKERS
---------------------------------- */

const truckMarkers = new Map();

function createTruckIcon(
  quality
) {
  return L.divIcon({
    className:
      `truck-marker ${quality}`,

    html: "🚚",

    iconSize: [38, 38]
  });
}

for (const truck of map ? trucks : []) {
  const marker = L.marker(
    [
      truck.lat,
      truck.lng
    ],
    {
      icon:
        createTruckIcon(
          truck.quality
        )
    }
  ).addTo(map);

  marker.on(
    "click",
    () => {
      selectTruck(
        truck.id,
        false
      );
    }
  );

  truckMarkers.set(
    truck.id,
    marker
  );
}

/* ---------------------------------
   DISTANCE / ETA
---------------------------------- */

function haversineKm(
  lat1,
  lng1,
  lat2,
  lng2
) {
  const earthRadius = 6371;

  const toRad = value =>
    value *
    Math.PI /
    180;

  const deltaLat =
    toRad(
      lat2 - lat1
    );

  const deltaLng =
    toRad(
      lng2 - lng1
    );

  const a =
    Math.sin(
      deltaLat / 2
    ) ** 2 +
    Math.cos(
      toRad(lat1)
    ) *
    Math.cos(
      toRad(lat2)
    ) *
    Math.sin(
      deltaLng / 2
    ) ** 2;

  return (
    earthRadius *
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(
        1 - a
      )
    )
  );
}

function getTruckMetrics(
  truck
) {
  const distance =
    haversineKm(
      home.lat,
      home.lng,
      truck.lat,
      truck.lng
    );

  const eta =
    Math.max(
      2,
      Math.round(
        (
          distance /
          truck.speedKmh
        ) * 60
      )
    );

  return {
    distance,
    eta
  };
}

function formatDistance(
  km
) {
  if (km < 1) {
    return `${Math.round(
      km * 1000
    )} m`;
  }

  return `${km.toFixed(1)} km`;
}

function sortedTrucks() {
  return [
    ...trucks
  ].sort(
    (a, b) =>
      getTruckMetrics(a).eta -
      getTruckMetrics(b).eta
  );
}

/* ---------------------------------
   SIDEBAR TRUCK LIST
---------------------------------- */

function renderTruckList() {
  const list =
    document.getElementById(
      "truck-list"
    );

  list.innerHTML = "";

  for (
    const truck
    of sortedTrucks()
  ) {
    const {
      distance,
      eta
    } =
      getTruckMetrics(
        truck
      );

    const button =
      document.createElement(
        "button"
      );

    button.type =
      "button";

    button.className =
      "truck-card";

    if (
      selectedTruckId ===
      truck.id
    ) {
      button.classList.add(
        "selected"
      );
    }

    button.innerHTML = `
      <div class="truck-card-top">
        <strong>
          🚚 ${truck.id}
        </strong>

        <span
          class="quality-chip ${truck.quality}"
        >
          ${truck.qualityLabel}
        </span>
      </div>

      <div class="truck-card-bottom">
        <span>
          ${formatDistance(distance)} away
        </span>

        <strong>
          ~${eta} min
        </strong>
      </div>
    `;

    button.addEventListener(
      "click",
      () => {
        selectTruck(
          truck.id,
          true
        );
      }
    );

    list.appendChild(
      button
    );
  }
}

/* ---------------------------------
   NEXT DELIVERY
---------------------------------- */

function renderNextDelivery() {
  const nearest =
    sortedTrucks()[0];

  const {
    eta
  } =
    getTruckMetrics(
      nearest
    );

  document.getElementById(
    "next-eta"
  ).textContent =
    `~${eta}`;

  document.getElementById("next-distance").textContent = `${formatDistance(getTruckMetrics(nearest).distance)} away · straight-line estimate`;

  document.getElementById(
    "next-truck"
  ).textContent =
    `${nearest.id} · ${nearest.driver}`;
}

/* ---------------------------------
   TRUCK DETAILS
---------------------------------- */

function selectTruck(
  id,
  panToTruck = true
) {
  const truck =
    trucks.find(
      truck =>
        truck.id === id
    );

  if (!truck) {
    return;
  }

  selectedTruckId =
    id;

  const {
    distance,
    eta
  } =
    getTruckMetrics(
      truck
    );

  document.getElementById(
    "detail-name"
  ).textContent =
    truck.id;

  const status =
    document.getElementById(
      "detail-status"
    );

  document.getElementById("quality-icon").textContent = truck.quality === "caution" ? "!" : "i";
  document.getElementById("quality-icon").className = `quality-check ${truck.quality}`;

  status.textContent =
    truck.qualityLabel;

  status.className =
    `quality-badge ${truck.quality}`;

  document.getElementById(
    "detail-eta"
  ).textContent =
    `~${eta} min`;

  document.getElementById(
    "detail-distance"
  ).textContent =
    formatDistance(
      distance
    );

  document.getElementById(
    "detail-driver"
  ).textContent =
    truck.driver;

  document.getElementById(
    "detail-sampled"
  ).textContent =
    truck.sampled;

  document.getElementById(
    "quality-summary"
  ).textContent =
    truck.qualitySummary;

  document.getElementById(
    "reading-ph"
  ).textContent =
    truck.ph;

  document.getElementById(
    "reading-turbidity"
  ).textContent =
    truck.turbidity;

  document.getElementById(
    "reading-chlorine"
  ).textContent =
    truck.chlorine;

  document.getElementById(
    "reading-temp"
  ).textContent =
    truck.temperature;

  document.getElementById(
    "truck-detail"
  ).classList.add(
    "open"
  );

  const marker =
    truckMarkers.get(
      id
    );

  marker?.bindPopup(`
      <strong>
        ${truck.id}
      </strong>

      <br>

      ETA: ~${eta} min

      <br>

      Driver:
      ${truck.driver}

      <br>

      Water:
      ${truck.qualityLabel}
    `)
    .openPopup();

  if (panToTruck) {
    map?.panTo(
      [
        truck.lat,
        truck.lng
      ]
    );
  }

  renderTruckList();
}

function closeTruckDetails() {
  selectedTruckId =
    null;

  document.getElementById(
    "truck-detail"
  ).classList.remove(
    "open"
  );

  map?.closePopup();

  renderTruckList();
}

/* ---------------------------------
   LOCATION
---------------------------------- */

function updateHome(
  lat,
  lng,
  label
) {
  home = {
    lat,
    lng,
    label
  };

  homeMarker?.setLatLng(
    [
      lat,
      lng
    ]
  );

  homeMarker?.setPopupContent(
    `<strong>${label}</strong>`
  );

  document.getElementById(
    "location-name"
  ).textContent =
    label;

  renderTruckList();

  renderNextDelivery();

  if (selectedTruckId) {
    selectTruck(
      selectedTruckId,
      false
    );
  }
}

function useMyLocation() {
  const message =
    document.getElementById(
      "location-message"
    );

  if (
    !navigator.geolocation
  ) {
    message.textContent =
      "Geolocation is not supported by this browser.";

    return;
  }

  message.textContent =
    "Requesting your location...";

  navigator.geolocation.getCurrentPosition(
    position => {
      updateHome(
        position.coords.latitude,
        position.coords.longitude,
        "Your current location"
      );

      map?.setView(
        [
          home.lat,
          home.lng
        ],
        13
      );

      message.textContent =
        "Using your current location. Demo trucks are still located in Inukjuak.";
    },

    () => {
      message.textContent =
        "Could not access your location. Keeping the demo location.";
    },

    {
      enableHighAccuracy: true,

      timeout: 8000
    }
  );
}

function resetDemoLocation() {
  updateHome(
    DEMO_HOME.lat,
    DEMO_HOME.lng,
    DEMO_HOME.label
  );

  map?.setView(
    [
      DEMO_HOME.lat,
      DEMO_HOME.lng
    ],
    14
  );

  document.getElementById(
    "location-message"
  ).textContent =
    "Using a sample household location.";
}

/* ---------------------------------
   SIMPLE TRUCK MOVEMENT SIMULATION
---------------------------------- */

function updateTruckSimulation() {
  if (
    !simulationRunning
  ) {
    return;
  }

  for (
    const truck
    of trucks
  ) {
    const distance =
      haversineKm(
        home.lat,
        home.lng,
        truck.lat,
        truck.lng
      );

    // Move trucks slowly toward the household.
    if (
      distance > 0.12
    ) {
      const step =
        0.018;

      truck.lat +=
        (
          home.lat -
          truck.lat
        ) * step;

      truck.lng +=
        (
          home.lng -
          truck.lng
        ) * step;

      const marker =
        truckMarkers.get(
          truck.id
        );

      marker?.setLatLng(
        [
          truck.lat,
          truck.lng
        ]
      );
    }
  }

  renderTruckList();

  renderNextDelivery();

  if (
    selectedTruckId
  ) {
    const truck =
      trucks.find(
        truck =>
          truck.id ===
          selectedTruckId
      );

    if (truck) {
      const {
        distance,
        eta
      } =
        getTruckMetrics(
          truck
        );

      document.getElementById(
        "detail-eta"
      ).textContent =
        `~${eta} min`;

      document.getElementById(
        "detail-distance"
      ).textContent =
        formatDistance(
          distance
        );
    }
  }
}

function toggleSimulation() {
  simulationRunning =
    !simulationRunning;

  document.getElementById(
    "toggle-simulation"
  ).textContent =
    simulationRunning
      ? "Pause"
      : "Resume";
}

/* ---------------------------------
   EVENT LISTENERS
---------------------------------- */

document.getElementById(
  "use-location"
)?.addEventListener(
  "click",
  useMyLocation
);

document.getElementById(
  "reset-location"
)?.addEventListener(
  "click",
  resetDemoLocation
);

document.getElementById(
  "toggle-simulation"
).addEventListener(
  "click",
  toggleSimulation
);

document.getElementById(
  "close-detail"
).addEventListener(
  "click",
  closeTruckDetails
);

/* ---------------------------------
   INITIALIZE
---------------------------------- */

renderTruckList();

renderNextDelivery();

selectTruck(
  sortedTrucks()[0].id,
  false
);

// Update simulated truck positions
// every 2.5 seconds.
setInterval(
  updateTruckSimulation,
  2500
);
// Keep the household and truck information usable when the map CDN is unavailable.
document.getElementById("reset-map").addEventListener("click", resetDemoLocation);
const mapToggle = document.getElementById("toggle-map");
function setTextView(enabled) {
  document.body.classList.toggle("text-view", enabled);
  mapToggle.setAttribute("aria-pressed", String(enabled));
  mapToggle.textContent = enabled ? "Show map view" : "Use text-only view";
  if (!enabled) map?.invalidateSize();
}
mapToggle.addEventListener("click", () => setTextView(!document.body.classList.contains("text-view")));
function updateConnectionStatus() {
  document.getElementById("connection-status").textContent = navigator.onLine
    ? "Demo data on this device; no live service connected."
    : "Offline · showing simulated data, not live truck locations.";
}
window.addEventListener("online", updateConnectionStatus);
window.addEventListener("offline", updateConnectionStatus);
updateConnectionStatus();
if (!map) setTextView(true);
