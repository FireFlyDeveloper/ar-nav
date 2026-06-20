import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  loadGraph,
  saveGraph,
  resetGraph,
  exportGraphJSON,
  importGraphJSON,
  addNode,
  updateNode,
  removeNode,
  addEdge,
  removeEdge,
  distanceBetween,
} from "../graphStore.js";

const NODE_COLORS = {
  entrance: "#0066cc",
  waypoint: "#34c759",
  room: "#ff9500",
  poi: "#af52de",
  stairs: "#5856d6",
  elevator: "#5ac8fa",
  exit: "#ff3b30",
};

const TYPE_LABELS = {
  entrance: "Entrance",
  waypoint: "Waypoint",
  room: "Room",
  poi: "POI",
  stairs: "Stairs",
  elevator: "Elevator",
  exit: "Exit",
};

export default function Mapper() {
  const [graph, setGraph] = useState(() => loadGraph());
  const [selectedId, setSelectedId] = useState(null);
  const [mode, setMode] = useState("select"); // select | add-node | add-edge
  const [edgeStart, setEdgeStart] = useState(null);
  const [importError, setImportError] = useState(null);
  const svgRef = useRef(null);
  const fileRef = useRef(null);

  const nodeList = useMemo(() => Object.entries(graph.nodes), [graph]);
  const edges = graph.edges;

  const bounds = useMemo(() => {
    if (nodeList.length === 0) return { minX: -5, maxX: 20, minZ: -10, maxZ: 10 };
    const xs = nodeList.map(([, n]) => n.x);
    const zs = nodeList.map(([, n]) => n.z);
    const pad = 3;
    return {
      minX: Math.min(...xs) - pad,
      maxX: Math.max(...xs) + pad,
      minZ: Math.min(...zs) - pad,
      maxZ: Math.max(...zs) + pad,
    };
  }, [nodeList]);

  const viewBox = useMemo(
    () => `${bounds.minX} ${bounds.minZ} ${bounds.maxX - bounds.minX} ${bounds.maxZ - bounds.minZ}`,
    [bounds]
  );

  const refresh = useCallback(() => setGraph(loadGraph()), []);

  const handleSvgClick = useCallback(
    (e) => {
      if (mode !== "add-node" || !svgRef.current) return;
      const pt = svgRef.current.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const cursorPt = pt.matrixTransform(svgRef.current.getScreenCTM().inverse());
      const id = prompt("Waypoint ID (e.g. QR_A5):", "QR_");
      if (!id || graph.nodes[id]) {
        if (graph.nodes[id]) alert(`ID "${id}" already exists.`);
        return;
      }
      const name = prompt("Name:", "New Waypoint") || id;
      const type = prompt("Type (entrance/waypoint/room/poi/stairs/elevator/exit):", "waypoint") || "waypoint";
      const floor = Number(prompt("Floor:", "1") || "1");
      const newGraph = addNode(graph, id, {
        name,
        x: Math.round(cursorPt.x * 10) / 10,
        z: Math.round(cursorPt.y * 10) / 10,
        floor,
        type,
        notes: "",
      });
      setGraph(newGraph);
      setSelectedId(id);
      setMode("select");
    },
    [mode, graph]
  );

  const handleNodeClick = useCallback(
    (e, id) => {
      e.stopPropagation();
      if (mode === "add-edge") {
        if (!edgeStart) {
          setEdgeStart(id);
          setSelectedId(id);
        } else if (edgeStart === id) {
          setEdgeStart(null);
        } else {
          try {
            const newGraph = addEdge(graph, edgeStart, id);
            setGraph(newGraph);
          } catch (err) {
            alert(err.message);
          }
          setEdgeStart(null);
          setMode("select");
        }
        return;
      }
      setSelectedId(id);
    },
    [mode, edgeStart, graph]
  );

  const handleDeleteNode = useCallback(
    (id) => {
      if (!confirm(`Delete "${id}" and all connected edges?`)) return;
      const newGraph = removeNode(graph, id);
      setGraph(newGraph);
      if (selectedId === id) setSelectedId(null);
      if (edgeStart === id) setEdgeStart(null);
    },
    [graph, selectedId, edgeStart]
  );

  const handleDeleteEdge = useCallback(
    (a, b) => {
      const newGraph = removeEdge(graph, a, b);
      setGraph(newGraph);
    },
    [graph]
  );

  const handleUpdateNode = useCallback(
    (id, patch) => {
      const newGraph = updateNode(graph, id, patch);
      setGraph(newGraph);
    },
    [graph]
  );

  const handleExport = useCallback(() => {
    const blob = new Blob([exportGraphJSON(graph)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `indoor-map-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [graph]);

  const handleImportFile = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const newGraph = importGraphJSON(String(reader.result));
          setGraph(newGraph);
          setImportError(null);
        } catch (err) {
          setImportError(err.message);
        }
      };
      reader.readAsText(file);
    },
    []
  );

  const selectedNode = selectedId ? graph.nodes[selectedId] : null;

  return (
    <>
      <nav className="glass-nav">
        <Link to="/" className="brand">AR Nav</Link>
        <Link to="/">Overview</Link>
        <Link to="/navigate?from=QR_A1&to=room-301">Navigate</Link>
        <Link to="/mapper">Mapper</Link>
        <Link to="/posters">Print</Link>
        <span className="spacer" />
      </nav>

      <div className="sub-nav">
        Indoor Mapper
        <span className="spacer" />
        <span className="muted" style={{ fontSize: 14, fontWeight: 400 }}>
          {nodeList.length} nodes · {edges.length} edges
        </span>
      </div>

      <div className="mapper-layout">
        {/* Toolbar */}
        <div className="mapper-toolbar">
          <div className="row">
            <button
              className={`btn ${mode === "select" ? "primary" : "pearl"}`}
              onClick={() => { setMode("select"); setEdgeStart(null); }}
            >
              Select
            </button>
            <button
              className={`btn ${mode === "add-node" ? "primary" : "pearl"}`}
              onClick={() => { setMode("add-node"); setEdgeStart(null); }}
            >
              Add node
            </button>
            <button
              className={`btn ${mode === "add-edge" ? "primary" : "pearl"}`}
              onClick={() => { setMode("add-edge"); setEdgeStart(null); }}
            >
              {mode === "add-edge" && edgeStart ? `Connect from ${edgeStart}` : "Add edge"}
            </button>
            <span className="spacer" />
            <button className="btn pearl" onClick={handleExport}>Export JSON</button>
            <button className="btn pearl" onClick={() => fileRef.current?.click()}>Import JSON</button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              style={{ display: "none" }}
              onChange={handleImportFile}
            />
            <button
              className="btn pearl"
              onClick={() => {
                if (confirm("Reset to demo data? This clears all custom changes.")) {
                  setGraph(resetGraph());
                  setSelectedId(null);
                  setEdgeStart(null);
                }
              }}
            >
              Reset demo
            </button>
          </div>
          {importError && <p className="error-text">{importError}</p>}
          {mode === "add-node" && (
            <p className="hint-text">Click anywhere on the map to place a new node.</p>
          )}
          {mode === "add-edge" && !edgeStart && (
            <p className="hint-text">Click a node to start an edge.</p>
          )}
          {mode === "add-edge" && edgeStart && (
            <p className="hint-text">Click another node to connect, or click the same node to cancel.</p>
          )}
        </div>

        <div className="mapper-main">
          {/* SVG Map */}
          <div className="mapper-canvas">
            <svg
              ref={svgRef}
              viewBox={viewBox}
              className="mapper-svg"
              onClick={handleSvgClick}
              style={{ cursor: mode === "add-node" ? "crosshair" : "default" }}
            >
              {/* Grid lines */}
              {Array.from({ length: Math.ceil((bounds.maxX - bounds.minX) / 5) + 1 }, (_, i) => {
                const x = bounds.minX + i * 5;
                return (
                  <line
                    key={`vx${i}`}
                    x1={x}
                    y1={bounds.minZ}
                    x2={x}
                    y2={bounds.maxZ}
                    stroke="#e0e0e0"
                    strokeWidth={0.05}
                  />
                );
              })}
              {Array.from({ length: Math.ceil((bounds.maxZ - bounds.minZ) / 5) + 1 }, (_, i) => {
                const z = bounds.minZ + i * 5;
                return (
                  <line
                    key={`hz${i}`}
                    x1={bounds.minX}
                    y1={z}
                    x2={bounds.maxX}
                    y2={z}
                    stroke="#e0e0e0"
                    strokeWidth={0.05}
                  />
                );
              })}

              {/* Edges */}
              {edges.map(([a, b], idx) => {
                const na = graph.nodes[a];
                const nb = graph.nodes[b];
                if (!na || !nb) return null;
                const isSelected =
                  (selectedId === a || selectedId === b) ||
                  (edgeStart === a || edgeStart === b);
                return (
                  <g key={`e${idx}`}>
                    <line
                      x1={na.x}
                      y1={na.z}
                      x2={nb.x}
                      y2={nb.z}
                      stroke={isSelected ? "#0066cc" : "#c0c0c0"}
                      strokeWidth={isSelected ? 0.15 : 0.08}
                      strokeLinecap="round"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (mode === "select" && confirm(`Delete edge ${a} — ${b}?`)) {
                          handleDeleteEdge(a, b);
                        }
                      }}
                      style={{ cursor: mode === "select" ? "pointer" : "default" }}
                    />
                  </g>
                );
              })}

              {/* Nodes */}
              {nodeList.map(([id, node]) => {
                const isSelected = selectedId === id;
                const isEdgeStart = edgeStart === id;
                const color = NODE_COLORS[node.type] || "#666";
                return (
                  <g
                    key={id}
                    onClick={(e) => handleNodeClick(e, id)}
                    style={{ cursor: "pointer" }}
                  >
                    <circle
                      cx={node.x}
                      cy={node.z}
                      r={isSelected || isEdgeStart ? 0.6 : 0.4}
                      fill={isEdgeStart ? "#0066cc" : color}
                      stroke={isSelected ? "#0066cc" : "#fff"}
                      strokeWidth={isSelected ? 0.15 : 0.08}
                      opacity={0.9}
                    />
                    <text
                      x={node.x}
                      y={node.z - 0.7}
                      textAnchor="middle"
                      fontSize={0.55}
                      fill="#1d1d1f"
                      fontWeight={600}
                      style={{ pointerEvents: "none", userSelect: "none" }}
                    >
                      {node.name || id}
                    </text>
                    <text
                      x={node.x}
                      y={node.z + 1.1}
                      textAnchor="middle"
                      fontSize={0.4}
                      fill="#7a7a7a"
                      style={{ pointerEvents: "none", userSelect: "none" }}
                    >
                      {id}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Sidebar */}
          <div className="mapper-sidebar">
            {selectedNode ? (
              <div className="utility-card" style={{ marginBottom: 12 }}>
                <h3>Edit node</h3>
                <div className="divider" />
                <label>ID</label>
                <input value={selectedId} disabled />

                <label>Name</label>
                <input
                  value={selectedNode.name || ""}
                  onChange={(e) => handleUpdateNode(selectedId, { name: e.target.value })}
                />

                <label>Type</label>
                <select
                  value={selectedNode.type || "waypoint"}
                  onChange={(e) => handleUpdateNode(selectedId, { type: e.target.value })}
                >
                  {Object.entries(TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>

                <label>Floor</label>
                <input
                  type="number"
                  value={selectedNode.floor ?? 1}
                  onChange={(e) => handleUpdateNode(selectedId, { floor: Number(e.target.value) })}
                />

                <label>X position</label>
                <input
                  type="number"
                  step={0.1}
                  value={selectedNode.x}
                  onChange={(e) => handleUpdateNode(selectedId, { x: Number(e.target.value) })}
                />

                <label>Z position</label>
                <input
                  type="number"
                  step={0.1}
                  value={selectedNode.z}
                  onChange={(e) => handleUpdateNode(selectedId, { z: Number(e.target.value) })}
                />

                <label>Notes</label>
                <input
                  value={selectedNode.notes || ""}
                  onChange={(e) => handleUpdateNode(selectedId, { notes: e.target.value })}
                />

                <div className="row" style={{ marginTop: 12 }}>
                  <button className="btn primary" onClick={() => setSelectedId(null)}>
                    Done
                  </button>
                  <button
                    className="btn pearl"
                    onClick={() => handleDeleteNode(selectedId)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <div className="utility-card" style={{ marginBottom: 12 }}>
                <h3>No node selected</h3>
                <p className="muted">
                  Click a node to edit its metadata, or switch to Add mode to create new nodes and edges.
                </p>
              </div>
            )}

            <div className="utility-card">
              <h3>Connected edges</h3>
              <div className="divider" />
              {selectedId ? (
                edges
                  .filter(([a, b]) => a === selectedId || b === selectedId)
                  .map(([a, b, w], idx) => {
                    const other = a === selectedId ? b : a;
                    const otherNode = graph.nodes[other];
                    return (
                      <div key={idx} className="edge-row">
                        <span>{otherNode?.name || other}</span>
                        <span className="muted">{Math.round(w * 10) / 10} m</span>
                        <button
                          className="btn pearl"
                          style={{ fontSize: 12, padding: "4px 10px" }}
                          onClick={() => handleDeleteEdge(a, b)}
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })
              ) : (
                <p className="muted">Select a node to see its edges.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
