import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { NODES } from "../indoorGraph.js";
import { Link } from "react-router-dom";

/**
 * Print-friendly waypoint poster generator.
 *
 * Each poster contains TWO codes:
 *   1. A QR code that encodes the absolute URL `/ar?from=ID&to=DEFAULT`
 *      — scanned with the phone's native camera app to open the browser.
 *   2. An AR.js barcode marker image (the 3x3 black/white grid)
 *      — detected by the AR camera to anchor the 3D arrow.
 *
 * AR.js cannot detect standard QR codes as tracking targets; it needs its
 * own barcode markers. So the user scans the QR to launch the app, then
 * points the AR camera at the barcode grid to see the arrow.
 */
const DEFAULT_DEST = "room-301";

const WAYPOINT_IDS = Object.keys(NODES).filter((id) => id.startsWith("QR_"));

function barcodeUrl(idx) {
  return `${window.location.origin}/markers/${idx}.png`;
}

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
        const barcodeIdx = WAYPOINT_IDS.indexOf(id);
        return { id, node, dataUrl, target, barcodeIdx };
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
              <h3>How to use the poster</h3>
              <p style={{ marginBottom: 0 }}>
                Each poster has a <strong>QR code</strong> (launch the app) and
                an <strong>AR barcode marker</strong> (anchor for the 3D arrow).
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
          <ol style={{ marginTop: 12, fontSize: 14, paddingLeft: 18 }}>
            <li>Scan the QR code with your phone's camera app to open the AR page.</li>
            <li>Tap "Start camera".</li>
            <li>Point the camera at the <strong>barcode marker</strong> (the black-and-white grid) — not the QR code.</li>
            <li>The 3D arrow appears, pointing toward your destination.</li>
          </ol>
          <p style={{ marginTop: 12, fontSize: 14 }}>
            Tip: in the print dialog enable "Background graphics" and set
            margins to "None" for clean stickers.
          </p>
        </div>

        <div className="qr-grid">
          {tiles.map(({ id, node, dataUrl, target, barcodeIdx }) => (
            <div className="qr-tile" key={id}>
              <div className="row" style={{ gap: 16, justifyContent: "center" }}>
                <div>
                  <img src={dataUrl} alt={`QR for ${id}`} style={{ width: 120, height: 120 }} />
                  <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>Scan to launch</div>
                </div>
                <div>
                  <img
                    src={barcodeUrl(barcodeIdx)}
                    alt={`Barcode marker ${barcodeIdx} for ${id}`}
                    style={{ width: 120, height: 120, imageRendering: "pixelated" }}
                  />
                  <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>Point AR camera here</div>
                </div>
              </div>
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
