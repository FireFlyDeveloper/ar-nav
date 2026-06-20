import { useRef, useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  ZapparCanvas,
  ZapparCamera,
  ImageTracker,
  BrowserCompatibility,
} from "@zappar/zappar-react-three-fiber";
import { findPath, directionYaw, pathLength, NODES } from "../indoorGraph.js";

/**
 * 3D arrow rendered inside the Zappar tracker.
 * Red (#ff3b30) for high contrast against real-world camera feed.
 */
function Arrow({ headingDegrees = 0 }) {
  return (
    <group rotation={[0, (headingDegrees * Math.PI) / 180, 0]}>
      <mesh position={[0, 0, -0.35]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.8, 24]} />
        <meshStandardMaterial color="#ff3b30" />
      </mesh>
      <mesh position={[0, 0, -0.85]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.16, 0.35, 32]} />
        <meshStandardMaterial color="#ff3b30" />
      </mesh>
    </group>
  );
}

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

  const [started, setStarted] = useState(false);
  const [targetVisible, setTargetVisible] = useState(false);
  const camera = useRef();

  if (!NODES[from] || !NODES[to]) {
    return (
      <div className="app">
        <h1>Unknown location</h1>
        <p>
          The QR sticker encodes <code>from={from}</code> or{" "}
          <code>to={to}</code>, which is not in the building map.
        </p>
        <Link to="/" className="btn primary">Back home</Link>
      </div>
    );
  }
  if (!path) {
    return (
      <div className="app">
        <h1>No route</h1>
        <p>
          No path from <code>{from}</code> to <code>{to}</code>.
        </p>
        <Link to="/" className="btn primary">Back home</Link>
      </div>
    );
  }

  const targetFile = `/targets/${from}.zpt`;
  const headingDegrees = (yaw * 180) / Math.PI;

  return (
    <div className="ar-stage">
      {!started && (
        <LaunchPanel
          fromId={from}
          toId={to}
          totalMeters={totalMeters}
          onStart={() => setStarted(true)}
        />
      )}

      {started && (
        <div className="ar-page">
          <BrowserCompatibility />
          <ZapparCanvas className="ar-canvas">
            <ZapparCamera ref={camera} />
            <ImageTracker
              targetImage={targetFile}
              camera={camera}
              onVisible={() => setTargetVisible(true)}
              onNotVisible={() => setTargetVisible(false)}
            >
              <group position={[0, 0.2, 0]} scale={[0.8, 0.8, 0.8]}>
                <Arrow headingDegrees={headingDegrees} />
              </group>
            </ImageTracker>
            <ambientLight intensity={1} />
            <directionalLight position={[2.5, 8, 5]} intensity={1.5} />
          </ZapparCanvas>

          <div className="ar-overlay">
            <div className="ar-overlay-top">
              <div className="ar-status-block">
                <div className="ar-status-main">
                  <span className={`status-dot ${targetVisible ? "ok" : "scan"}`} />
                  {targetVisible ? "Marker found" : "Searching for marker"}
                </div>
                <div className="ar-status-meta">
                  {from} → {to} · {Math.round(totalMeters)} m
                </div>
              </div>
              <Link to="/" className="btn utility">
                Exit
              </Link>
            </div>

            <div className="ar-overlay-bottom">
              <div className="ar-floating-bar">
                <span className="ar-floating-bar-text">
                  {targetVisible
                    ? `Follow arrow toward ${to}`
                    : `Point camera at ${from} poster`}
                </span>
                <span className="ar-floating-bar-meta">
                  {targetVisible ? "Tracking active" : "Scanning…"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LaunchPanel({ fromId, toId, totalMeters, onStart }) {
  return (
    <div className="ar-launch">
      <div className="ar-launch-card">
        <div className="ar-launch-eyebrow">AR Nav</div>
        <h1 className="ar-launch-title">Ready to navigate.</h1>
        <p className="ar-launch-body">
          Tap the button to start AR. Point your camera at the{" "}
          <strong>{fromId}</strong> poster on the wall. A 3D arrow will appear
          pointing toward <strong>{toId}</strong>.
        </p>
        <div className="ar-launch-cta">
          <button type="button" className="btn primary" onClick={onStart}>
            Start AR
          </button>
        </div>
        <div className="ar-launch-fine">
          Camera feed stays on this device. No video is uploaded.
        </div>
      </div>
    </div>
  );
}
