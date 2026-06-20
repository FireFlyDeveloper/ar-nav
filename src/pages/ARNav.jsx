import { useEffect, useRef, useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import * as THREE from "three";
import { MindARThree } from "mind-ar/dist/mindar-image-three.prod.js";
import { findPath, directionYaw, pathLength, NODES } from "../indoorGraph.js";

/**
 * 3D arrow rendered as a Three.js group.
 * Red (#ff3b30) for high contrast against real-world camera feed.
 */
function createArrowGroup(headingDegrees = 0) {
  const group = new THREE.Group();
  group.rotation.y = (headingDegrees * Math.PI) / 180;

  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.8, 24),
    new THREE.MeshStandardMaterial({ color: "#ff3b30" })
  );
  shaft.rotation.x = Math.PI / 2;
  shaft.position.z = -0.35;

  const head = new THREE.Mesh(
    new THREE.ConeGeometry(0.16, 0.35, 32),
    new THREE.MeshStandardMaterial({ color: "#ff3b30" })
  );
  head.rotation.x = -Math.PI / 2;
  head.position.z = -0.85;

  group.add(shaft, head);
  return group;
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
  const [diagStatus, setDiagStatus] = useState("idle"); // idle | loading | ready | found | lost | error
  const [diagMessage, setDiagMessage] = useState("");

  const containerRef = useRef(null);
  const mindarRef = useRef(null);

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

  const targetFile = `/targets/${from}.mind`;
  const headingDegrees = (yaw * 180) / Math.PI;

  useEffect(() => {
    if (!started || !containerRef.current) return;

    let mounted = true;
    let mindarThree = null;

    const init = async () => {
      try {
        setDiagStatus("loading");
        setDiagMessage("Initializing AR camera…");

        mindarThree = new MindARThree({
          container: containerRef.current,
          imageTargetSrc: targetFile,
          uiLoading: "no",
          uiScanning: "no",
          uiError: "no",
        });
        mindarRef.current = mindarThree;

        const { renderer, scene, camera } = mindarThree;

        // Build arrow and attach to anchor
        const arrow = createArrowGroup(headingDegrees);
        const anchor = mindarThree.addAnchor(0);
        anchor.group.add(arrow);

        anchor.onTargetFound = () => {
          if (!mounted) return;
          setTargetVisible(true);
          setDiagStatus("found");
          setDiagMessage(`Waypoint detected: ${from}`);
        };
        anchor.onTargetLost = () => {
          if (!mounted) return;
          setTargetVisible(false);
          setDiagStatus("lost");
          setDiagMessage(`Searching for ${from} poster…`);
        };

        scene.add(new THREE.AmbientLight(0xffffff, 1));
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
        dirLight.position.set(2.5, 8, 5);
        scene.add(dirLight);

        setDiagStatus("ready");
        setDiagMessage("Point camera at the poster");

        await mindarThree.start();

        renderer.setAnimationLoop(() => {
          renderer.render(scene, camera);
        });
      } catch (err) {
        console.error("MindAR init error:", err);
        if (!mounted) return;
        setDiagStatus("error");
        const msg = err?.message || String(err);
        if (msg.includes("fetch") || msg.includes("404") || msg.includes("network")) {
          setDiagMessage(`Target file not loaded: ${targetFile}`);
        } else if (msg.includes("Permission") || msg.includes("NotAllowed")) {
          setDiagMessage("Camera permission denied. Please allow camera access.");
        } else if (msg.includes("NotFound")) {
          setDiagMessage("Camera not found. Ensure a camera is available.");
        } else {
          setDiagMessage(`AR error: ${msg}`);
        }
      }
    };

    init();

    return () => {
      mounted = false;
      if (mindarRef.current) {
        try {
          mindarRef.current.stop();
        } catch (e) {
          // ignore cleanup errors
        }
        mindarRef.current = null;
      }
    };
  }, [started, from, headingDegrees, targetFile]);

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
          {/* MindAR injects video + canvas into this container */}
          <div ref={containerRef} className="ar-canvas-container" />

          <div className="ar-overlay">
            <div className="ar-overlay-top">
              <div className="ar-status-block">
                <div className="ar-status-main">
                  <span
                    className={`status-dot ${
                      diagStatus === "found"
                        ? "ok"
                        : diagStatus === "error"
                        ? "err"
                        : "scan"
                    }`}
                  />
                  {diagStatus === "found"
                    ? "Marker found"
                    : diagStatus === "error"
                    ? "AR error"
                    : diagStatus === "loading"
                    ? "Starting AR…"
                    : "Searching for marker"}
                </div>
                <div className="ar-status-meta">
                  {from} → {to} · {Math.round(totalMeters)} m
                </div>
                {diagMessage && (
                  <div className="ar-status-diag">{diagMessage}</div>
                )}
              </div>
              <Link to="/" className="btn utility">
                Exit
              </Link>
            </div>

            <div className="ar-overlay-bottom">
              <div className="ar-floating-bar">
                <span className="ar-floating-bar-text">
                  {diagStatus === "found"
                    ? `Navigating to ${to}`
                    : diagStatus === "error"
                    ? "Check diagnostics above"
                    : `Point camera at ${from} poster`}
                </span>
                <span className="ar-floating-bar-meta">
                  {diagStatus === "found"
                    ? "Tracking active"
                    : diagStatus === "error"
                    ? "Stopped"
                    : "Scanning…"}
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
