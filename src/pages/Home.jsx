import { Link } from "react-router-dom";
import { NODES } from "../indoorGraph.js";

/**
 * Landing page styled in the Apple design system:
 *   - Sticky translucent glass nav
 *   - Centered hero with SF Pro Display 56px headline
 *   - Cinematic black section alternating with light gray cards
 *   - Pill CTAs (980px radius) — the signature Apple link shape
 */
export default function Home() {
  const sampleQrUrl = `${window.location.origin}/ar?from=QR_A1&to=room-301`;

  return (
    <>
      {/* DESIGN.md: components.global-nav — 44px, surface-black, nav-link type */}
      <nav className="glass-nav">
        <span className="brand">AR Nav</span>
        <Link to="/">Overview</Link>
        <Link to="/ar?from=QR_A1&to=room-301">Try AR</Link>
        <Link to="/posters">Print</Link>
        <span className="spacer" />
        <a href="https://github.com/FireFlyDeveloper/ar-nav" target="_blank" rel="noreferrer">
          GitHub
        </a>
      </nav>

      {/* DESIGN.md: components.sub-nav-frosted — 52px, parchment @ 80% with blur */}
      <div className="sub-nav">
        Indoor Wayfinding
        <span className="spacer" />
        <Link to="/ar?from=QR_A1&to=room-301" className="btn primary" style={{ fontSize: 14, padding: "8px 18px" }}>
          Try AR <span className="chev">›</span>
        </Link>
      </div>

      <div className="app">
        <section className="hero">
          <h1>AR Nav.</h1>
          <p className="sub">
            Indoor wayfinding that fits in a sticker. Scan with your phone,
            follow the arrow.
          </p>
          <div className="row" style={{ justifyContent: "center" }}>
            <a className="btn primary" href={sampleQrUrl}>
              Open AR view <span className="chev">›</span>
            </a>
            <Link to="/posters" className="btn pill-link">
              Print stickers
            </Link>
          </div>
        </section>

        {/* DESIGN.md: components.product-tile-parchment — full-bleed, no rounding */}
        <div className="card">
          <h2>How it works.</h2>
          <p>
            Each waypoint poster has two codes: a <strong>QR code</strong> that
            encodes a URL like <code>/ar?from=QR_A1&amp;to=room-301</code>, and
            an <strong>AR.js barcode marker</strong> (a black-and-white grid).
            When the phone's camera app scans the QR code, the browser opens
            this React app. AR.js then detects the barcode marker in the camera
            view and anchors a 3D arrow to it, pointing at the destination
            based on an indoor graph.
          </p>
          <p>
            No GPS. No app install. No backend. The QR code launches the
            experience; the barcode marker anchors the AR content.
          </p>
        </div>

        {/* DESIGN.md: components.product-tile-dark — surface-tile-1, on-dark text */}
        <div className="card dark">
          <h2>Three things you need.</h2>
          <ol>
            <li>A printed poster with a QR code + AR barcode marker at every decision point.</li>
            <li>An indoor graph of waypoints and rooms.</li>
            <li>This React app hosted on any static host with HTTPS.</li>
          </ol>
          <p>
            <a className="btn pill-link on-dark" href={sampleQrUrl}>
              See it in action <span className="chev">›</span>
            </a>
          </p>
        </div>

        <div className="card white">
          <h2>The building.</h2>
          <div className="legend">
            <span><span className="dot you" /> you are here (QR)</span>
            <span><span className="dot dest" /> destination</span>
          </div>
          <ul>
            {Object.entries(NODES).map(([id, n]) => (
              <li key={id}>
                <code>{id}</code> — {n.name}
              </li>
            ))}
          </ul>
        </div>

        <p className="foot">
          Built with React, Vite, and AR.js. Works on iOS Safari and Android Chrome.
        </p>
      </div>
    </>
  );
}
