import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { findPath, directionYaw, pathLength, NODES } from "../indoorGraph.js";

/**
 * The AR view.
 *
 *  - Reads `?from=` (the QR the user just scanned = "you are here")
 *    and `?to=` (their destination) from the URL.
 *  - A-Frame + AR.js run inside the page; the user grants camera access.
 *  - When AR.js finds a barcode marker, we look at its `barcodeValue` to
 *    figure out WHICH waypoint the user is actually standing at.
 *  - We compute the path through the indoor graph and anchor a 3D arrow
 *    to the marker, pointing at the first step of the path.
 *
 *  No GPS, no Wi-Fi triangulation, no SLAM. The printed QR sticker on
 *  the wall is the only positioning signal we have.
 */
export default function ARNav() {
  const [params] = useSearchParams();
  const from = params.get("from") || "QR_A1";
  const to = params.get("to") || "room-301";

  const path = useMemo(() => findPath(from, to), [from, to]);
  const totalMeters = useMemo(() => (path ? pathLength(path) : 0), [path]);
  const nextStep = path && path.length > 1 ? path[1] : null;
  const yaw = useMemo(
    () => (nextStep ? directionYaw(from, nextStep) : 0),
    [from, nextStep]
  );

  const [scanned, setScanned] = useState(false);
  const [confirmedFrom, setConfirmedFrom] = useState(from);

  // Wire markerFound / markerLost after the scene is mounted.
  useEffect(() => {
    let mounted = true;
    const wire = () => {
      if (!mounted) return;
      const scene = document.querySelector("a-scene");
      if (!scene) return;

      // AR.js barcode values are numbers 0..63 in 3x3 mode. We hash the
      // waypoint id to a stable number so the printed QR (which the user
      // reads with their phone) and the tracked marker (which AR.js reads
      // from the same QR) match up. The mapping is deterministic: we use
      // the index in the waypoint list.
      const waypointIds = Object.keys(NODES).filter((id) => id.startsWith("QR_"));
      const targetIdx = waypointIds.indexOf(from);
      const marker = scene.querySelectorAll("a-marker")[targetIdx] || scene.querySelector("a-marker");
      const arrow = scene.querySelector("#nav-arrow");
      const distText = scene.querySelector("#nav-distance");

      if (arrow) {
        arrow.setAttribute("rotation", `0 ${(yaw * 180) / Math.PI} 0`);
      }
      if (distText && nextStep) {
        const remaining = pathLength(path.slice(path.indexOf(nextStep) - 1));
        distText.setAttribute(
          "value",
          `${Math.round(remaining)} m to ${NODES[nextStep]?.name || nextStep}`
        );
      }

      if (marker) {
        marker.addEventListener("markerFound", () => {
          if (!mounted) return;
          setScanned(true);
          // Map the detected marker index back to the waypoint id.
          const idx = Array.from(scene.querySelectorAll("a-marker")).indexOf(marker);
          if (idx >= 0 && waypointIds[idx]) setConfirmedFrom(waypointIds[idx]);
        });
        marker.addEventListener("markerLost", () => {
          if (!mounted) return;
          setScanned(false);
        });
      }
    };
    // Wait two RAFs to be sure the A-Frame scene has initialized.
    const raf = requestAnimationFrame(() => requestAnimationFrame(wire));
    return () => {
      mounted = false;
      cancelAnimationFrame(raf);
    };
  }, [from, yaw, nextStep, path]);

  if (!NODES[from] || !NODES[to]) {
    return (
      <>
        <nav className="glass-nav">
          <Link to="/" className="brand">AR Nav</Link>
          <span className="spacer" />
          <Link to="/" className="btn pill-link">Exit</Link>
        </nav>
        <div className="app">
          <h1>Unknown location</h1>
          <p>
            The QR sticker encodes <code>from={from}</code> or{" "}
            <code>to={to}</code>, which is not in the building map. Print
            your stickers from <Link to="/posters">/posters</Link> to make
            sure they match the IDs in <code>src/indoorGraph.js</code>.
          </p>
          <Link to="/" className="btn primary">Back home</Link>
        </div>
      </>
    );
  }

  if (!path) {
    return (
      <>
        <nav className="glass-nav">
          <Link to="/" className="brand">AR Nav</Link>
          <span className="spacer" />
          <Link to="/" className="btn pill-link">Exit</Link>
        </nav>
        <div className="app">
          <h1>No route</h1>
          <p>
            The building graph has no path from <code>{from}</code> to{" "}
            <code>{to}</code>.
          </p>
          <Link to="/" className="btn primary">Back home</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="ar-stage">
        {/*
          AR.js barcode markers: any QR code with the matrix pattern works
          as both the URL carrier AND a tracking marker. We pre-declare the
          waypoint IDs from the graph so the camera only tries to track
          the ones we care about (3x3 matrix supports barcode values
          0..63, so we map "QR_A1" → value "A1" via the .replace below).
        */}
        <a-scene
          embedded
          arjs="sourceType: webcam; detectionMode: mono_and_matrix; matrixCodeType: 3x3; debugUIEnabled: false;"
          vr-mode-ui="enabled: false"
          renderer="logarithmicDepthBuffer: true;"
          style={{ position: "absolute", inset: 0 }}
        >
          <a-entity camera></a-entity>

          {Object.keys(NODES)
            .filter((id) => id.startsWith("QR_"))
            .map((id, idx) => {
              // AR.js 3x3 barcode matrix: numeric value 0..63. We use the
              // index in the waypoint list as the barcode value.
              const barcodeVal = String(idx);
              return (
                <a-marker
                  key={id}
                  type="barcode"
                  value={barcodeVal}
                  smooth="true"
                  smoothCount="5"
                  smoothTolerance="0.01"
                  smoothThreshold="2"
                >
                  <a-entity
                    id="nav-arrow"
                    position="0 0 0"
                    rotation={`0 ${(yaw * 180) / Math.PI} 0`}
                  >
                    <a-entity
                      geometry="primitive: cone; radiusBottom: 0.15; radiusTop: 0; height: 0.5"
                      material="color: #0071e3; emissive: #0071e3; emissiveIntensity: 0.7; opacity: 0.95;"
                      position="0 0.4 0"
                      rotation="-90 0 0"
                    />
                    <a-entity
                      geometry="primitive: cylinder; radius: 0.05; height: 0.6"
                      material="color: #0071e3; opacity: 0.85;"
                      position="0 0 0"
                    />
                    <a-entity
                      id="nav-distance"
                      text="value: ...; color: white; align: center; width: 1.6;"
                      position="0 1.1 0"
                    />
                  </a-entity>
                </a-marker>
              );
            })}
        </a-scene>
      </div>

      <div className="ar-overlay">
        <div>
          <div className="who">
            <span className={`status-dot ${scanned ? "ok" : "scan"}`} />
            {scanned ? "Marker locked" : "Scanning…"}
          </div>
          <div className="meta">
            {NODES[confirmedFrom]?.name || from} → {NODES[to]?.name}
          </div>
        </div>
        <Link to="/" className="btn pill-link">Exit</Link>
      </div>

      <div className="hint">
        {scanned
          ? `Follow the arrow · ${Math.round(totalMeters)} m to ${NODES[to]?.name}`
          : "Point your camera at the QR sticker on the wall"}
      </div>
    </>
  );
}
