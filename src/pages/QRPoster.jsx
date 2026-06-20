import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { NODES } from "../indoorGraph.js";
import { Link } from "react-router-dom";

/**
 * Print-friendly waypoint poster generator.
 *
 * Each poster is a self-contained printable card containing:
 *   - a QR code that encodes the absolute URL `/ar?from=ID&to=DEFAULT`
 *   - the waypoint's name and ID
 *
 * The default destination is hard-coded below; change it for the venue
 * or extend the page to choose per waypoint.
 */
const DEFAULT_DEST = "room-301";

export default function QRPoster() {
  const [base, setBase] = useState("");
  const [tiles, setTiles] = useState([]);

  useEffect(() => {
    const url = `${window.location.origin}/ar`;
    setBase(url);

    const waypoints = Object.entries(NODES).filter(([id]) => id.startsWith("QR_"));
    Promise.all(
      waypoints.map(async ([id, node]) => {
        const target = `${url}?from=${id}&to=${DEFAULT_DEST}`;
        const dataUrl = await QRCode.toDataURL(target, {
          margin: 1,
          scale: 6,
          color: { dark: "#000000", light: "#ffffff" },
        });
        return { id, node, dataUrl, target };
      })
    ).then(setTiles);
  }, []);

  return (
    <>
      <nav className="glass-nav">
        <Link to="/" className="brand">AR Nav</Link>
        <Link to="/">Overview</Link>
        <Link to="/ar?from=QR_A1&to=room-301">Try AR</Link>
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
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div>
              <h3>Target URL</h3>
              <p style={{ marginBottom: 0 }}>
                Each QR encodes{" "}
                <code>{base || "/ar"}?from=ID&amp;to={DEFAULT_DEST}</code>
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
              <div className="id">{id} → {DEFAULT_DEST}</div>
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
