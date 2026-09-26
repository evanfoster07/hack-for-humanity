const DEMO_HOME = {
  lat: 63.7467,
  lng: -68.5170,
  label: "Demo household · Iqaluit, NU"
};

// Everything here is simulated for the prototype.
const trucks = [
  {
    id: "WT-104",
    driver: "Alex N.",

    lat: 63.7508,
    lng: -68.5035,

    speedKmh: 26,

    quality: "good",
    qualityLabel: "Quality OK",

    qualitySummary:
      "Latest sample within demo targets",

    sampled: "12 min ago",

    ph: "7.2",
    turbidity: "0.4 NTU",
    chlorine: "0.7 mg/L",
    temperature: "7.5 °C"
  },

  {
    id: "WT-218",
    driver: "Jordan T.",

    lat: 63.7394,
    lng: -68.5420,

    speedKmh: 22,

    quality: "caution",
    qualityLabel: "Check advised",

    qualitySummary:
      "Turbidity flagged for recheck",

    sampled: "19 min ago",

    ph: "7.0",
    turbidity: "4.2 NTU",
    chlorine: "0.5 mg/L",
    temperature: "8.1 °C"
  },

  {
    id: "WT-337",
    driver: "Morgan K.",

    lat: 63.7563,
    lng: -68.5340,

    speedKmh: 28,

    quality: "good",
    qualityLabel: "Quality OK",

    qualitySummary:
      "Latest sample within demo targets",

    sampled: "7 min ago",

    ph: "7.4",
    turbidity: "0.7 NTU",
    chlorine: "0.6 mg/L",
    temperature: "6.9 °C"
  }
];

let home = { ...DEMO_HOME };
let router = null;
let selectedTruckId = null;
let simulationRunning = true;

const map = L.map("map").setView([DEMO_HOME.lat, DEMO_HOME.lng], 14);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

const destinationIcon = L.divIcon({
  className: "destination-marker",
  html: "📍",
  iconSize: [32, 36],
  iconAnchor: [16, 34]
});
const homeMarker = L.marker([home.lat, home.lng], {
  icon: destinationIcon,
  zIndexOffset: 1000
}).addTo(map).bindPopup("<strong>Destination</strong>");

const selectedRouteLine = L.polyline([], {
  color: "#087b98",
  weight: 5,
  opacity: 0.9
}).addTo(map);
const roadsideConnector = L.polyline([], {
  color: "#5e7280",
  weight: 2,
  dashArray: "5 6"
}).addTo(map);

const truckMarkers = new Map();
for (const truck of trucks) {
  truck.route = null;
  truck.legIndex = 0;
  truck.legProgressKm = 0;
  const marker = L.marker([truck.lat, truck.lng], {
    icon: L.divIcon({
      className: `truck-marker ${truck.quality}`,
      html: "🚚",
      iconSize: [38, 38]
    })
  }).addTo(map);
  marker.on("click", () => selectTruck(truck.id, false));
  truckMarkers.set(truck.id, marker);
}

function currentLeg(truck) {
  return truck.route?.legs[truck.legIndex] || null;
}

function getTruckMetrics(truck) {
  if (!truck.route) return null;
  let distanceKm = 0;
  let etaMinutes = 0;
  for (let i = truck.legIndex; i < truck.route.legs.length; i++) {
    const leg = truck.route.legs[i];
    const remainingKm = Math.max(0, leg.distanceKm - (i === truck.legIndex ? truck.legProgressKm : 0));
    distanceKm += remainingKm;
    etaMinutes += remainingKm / leg.speedKmh * 60;
  }
  return { distanceKm, etaMinutes };
}

function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function formatEta(minutes) {
  if (minutes === null) return "--";
  if (minutes < 0.01) return "Arrived";
  return `~${Math.max(1, Math.ceil(minutes))} min`;
}

function sortedTrucks() {
  return [...trucks].sort((a, b) =>
    (getTruckMetrics(a)?.etaMinutes ?? Infinity) -
    (getTruckMetrics(b)?.etaMinutes ?? Infinity));
}

function renderTruckList() {
  const list = document.getElementById("truck-list");
  list.innerHTML = "";
  for (const truck of sortedTrucks()) {
    const metrics = getTruckMetrics(truck);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `truck-card${selectedTruckId === truck.id ? " selected" : ""}`;
    button.innerHTML = `
      <div class="truck-card-top">
        <strong>🚚 ${truck.id}</strong>
        <span class="quality-chip ${truck.quality}">${truck.qualityLabel}</span>
      </div>
      <div class="truck-card-bottom">
        <span>${metrics ? `${formatDistance(metrics.distanceKm)} by road` : "No road route"}</span>
        <strong>${formatEta(metrics?.etaMinutes ?? null)}</strong>
      </div>`;
    button.addEventListener("click", () => selectTruck(truck.id, true));
    list.appendChild(button);
  }
}

function renderNextDelivery() {
  const nearest = sortedTrucks().find(truck => getTruckMetrics(truck));
  const metrics = nearest && getTruckMetrics(nearest);
  document.getElementById("next-eta").textContent = formatEta(metrics?.etaMinutes ?? null);
  document.getElementById("next-truck").textContent = nearest
    ? `${nearest.id} · ${nearest.driver}`
    : "No road route to this pin";
}

function remainingRouteCoordinates(truck) {
  if (!truck.route || !currentLeg(truck)) return [];
  return [[truck.lat, truck.lng], ...truck.route.legs.slice(truck.legIndex).map(leg => leg.to)];
}

function renderSelectedRoute() {
  const truck = trucks.find(item => item.id === selectedTruckId);
  selectedRouteLine.setLatLngs(truck ? remainingRouteCoordinates(truck) : []);
  roadsideConnector.setLatLngs(
    truck?.route && truck.route.endSnapMetres > 8
      ? [truck.route.snappedEnd, [home.lat, home.lng]] : []
  );
}

function renderTruckDetails() {
  const truck = trucks.find(item => item.id === selectedTruckId);
  if (!truck) return;
  const metrics = getTruckMetrics(truck);
  const leg = currentLeg(truck);
  document.getElementById("detail-name").textContent = truck.id;
  const status = document.getElementById("detail-status");
  status.textContent = truck.qualityLabel;
  status.className = `quality-badge ${truck.quality}`;
  document.getElementById("detail-eta").textContent = formatEta(metrics?.etaMinutes ?? null);
  document.getElementById("detail-distance").textContent = metrics
    ? formatDistance(metrics.distanceKm) : "No route";
  document.getElementById("detail-speed").textContent = leg
    ? `${Math.round(leg.speedKmh)} km/h` : "--";
  document.getElementById("detail-limit").textContent = leg
    ? (leg.limitKmh ? `${Math.round(leg.limitKmh)} km/h mapped` : "Not mapped") : "--";
  const assumedKm = truck.route?.assumedDistanceKm ?? 0;
  document.getElementById("detail-route-note").textContent = truck.route
    ? (assumedKm > 0.001
        ? `${formatDistance(assumedKm)} of this route uses an assumed 25 km/h limit; the rest uses mapped OpenStreetMap limits. No traffic or stops are included.`
        : "This route uses mapped OpenStreetMap limits. No traffic or stops are included.")
    : "No road route is available to this destination.";
  document.getElementById("detail-driver").textContent = truck.driver;
  document.getElementById("detail-sampled").textContent = truck.sampled;
  document.getElementById("quality-summary").textContent = truck.qualitySummary;
  document.getElementById("reading-ph").textContent = truck.ph;
  document.getElementById("reading-turbidity").textContent = truck.turbidity;
  document.getElementById("reading-chlorine").textContent = truck.chlorine;
  document.getElementById("reading-temp").textContent = truck.temperature;
}

function selectTruck(id, panToTruck = true) {
  const truck = trucks.find(item => item.id === id);
  if (!truck) return;
  selectedTruckId = id;
  document.getElementById("truck-detail").classList.add("open");
  renderTruckDetails();
  renderTruckList();
  renderSelectedRoute();
  truckMarkers.get(id).bindPopup(`<strong>${truck.id}</strong><br>${truck.driver}`).openPopup();
  if (panToTruck) map.panTo([truck.lat, truck.lng]);
}

function closeTruckDetails() {
  selectedTruckId = null;
  document.getElementById("truck-detail").classList.remove("open");
  map.closePopup();
  renderTruckList();
  renderSelectedRoute();
}

function updateRouteMessage() {
  const message = document.getElementById("route-message");
  if (!router) {
    message.textContent = "Loading mapped roads...";
    return;
  }
  const available = trucks.filter(truck => truck.route);
  if (!available.length) {
    message.textContent = "No drivable road route to this pin in the mapped Iqaluit area. Click nearer a road.";
    return;
  }
  const metres = Math.round(available[0].route.endSnapMetres);
  message.textContent = metres > 8
    ? `Pin is ${metres} m from the nearest road. Arrival estimates end at the roadside.`
    : "Road routes to this pin are ready.";
}

function rerouteTrucks() {
  if (!router) return;
  for (const truck of trucks) {
    truck.route = router.route({ lat: truck.lat, lng: truck.lng }, home);
    truck.legIndex = 0;
    truck.legProgressKm = 0;
    if (truck.route) {
      [truck.lat, truck.lng] = truck.route.snappedStart;
      truckMarkers.get(truck.id).setLatLng([truck.lat, truck.lng]);
    }
  }
  updateRouteMessage();
  renderTruckList();
  renderNextDelivery();
  renderTruckDetails();
  renderSelectedRoute();
}

function updateHome(lat, lng, label) {
  home = { lat, lng, label };
  homeMarker.setLatLng([lat, lng]);
  document.getElementById("location-name").textContent = label;
  rerouteTrucks();
}

function useMyLocation() {
  const message = document.getElementById("location-message");
  if (!navigator.geolocation) {
    message.textContent = "Geolocation is not supported by this browser.";
    return;
  }
  message.textContent = "Requesting your location...";
  navigator.geolocation.getCurrentPosition(position => {
    updateHome(position.coords.latitude, position.coords.longitude, "Your current location");
    map.setView([home.lat, home.lng], 13);
    message.textContent = "Using your current location. Demo trucks remain in Iqaluit.";
  }, () => {
    message.textContent = "Could not access your location. Keeping the current pin.";
  }, { enableHighAccuracy: true, timeout: 8000 });
}

function resetDemoLocation() {
  updateHome(DEMO_HOME.lat, DEMO_HOME.lng, DEMO_HOME.label);
  map.setView([DEMO_HOME.lat, DEMO_HOME.lng], 14);
  document.getElementById("location-message").textContent = "Using a sample household location.";
}

function advanceTruck(truck, elapsedMs) {
  if (!truck.route || !currentLeg(truck)) return;
  let remainingMs = elapsedMs;
  while (remainingMs > 0 && currentLeg(truck)) {
    const leg = currentLeg(truck);
    const remainingKm = Math.max(0, leg.distanceKm - truck.legProgressKm);
    const possibleKm = leg.speedKmh * remainingMs / 3600000;
    if (possibleKm < remainingKm) {
      truck.legProgressKm += possibleKm;
      remainingMs = 0;
    } else {
      remainingMs -= remainingKm / leg.speedKmh * 3600000;
      truck.legIndex++;
      truck.legProgressKm = 0;
    }
  }
  const leg = currentLeg(truck);
  if (leg) {
    const fraction = leg.distanceKm ? truck.legProgressKm / leg.distanceKm : 0;
    truck.lat = leg.from[0] + (leg.to[0] - leg.from[0]) * fraction;
    truck.lng = leg.from[1] + (leg.to[1] - leg.from[1]) * fraction;
  } else {
    [truck.lat, truck.lng] = truck.route.snappedEnd;
  }
  truckMarkers.get(truck.id).setLatLng([truck.lat, truck.lng]);
}

let lastFrame = performance.now();
let lastRender = 0;
function animate(now) {
  const elapsedMs = now - lastFrame;
  lastFrame = now;
  if (simulationRunning && router) {
    for (const truck of trucks) advanceTruck(truck, elapsedMs);
  }
  if (now - lastRender > 1000) {
    lastRender = now;
    renderTruckList();
    renderNextDelivery();
    renderTruckDetails();
    renderSelectedRoute();
  }
  requestAnimationFrame(animate);
}

function toggleSimulation() {
  simulationRunning = !simulationRunning;
  document.getElementById("toggle-simulation").textContent = simulationRunning ? "Pause" : "Resume";
}

map.on("click", event => {
  const { lat, lng } = event.latlng;
  updateHome(lat, lng, `Pinned destination · ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
  document.getElementById("location-message").textContent = "Pin placed on the map.";
});
document.getElementById("use-location").addEventListener("click", useMyLocation);
document.getElementById("reset-location").addEventListener("click", resetDemoLocation);
document.getElementById("toggle-simulation").addEventListener("click", toggleSimulation);
document.getElementById("close-detail").addEventListener("click", closeTruckDetails);

renderTruckList();
renderNextDelivery();
requestAnimationFrame(animate);
fetch("roads.json")
  .then(response => {
    if (!response.ok) throw new Error(`Road data HTTP ${response.status}`);
    return response.json();
  })
  .then(data => {
    router = new RoadRouter(data);
    rerouteTrucks();
    selectTruck(sortedTrucks()[0].id, false);
  })
  .catch(error => {
    console.error("Could not load road data", error);
    document.getElementById("route-message").textContent =
      "Could not load road data. Run this page from the local server and refresh.";
  });
