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
            Each poster has a normal QR code that opens{" "}
            <code>/ar?from=QR_A1&amp;to=room-301</code>. When the phone's
            camera app scans it, the browser opens this React app. Zappar
            image tracking then locks onto the poster itself and anchors a
            3D arrow to it, pointing at the destination.
          </p>
          <p>
            No GPS. No app install. No backend. The poster is both the
            link and the tracking target.
          </p>
        </div>

        {/* DESIGN.md: components.product-tile-dark — surface-tile-1, on-dark text */}
        <div className="card dark">
          <h2>Three things you need.</h2>
          <ol>
            <li>A printed poster at every decision point.</li>
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

        <div className="card yellow" id="hosting">
          <h2>Hosting on a custom domain?</h2>
          <p>
            Zappar's image tracker license check is hard-coded to the host
            the app is loaded from. The Zappar WASM module whitelists
            these host patterns and treats everything else as a custom
            domain that needs to be registered with Zappar:
          </p>
          <ul>
            <li><code>*.zappar.io</code>, <code>*.webar.run</code>, <code>*.arweb.app</code></li>
            <li><code>*.ngrok.io</code> and <code>*.ngrok-free.app</code></li>
            <li>Local testing: <code>0.0.0.0</code>, <code>127.*</code>, <code>192.168.*</code>, <code>10.*</code></li>
          </ul>
          <p>
            If you open the app on <code>navigation.ffly.site</code> (or
            any other custom domain), Zappar will display a black banner
            that says <em>“Visit our licensing page to find out about
            hosting on your own domain.”</em> and the AR camera will not
            start until that domain is registered for an active
            ZapWorks / Zappar subscription.
          </p>
          <p>
            <strong>To test without paying for a license:</strong> run
            the dev server (<code>npm run dev</code>) and open it on
            your phone over the local Wi-Fi — the LAN IP gets the
            <code>192.168.*</code> exemption. For sharing with a phone
            on a different network, expose port 5173 with ngrok
            (<code>ngrok http 5173</code>) — the <code>*.ngrok.io</code> /
            <code>*.ngrok-free.app</code> URL is also exempt.
          </p>
          <p>
            <strong>For production on <code>navigation.ffly.site</code>:</strong>
            contact <a href="mailto:support@zappar.com">support@zappar.com</a>{" "}
            (or your ZapWorks account manager) to register
            <code>navigation.ffly.site</code> for the
            Enterprise / Distribution self-hosting license. See{" "}
            <a
              href="https://docs.zap.works/universal-ar/licensing/"
              target="_blank"
              rel="noreferrer"
            >
              docs.zap.works/universal-ar/licensing
            </a>
            .
          </p>
        </div>

        <p className="foot">
          Built with React, Vite, and Zappar Universal AR. Works on iOS Safari and Android Chrome.
        </p>
      </div>
    </>
  );
}
