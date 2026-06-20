import { Link } from "react-router-dom";
import { getNodes } from "../indoorGraph.js";

/**
 * Landing page styled in the Apple design system:
 *   - Sticky translucent glass nav
 *   - Centered hero with SF Pro Display 56px headline
 *   - Cinematic black section alternating with light gray cards
 *   - Pill CTAs (980px radius) — the signature Apple link shape
 */
export default function Home() {
  const nodes = getNodes();
  const sampleQrUrl = `${window.location.origin}/navigate?from=QR_A1&to=room-301`;
  const sampleArUrl = `${window.location.origin}/ar?from=QR_A1&to=room-301`;

  return (
    <>
      {/* DESIGN.md: components.global-nav — 44px, surface-black, nav-link type */}
      <nav className="glass-nav">
        <span className="brand">AR Nav</span>
        <Link to="/">Overview</Link>
        <Link to="/navigate?from=QR_A1&to=room-301">Navigate</Link>
        <Link to="/mapper">Mapper</Link>
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
        <Link to="/navigate?from=QR_A1&to=room-301" className="btn primary" style={{ fontSize: 14, padding: "8px 18px" }}>
          Try it <span className="chev">›</span>
        </Link>
      </div>

      <div className="app">
        <section className="hero">
          <h1>AR Nav.</h1>
          <p className="sub">
            Indoor wayfinding that fits in a sticker. Scan with your phone,
            follow the map.
          </p>
          <div className="row" style={{ justifyContent: "center" }}>
            <a className="btn primary" href={sampleQrUrl}>
              Open map view <span className="chev">›</span>
            </a>
            <a className="btn pill-link" href={sampleArUrl}>
              AR guidance
            </a>
            <Link to="/mapper" className="btn pearl">
              Mapper
            </Link>
          </div>
        </section>

        {/* DESIGN.md: components.product-tile-parchment — full-bleed, no rounding */}
        <div className="card">
          <h2>How it works.</h2>
          <p>
            Each QR sticker encodes a URL like{" "}
            <code>/navigate?from=QR_A1&amp;to=room-301</code>. When the phone's
            camera app decodes it, the browser opens this app and immediately
            shows a 2D map with your current position and the route to your
            destination.
          </p>
          <p>
            No GPS. No app install. No backend. The sticker is the "you are
            here" pin — the route is calculated from a hand-editable indoor graph.
          </p>
        </div>

        {/* DESIGN.md: components.product-tile-dark — surface-tile-1, on-dark text */}
        <div className="card dark">
          <h2>Three things you need.</h2>
          <ol>
            <li>A printed QR sticker at every decision point.</li>
            <li>An indoor graph of waypoints and rooms.</li>
            <li>This app hosted on any static host with HTTPS.</li>
          </ol>
          <p>
            <Link className="btn pill-link on-dark" to="/mapper">
              Build the graph <span className="chev">›</span>
            </Link>
          </p>
        </div>

        <div className="card white">
          <h2>The building.</h2>
          <div className="legend">
            <span><span className="dot you" /> you are here (QR)</span>
            <span><span className="dot dest" /> destination</span>
          </div>
          <ul>
            {Object.entries(nodes).map(([id, n]) => (
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
