import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { getNodes } from "../indoorGraph.js";
import { Link } from "react-router-dom";

/**
 * Print-friendly waypoint poster generator + QR management.
 *
 * Each poster is a self-contained printable card containing:
 *   - a QR code that encodes the absolute URL `/navigate?from=ID&to=DEFAULT`
 *   - the waypoint's name and ID
 */
const DEFAULT_DEST = "room-301";

export default function QRPoster() {
  const nodes = getNodes();
  const [base, setBase] = useState("");
  const [tiles, setTiles] = useState([]);
  const [globalDest, setGlobalDest] = useState(DEFAULT_DEST);
  const [mode, setMode] = useState("navigate"); // navigate | ar

  const waypoints = Object.entries(nodes).filter(([id]) => id.startsWith("QR_"));
  const destinations = Object.entries(nodes).filter(([, n]) => n.type === "room" || n.type === "poi" || n.type === "exit");

  useEffect(() => {
    const url = `${window.location.origin}/${mode}`;
    setBase(url);

    Promise.all(
      waypoints.map(async ([id, node]) => {
        const target = `${url}?from=${encodeURIComponent(id)}&to=${encodeURIComponent(globalDest)}`;
        const dataUrl = await QRCode.toDataURL(target, {
          margin: 1,
          scale: 6,
          color: { dark: "#000000", light: "#ffffff" },
        });
        return { id, node, dataUrl, target };
      })
    ).then(setTiles);
  }, [nodes, globalDest, mode]);

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

      <div className="app">
        <section className="hero" style={{ padding: "64px 0 32px" }}>
          <h1 style={{ fontSize: 40 }}>Print stickers.</h1>
          <p className="sub">
            One card per waypoint. Stick them on walls at corridor intersections.
          </p>
        </section>

        <div className="card">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h3>Target URL</h3>
              <p style={{ marginBottom: 0 }}>
                Each QR encodes{" "}
                <code>{base || "/navigate"}?from=ID&amp;to={globalDest}</code>
              </p>
            </div>
            <button
              className="btn primary"
              onClick={() => window.print()}
              disabled={!tiles.length}
            >
              Print these
            </button>
          </div>

          <div className="row" style={{ marginTop: 16, gap: 12 }}>
            <div>
              <label style={{ marginTop: 0 }}>Destination</label>
              <select
                value={globalDest}
                onChange={(e) => setGlobalDest(e.target.value)}
                style={{ width: "auto", minWidth: 180 }}
              >
                {destinations.map(([id, node]) => (
                  <option key={id} value={id}>{node.name || id}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ marginTop: 0 }}>Mode</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                style={{ width: "auto", minWidth: 140 }}
              >
                <option value="navigate">2D Map (/navigate)</option>
                <option value="ar">AR Guidance (/ar)</option>
              </select>
            </div>
          </div>

          <p style={{ marginTop: 12, fontSize: 14 }}>
            Tip: in the print dialog enable "Background graphics" and set
            margins to "None" for clean stickers.
          </p>
        </div>

        <div className="qr-grid">
          {tiles.map(({ id, node, dataUrl, target }) => (
            <div className="qr-tile" key={id}>
              <img src={dataUrl} alt={`QR for ${id}`} />
              <h4>{node.name}</h4>
              <div className="id">{id} → {globalDest}</div>
              <div className="url">{target}</div>
            </div>
          ))}
        </div>

        <p className="foot">
          AR Nav · Sticker printer
        </p>
      </div>
    </>
  );
}
