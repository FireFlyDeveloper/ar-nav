/**
 * Dynamic indoor graph storage.
 *
 * Persists nodes and edges to localStorage so the mapper can edit them.
 * Falls back to seed data on first load or parse error.
 */

const STORAGE_KEY = "ar-nav-graph-v1";

export const SEED_NODES = {
  QR_A1: { name: "Lobby — Main Entrance", x: 0, z: 0, floor: 1, type: "entrance", notes: "" },
  QR_A2: { name: "Hallway A — East Wing", x: 5, z: 0, floor: 1, type: "waypoint", notes: "" },
  QR_A3: { name: "Hallway A — Junction", x: 10, z: 0, floor: 1, type: "waypoint", notes: "" },
  QR_A4: { name: "Stairwell A", x: 15, z: 0, floor: 1, type: "stairs", notes: "" },
  QR_B1: { name: "Hallway B — West Wing", x: 10, z: -5, floor: 1, type: "waypoint", notes: "" },
  "room-101": { name: "Room 101", x: 2, z: -4, floor: 1, type: "room", notes: "" },
  "room-201": { name: "Room 201", x: 7, z: 2, floor: 1, type: "room", notes: "" },
  "room-301": { name: "Room 301", x: 12, z: 3, floor: 1, type: "room", notes: "" },
  cafeteria: { name: "Cafeteria", x: 0, z: 6, floor: 1, type: "poi", notes: "" },
  exit: { name: "Fire Exit", x: 15, z: -3, floor: 1, type: "exit", notes: "" },
};

export const SEED_EDGES = [
  ["QR_A1", "QR_A2", 5],
  ["QR_A2", "QR_A3", 5],
  ["QR_A3", "QR_A4", 5],
  ["QR_A2", "room-101", 5.4],
  ["QR_A3", "room-201", 5.4],
  ["QR_A3", "room-301", 5.4],
  ["QR_A3", "QR_B1", 5],
  ["QR_A1", "cafeteria", 7.8],
  ["QR_A4", "exit", 5.4],
];

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function loadGraph() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.nodes && parsed.edges) {
        return { nodes: parsed.nodes, edges: parsed.edges };
      }
    }
  } catch {
    /* ignore corrupt storage */
  }
  return { nodes: clone(SEED_NODES), edges: clone(SEED_EDGES) };
}

export function saveGraph(graph) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(graph));
}

export function resetGraph() {
  localStorage.removeItem(STORAGE_KEY);
  return { nodes: clone(SEED_NODES), edges: clone(SEED_EDGES) };
}

export function exportGraphJSON(graph) {
  return JSON.stringify(graph, null, 2);
}

export function importGraphJSON(json) {
  const parsed = JSON.parse(json);
  if (!parsed.nodes || !parsed.edges) throw new Error("Invalid graph JSON");
  const graph = { nodes: parsed.nodes, edges: parsed.edges };
  saveGraph(graph);
  return graph;
}

/* Convenience CRUD helpers used by Mapper */

export function addNode(graph, id, node) {
  if (graph.nodes[id]) throw new Error(`Node ${id} already exists`);
  graph.nodes[id] = node;
  saveGraph(graph);
  return graph;
}

export function updateNode(graph, id, patch) {
  if (!graph.nodes[id]) throw new Error(`Node ${id} not found`);
  graph.nodes[id] = { ...graph.nodes[id], ...patch };
  saveGraph(graph);
  return graph;
}

export function removeNode(graph, id) {
  if (!graph.nodes[id]) return graph;
  delete graph.nodes[id];
  graph.edges = graph.edges.filter(([a, b]) => a !== id && b !== id);
  saveGraph(graph);
  return graph;
}

export function addEdge(graph, a, b, weight) {
  if (!graph.nodes[a] || !graph.nodes[b]) throw new Error("Both nodes must exist");
  const exists = graph.edges.some(
    ([ea, eb]) => (ea === a && eb === b) || (ea === b && eb === a)
  );
  if (exists) throw new Error("Edge already exists");
  graph.edges.push([a, b, weight ?? distanceBetween(graph, a, b)]);
  saveGraph(graph);
  return graph;
}

export function removeEdge(graph, a, b) {
  graph.edges = graph.edges.filter(
    ([ea, eb]) => !((ea === a && eb === b) || (ea === b && eb === a))
  );
  saveGraph(graph);
  return graph;
}

export function distanceBetween(graph, a, b) {
  const na = graph.nodes[a];
  const nb = graph.nodes[b];
  if (!na || !nb) return 0;
  return Math.hypot(nb.x - na.x, nb.z - na.z);
}
