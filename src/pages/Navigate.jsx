import { useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { findPath, pathLength, stepInstruction, getNodes, getEdges } from "../indoorGraph.js";

const NODE_COLORS = {
  entrance: "#0066cc",
  waypoint: "#34c759",
  room: "#ff9500",
  poi: "#af52de",
  stairs: "#5856d6",
  elevator: "#5ac8fa",
  exit: "#ff3b30",
};

export default function Navigate() {
  const [params] = useSearchParams();
  const from = params.get("from") || "";
  const to = params.get("to") || "";

  const nodes = getNodes();
  const edges = getEdges();

  const fromNode = nodes[from];
  const toNode = nodes[to];
  const path = useMemo(() => findPath(from, to), [from, to]);
  const totalMeters = useMemo(() => (path ? pathLength(path) : 0), [path]);

  const bounds = useMemo(() => {
    const ids = Object.keys(nodes);
    if (ids.length === 0) return { minX: -5, maxX: 20, minZ: -10, maxZ: 10 };
    const xs = ids.map((id) => nodes[id].x);
    const zs = ids.map((id) => nodes[id].z);
    const pad = 3;
    return {
      minX: Math.min(...xs) - pad,
      maxX: Math.max(...xs) + pad,
      minZ: Math.min(...zs) - pad,
      maxZ: Math.max(...zs) + pad,
    };
  }, [nodes]);

  const viewBox = `${bounds.minX} ${bounds.minZ} ${bounds.maxX - bounds.minX} ${bounds.maxZ - bounds.minZ}`;

  // Determine which step we're on (for now, always show full path)
  const instructions = useMemo(() => {
    if (!path) return [];
    return path.map((_, i) => stepInstruction(path, i));
  }, [path]);

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
        Indoor Navigation
        <span className="spacer" />
        {from && to && (
          <span className="muted" style={{ fontSize: 14, fontWeight: 400 }}>
            {from} → {to}
          </span>
        )}
      </div>

      <div className="navigate-layout">
        {/* Map */}
        <div className="navigate-map">
          {!from || !to ? (
            <div className="empty-state">
              <h2>No route requested</h2>
              <p className="muted">
                Open this page with URL parameters, e.g.{" "}
                <code>?from=QR_A1&to=room-301</code>.
              </p>
              <Link to="/navigate?from=QR_A1&to=room-301" className="btn primary">
                Try demo route
              </Link>
            </div>
          ) : !fromNode ? (
            <div className="empty-state">
              <h2>Unknown starting point</h2>
              <p className="muted">
                Waypoint <code>{from}</code> is not in the map.
              </p>
              <Link to="/mapper" className="btn primary">
                Open mapper
              </Link>
            </div>
          ) : !toNode ? (
            <div className="empty-state">
              <h2>Unknown destination</h2>
              <p className="muted">
                Destination <code>{to}</code> is not in the map.
              </p>
              <Link to="/mapper" className="btn primary">
                Open mapper
              </Link>
            </div>
          ) : !path ? (
            <div className="empty-state">
              <h2>No route found</h2>
              <p className="muted">
                There is no connected path from <code>{from}</code> to <code>{to}</code>.
              </p>
              <Link to="/mapper" className="btn primary">
                Open mapper
              </Link>
            </div>
          ) : (
            <svg viewBox={viewBox} className="navigate-svg">
              {/* Grid */}
              {Array.from({ length: Math.ceil((bounds.maxX - bounds.minX) / 5) + 1 }, (_, i) => {
                const x = bounds.minX + i * 5;
                return (
                  <line
                    key={`vx${i}`}
                    x1={x}
                    y1={bounds.minZ}
                    x2={x}
                    y2={bounds.maxZ}
                    stroke="#e8e8e8"
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
                    stroke="#e8e8e8"
                    strokeWidth={0.05}
                  />
                );
              })}

              {/* All edges */}
              {edges.map(([a, b], idx) => {
                const na = nodes[a];
                const nb = nodes[b];
                if (!na || !nb) return null;
                return (
                  <line
                    key={`e${idx}`}
                    x1={na.x}
                    y1={na.z}
                    x2={nb.x}
                    y2={nb.z}
                    stroke="#d0d0d0"
                    strokeWidth={0.08}
                    strokeLinecap="round"
                  />
                );
              })}

              {/* Route path */}
              {path && path.length > 1 && (
                <polyline
                  points={path.map((id) => `${nodes[id].x},${nodes[id].z}`).join(" ")}
                  fill="none"
                  stroke="#0066cc"
                  strokeWidth={0.25}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.85}
                />
              )}

              {/* Nodes */}
              {Object.entries(nodes).map(([id, node]) => {
                const isFrom = id === from;
                const isTo = id === to;
                const isOnPath = path?.includes(id);
                const color = NODE_COLORS[node.type] || "#666";
                const r = isFrom || isTo ? 0.55 : isOnPath ? 0.45 : 0.3;
                return (
                  <g key={id}>
                    <circle
                      cx={node.x}
                      cy={node.z}
                      r={r}
                      fill={isFrom ? "#0066cc" : isTo ? "#1d1d1f" : color}
                      stroke="#fff"
                      strokeWidth={0.08}
                      opacity={0.95}
                    />
                    {(isFrom || isTo || isOnPath) && (
                      <text
                        x={node.x}
                        y={node.z - r - 0.25}
                        textAnchor="middle"
                        fontSize={0.5}
                        fill="#1d1d1f"
                        fontWeight={600}
                        style={{ userSelect: "none" }}
                      >
                        {isFrom ? "You are here" : isTo ? node.name || id : node.name || id}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          )}
        </div>

        {/* Sidebar */}
        <div className="navigate-sidebar">
          {fromNode && toNode && path && (
            <div className="utility-card" style={{ marginBottom: 12 }}>
              <h3>Route</h3>
              <div className="divider" />
              <div className="route-meta">
                <div>
                  <div className="label">From</div>
                  <div className="value">{fromNode.name || from}</div>
                </div>
                <div>
                  <div className="label">To</div>
                  <div className="value">{toNode.name || to}</div>
                </div>
                <div>
                  <div className="label">Distance</div>
                  <div className="value">{Math.round(totalMeters * 10) / 10} m</div>
                </div>
                <div>
                  <div className="label">Stops</div>
                  <div className="value">{path.length}</div>
                </div>
              </div>
            </div>
          )}

          {instructions.length > 0 && (
            <div className="utility-card">
              <h3>Directions</h3>
              <div className="divider" />
              <ol className="direction-list">
                {instructions.map((inst, i) => (
                  <li key={i} className={i === 0 ? "active-step" : ""}>
                    <span className="step-num">{i + 1}</span>
                    <span className="step-text">{inst.text}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {fromNode && toNode && !path && (
            <div className="utility-card">
              <h3>No connection</h3>
              <p className="muted">
                The graph has no walking edges linking these two points. Use the mapper to connect them.
              </p>
              <Link to="/mapper" className="btn primary" style={{ marginTop: 12 }}>
                Open mapper
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
