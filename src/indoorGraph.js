/**
 * Indoor graph + pathfinding.
 *
 * No GPS is used anywhere — the only positioning signal we have is
 * "the user is standing in front of QR_X". So the graph is hand-authored
 * and lives in code (or a JSON file you can hot-swap per building).
 *
 * Coordinates are arbitrary units in a 2D top-down map of the building.
 *   x = horizontal axis (meters, say)
 *   z = depth axis (meters)
 * y is up in the 3D scene but we don't use it for navigation here.
 *
 * To add a new building, copy this file and edit NODES + EDGES.
 */

export const NODES = {
  // Waypoint QR stickers placed at corridor intersections and entrances.
  // The "id" must match the `?from=` value encoded in the printed QR.
  "QR_A1": { name: "Lobby — Main Entrance", x: 0,  z: 0,  floor: 1 },
  "QR_A2": { name: "Hallway A — East Wing",  x: 5,  z: 0,  floor: 1 },
  "QR_A3": { name: "Hallway A — Junction",   x: 10, z: 0,  floor: 1 },
  "QR_A4": { name: "Stairwell A",            x: 15, z: 0,  floor: 1 },
  "QR_B1": { name: "Hallway B — West Wing",  x: 10, z: -5, floor: 1 },

  // Destinations the user might want to reach. These are reachable nodes
  // (i.e. you can stand in front of them / find them on the building map).
  "room-101": { name: "Room 101",        x: 2,  z: -4, floor: 1 },
  "room-201": { name: "Room 201",        x: 7,  z: 2,  floor: 1 },
  "room-301": { name: "Room 301",        x: 12, z: 3,  floor: 1 },
  "cafeteria":{ name: "Cafeteria",       x: 0,  z: 6,  floor: 1 },
  "exit":     { name: "Fire Exit",       x: 15, z: -3, floor: 1 },
};

export const EDGES = [
  // undirected: add both directions if you want a fully symmetric graph
  ["QR_A1", "QR_A2", 5],
  ["QR_A2", "QR_A3", 5],
  ["QR_A3", "QR_A4", 5],
  ["QR_A2", "room-101", 5.4],
  ["QR_A3", "room-201", 5.4],
  ["QR_A3", "room-301", 5.4],
  ["QR_A3", "QR_B1", 5],
  ["QR_A1", "cafeteria", 7.8],
  ["QR_A4", "exit",     5.4],
];

/**
 * Dijkstra over NODES. Returns an array of node ids from `start` to `end`,
 * or null if no path exists. Direction information is derived from the
 * first edge in the path — the AR arrow points from start toward next.
 */
export function findPath(start, end) {
  if (!NODES[start] || !NODES[end]) return null;
  if (start === end) return [start];

  const adj = new Map();
  for (const [a, b, w] of EDGES) {
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
 *
 *   yaw=0   → arrow points along +X (east)
 *   yaw=π/2 → arrow points along +Z (south)
 *
 * Three.js convention: rotation around Y is counter-clockwise looking down.
 * We compute the atan2(dx, dz) so the arrow's "tip" aligns with the
 * direction to the next waypoint when the camera is upright.
 */
export function directionYaw(currentId, nextId) {
  const a = NODES[currentId];
  const b = NODES[nextId];
  if (!a || !b) return 0;
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  // Three.js Y-up: positive yaw rotates +X toward -Z, so we negate.
  return Math.atan2(-dz, dx);
}

/**
 * Total path length in meters, for the "X m to destination" overlay.
 */
export function pathLength(path) {
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const a = NODES[path[i]];
    const b = NODES[path[i + 1]];
    total += Math.hypot(b.x - a.x, b.z - a.z);
  }
  return total;
}
