/**
 * Indoor graph + pathfinding.
 *
 * Reads from graphStore so the mapper can edit the building live.
 * Falls back to seed data on first visit.
 */
import { loadGraph } from "./graphStore.js";

function getGraph() {
  return loadGraph();
}

export function getNodes() {
  return getGraph().nodes;
}

export function getEdges() {
  return getGraph().edges;
}

/** Backward-compat proxy: NODES and EDGES are getters that read from storage. */
export const NODES = new Proxy(
  {},
  {
    get(_, prop) {
      return getNodes()[prop];
    },
    ownKeys() {
      return Reflect.ownKeys(getNodes());
    },
    getOwnPropertyDescriptor(_, prop) {
      const val = getNodes()[prop];
      return val !== undefined
        ? { value: val, writable: false, enumerable: true, configurable: true }
        : undefined;
    },
  }
);

export const EDGES = new Proxy([], {
  get(target, prop) {
    const edges = getEdges();
    if (prop === "length") return edges.length;
    if (prop === Symbol.iterator) return edges[Symbol.iterator].bind(edges);
    const idx = Number(prop);
    if (!Number.isNaN(idx)) return edges[idx];
    return Reflect.get(edges, prop);
  },
});

/**
 * Dijkstra over the dynamic graph. Returns an array of node ids from `start` to `end`,
 * or null if no path exists.
 */
export function findPath(start, end) {
  const { nodes, edges } = getGraph();
  if (!nodes[start] || !nodes[end]) return null;
  if (start === end) return [start];

  const adj = new Map();
  for (const [a, b, w] of edges) {
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a).push([b, w]);
    adj.get(b).push([a, w]);
  }

  const dist = { [start]: 0 };
  const prev = {};
  const visited = new Set();
  const queue = [[0, start]];

  while (queue.length) {
    queue.sort((a, b) => a[0] - b[0]);
    const [d, u] = queue.shift();
    if (visited.has(u)) continue;
    visited.add(u);
    if (u === end) break;
    for (const [v, w] of adj.get(u) || []) {
      const nd = d + w;
      if (nd < (dist[v] ?? Infinity)) {
        dist[v] = nd;
        prev[v] = u;
        queue.push([nd, v]);
      }
    }
  }

  if (dist[end] === undefined) return null;
  const path = [];
  let cur = end;
  while (cur !== undefined) {
    path.unshift(cur);
    cur = prev[cur];
  }
  return path;
}

/**
 * Given the current QR waypoint and the next waypoint along the path,
 * return the yaw (radians) the AR arrow should point.
 */
export function directionYaw(currentId, nextId) {
  const { nodes } = getGraph();
  const a = nodes[currentId];
  const b = nodes[nextId];
  if (!a || !b) return 0;
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  return Math.atan2(-dz, dx);
}

/**
 * Total path length in meters, for the "X m to destination" overlay.
 */
export function pathLength(path) {
  const { nodes } = getGraph();
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const a = nodes[path[i]];
    const b = nodes[path[i + 1]];
    total += Math.hypot(b.x - a.x, b.z - a.z);
  }
  return total;
}

/**
 * Build a lookup of which waypoints have QR codes (id starts with "QR_").
 */
export function getWaypointIds() {
  return Object.keys(getNodes()).filter((id) => id.startsWith("QR_"));
}

/**
 * Compute turn instruction between three nodes on a path.
 * Returns { text: string, distance: number } for the segment starting at `fromIndex`.
 */
export function stepInstruction(path, fromIndex) {
  const { nodes } = getGraph();
  if (fromIndex >= path.length - 1) {
    const dest = nodes[path[path.length - 1]];
    return { text: `Arrive at ${dest?.name || path[path.length - 1]}`, distance: 0 };
  }

  const cur = nodes[path[fromIndex]];
  const nxt = nodes[path[fromIndex + 1]];
  const dist = Math.hypot(nxt.x - cur.x, nxt.z - cur.z);

  if (fromIndex === 0) {
    return { text: `Start toward ${nxt.name || path[fromIndex + 1]}`, distance: dist };
  }

  const prev = nodes[path[fromIndex - 1]];
  const v1x = cur.x - prev.x;
  const v1z = cur.z - prev.z;
  const v2x = nxt.x - cur.x;
  const v2z = nxt.z - cur.z;

  const dot = v1x * v2x + v1z * v2z;
  const cross = v1x * v2z - v1z * v2x;
  const turnRad = Math.atan2(cross, dot);
  const turnDeg = (turnRad * 180) / Math.PI;

  let text;
  if (Math.abs(turnDeg) < 25) {
    text = `Walk forward ${Math.round(dist)} m`;
  } else if (Math.abs(turnDeg) > 155) {
    text = `Turn around and walk ${Math.round(dist)} m`;
  } else if (cross > 0) {
    text = `Turn right and walk ${Math.round(dist)} m`;
  } else {
    text = `Turn left and walk ${Math.round(dist)} m`;
  }

  return { text, distance: dist };
}
