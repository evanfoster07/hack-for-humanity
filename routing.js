/* Road routing for the Iqaluit prototype. All distances and ETAs use OSM road geometry. */
(function (root) {
  const ASSUMED_LIMIT_KMH = 25;
  const SPEED_FACTOR = 0.8; // Demo drivers travel below the mapped limit.
  const MAX_SNAP_METRES = 300;

  function distanceKm(a, b) {
    const radians = Math.PI / 180;
    const dLat = (b[0] - a[0]) * radians;
    const dLon = (b[1] - a[1]) * radians;
    const h = Math.sin(dLat / 2) ** 2 +
      Math.cos(a[0] * radians) * Math.cos(b[0] * radians) *
      Math.sin(dLon / 2) ** 2;
    return 12742 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  function parseLimit(value) {
    if (typeof value !== "string") return null;
    const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*(km\/h|kph|mph)?$/i);
    if (!match) return null;
    const amount = Number(match[1]) * (match[2]?.toLowerCase() === "mph" ? 1.609344 : 1);
    return amount > 0 && amount <= 160 ? amount : null;
  }

  function speedProfile(tags, direction) {
    const keys = [
      `maxspeed:hgv:${direction}`,
      "maxspeed:hgv",
      `maxspeed:${direction}`,
      "maxspeed"
    ];
    for (const key of keys) {
      const limitKmh = parseLimit(tags[key]);
      if (limitKmh !== null) {
        return { limitKmh, speedKmh: limitKmh * SPEED_FACTOR, source: "mapped" };
      }
    }
    return { limitKmh: null, speedKmh: ASSUMED_LIMIT_KMH * SPEED_FACTOR, source: "assumed" };
  }

  class MinHeap {
    constructor() { this.items = []; }
    push(value) {
      const a = this.items;
      a.push(value);
      let i = a.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (a[p].cost <= value.cost) break;
        a[i] = a[p];
        i = p;
      }
      a[i] = value;
    }
    pop() {
      const a = this.items;
      const first = a[0];
      const last = a.pop();
      if (a.length) {
        let i = 0;
        while (i * 2 + 1 < a.length) {
          let child = i * 2 + 1;
          if (child + 1 < a.length && a[child + 1].cost < a[child].cost) child++;
          if (last.cost <= a[child].cost) break;
          a[i] = a[child];
          i = child;
        }
        a[i] = last;
      }
      return first;
    }
    get size() { return this.items.length; }
  }

  class RoadRouter {
    constructor(data) {
      this.bounds = data.bounds;
      this.positions = new Map(Object.entries(data.nodes));
      this.adjacency = new Map();
      this.segments = [];
      const undirected = new Map();
      const link = (a, b) => {
        if (!undirected.has(a)) undirected.set(a, []);
        undirected.get(a).push(b);
      };
      const addEdge = (from, to, lengthKm, profile, name) => {
        if (!this.adjacency.has(from)) this.adjacency.set(from, []);
        this.adjacency.get(from).push({ to, lengthKm, ...profile, name });
      };

      for (const way of data.ways) {
        const tags = way.tags;
        const oneWay = tags.oneway;
        const forwardAllowed = oneWay !== "-1";
        const backwardAllowed = !["yes", "true", "1"].includes(oneWay) &&
          !(tags.junction === "roundabout" && oneWay !== "no");
        const forward = forwardAllowed ? speedProfile(tags, "forward") : null;
        const backward = backwardAllowed ? speedProfile(tags, "backward") : null;
        const name = tags.name || `${tags.highway} road`;
        for (let i = 1; i < way.nodes.length; i++) {
          const a = way.nodes[i - 1];
          const b = way.nodes[i];
          const start = this.positions.get(a);
          const end = this.positions.get(b);
          if (!start || !end) continue;
          const lengthKm = distanceKm(start, end);
          if (lengthKm < 0.000001) continue;
          const segment = { a, b, start, end, lengthKm, forward, backward, name };
          this.segments.push(segment);
          link(a, b);
          link(b, a);
          if (forward) addEdge(a, b, lengthKm, forward, name);
          if (backward) addEdge(b, a, lengthKm, backward, name);
        }
      }

      // Tiny disconnected service-road islands should not steal a nearby pin.
      const visited = new Set();
      let largest = new Set();
      for (const node of undirected.keys()) {
        if (visited.has(node)) continue;
        const component = new Set([node]);
        const queue = [node];
        visited.add(node);
        for (let i = 0; i < queue.length; i++) {
          for (const next of undirected.get(queue[i]) || []) {
            if (!visited.has(next)) {
              visited.add(next);
              component.add(next);
              queue.push(next);
            }
          }
        }
        if (component.size > largest.size) largest = component;
      }
      this.segments = this.segments.filter(s => largest.has(s.a) && largest.has(s.b));
    }

    snap(point) {
      let best = null;
      // Equirectangular projection is accurate at this city's scale.
      const metresPerLon = 111320 * Math.cos(point.lat * Math.PI / 180);
      for (const segment of this.segments) {
        const ax = (segment.start[1] - point.lng) * metresPerLon;
        const ay = (segment.start[0] - point.lat) * 111320;
        const bx = (segment.end[1] - point.lng) * metresPerLon;
        const by = (segment.end[0] - point.lat) * 111320;
        const dx = bx - ax;
        const dy = by - ay;
        const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy)));
        const x = ax + t * dx;
        const y = ay + t * dy;
        const distanceM = Math.hypot(x, y);
        if (!best || distanceM < best.distanceM) {
          best = {
            segment, t, distanceM,
            position: [segment.start[0] + t * (segment.end[0] - segment.start[0]),
              segment.start[1] + t * (segment.end[1] - segment.start[1])]
          };
        }
      }
      return best && best.distanceM <= MAX_SNAP_METRES ? best : null;
    }

    route(start, destination) {
      const from = this.snap(start);
      const to = this.snap(destination);
      if (!from || !to) return null;
      const START = "__route_start__";
      const END = "__route_end__";
      const positions = new Map(this.positions);
      positions.set(START, from.position);
      positions.set(END, to.position);
      const extra = new Map();
      const add = (node, target, km, profile, name) => {
        if (!profile) return;
        if (!extra.has(node)) extra.set(node, []);
        extra.get(node).push({ to: target, lengthKm: km, ...profile, name });
      };
      const s = from.segment;
      add(START, s.b, (1 - from.t) * s.lengthKm, s.forward, s.name);
      add(START, s.a, from.t * s.lengthKm, s.backward, s.name);
      const e = to.segment;
      add(e.a, END, to.t * e.lengthKm, e.forward, e.name);
      add(e.b, END, (1 - to.t) * e.lengthKm, e.backward, e.name);
      if (s === e) {
        if (to.t >= from.t) add(START, END, (to.t - from.t) * s.lengthKm, s.forward, s.name);
        if (from.t >= to.t) add(START, END, (from.t - to.t) * s.lengthKm, s.backward, s.name);
      }

      const distances = new Map([[START, 0]]);
      const previous = new Map();
      const heap = new MinHeap();
      heap.push({ node: START, cost: 0 });
      while (heap.size) {
        const { node, cost } = heap.pop();
        if (cost > distances.get(node)) continue;
        if (node === END) break;
        for (const edge of [...(this.adjacency.get(node) || []), ...(extra.get(node) || [])]) {
          const next = cost + edge.lengthKm / edge.speedKmh * 60;
          if (next < (distances.get(edge.to) ?? Infinity)) {
            distances.set(edge.to, next);
            previous.set(edge.to, { from: node, edge });
            heap.push({ node: edge.to, cost: next });
          }
        }
      }
      if (!previous.has(END)) return null;
      const legs = [];
      for (let node = END; node !== START;) {
        const step = previous.get(node);
        legs.push({
          from: positions.get(step.from), to: positions.get(node),
          distanceKm: step.edge.lengthKm, speedKmh: step.edge.speedKmh,
          limitKmh: step.edge.limitKmh, source: step.edge.source,
          name: step.edge.name
        });
        node = step.from;
      }
      legs.reverse();
      const distance = legs.reduce((sum, leg) => sum + leg.distanceKm, 0);
      return {
        legs,
        distanceKm: distance,
        durationMinutes: legs.reduce((sum, leg) => sum + leg.distanceKm / leg.speedKmh * 60, 0),
        assumedDistanceKm: legs.filter(leg => leg.source === "assumed")
          .reduce((sum, leg) => sum + leg.distanceKm, 0),
        snappedStart: from.position,
        snappedEnd: to.position,
        startSnapMetres: from.distanceM,
        endSnapMetres: to.distanceM
      };
    }
  }

  root.RoadRouter = RoadRouter;
  if (typeof module !== "undefined") module.exports = { RoadRouter, parseLimit, distanceKm };
})(typeof window !== "undefined" ? window : globalThis);
