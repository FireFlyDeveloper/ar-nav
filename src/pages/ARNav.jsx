import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import * as THREE from "three";
import { MindARThree } from "mind-ar/dist/mindar-image-three.prod.js";
import { findPath, directionYaw, pathLength, NODES } from "../indoorGraph.js";

/**
 * 3D arrow rendered as a Three.js group.
 * Apple Action Blue (#0066cc) for the arrow to match the design system.
 */
function createArrowGroup(headingDegrees = 0) {
  const group = new THREE.Group();
  group.rotation.y = (headingDegrees * Math.PI) / 180;

  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.8, 24),
    new THREE.MeshStandardMaterial({ color: "#0066cc", emissive: "#0066cc", emissiveIntensity: 0.3 })
  );
  shaft.rotation.x = Math.PI / 2;
  shaft.position.z = -0.35;

  const head = new THREE.Mesh(
    new THREE.ConeGeometry(0.16, 0.35, 32),
    new THREE.MeshStandardMaterial({ color: "#0066cc", emissive: "#0066cc", emissiveIntensity: 0.3 })
  );
  head.rotation.x = -Math.PI / 2;
  head.position.z = -0.85;

  group.add(shaft, head);
  return group;
}

/**
 * Checkmark icon SVG component.
 */
function CheckmarkIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
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
  const [diagStatus, setDiagStatus] = useState("idle"); // idle | loading | ready | found | lost | error
  const [diagMessage, setDiagMessage] = useState("");
  const [lastEventTime, setLastEventTime] = useState(null);
  const [showTargetHelp, setShowTargetHelp] = useState(false);
  const [diagDetails, setDiagDetails] = useState({
    cameraReady: false,
    targetFileLoaded: false,
    targetFileUrl: targetFile,
    lastEvent: "none",
  });

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
  const targetImage = `/targets/${from}.png`;
  const headingDegrees = (yaw * 180) / Math.PI;

  const updateStatus = useCallback((status, message) => {
    setDiagStatus(status);
    setDiagMessage(message);
    setLastEventTime(new Date().toLocaleTimeString());
    setDiagDetails((prev) => ({ ...prev, lastEvent: status }));
  }, []);

  const setCameraReady = useCallback((ready) => {
    setDiagDetails((prev) => ({ ...prev, cameraReady: ready }));
  }, []);

  const setTargetFileLoaded = useCallback((loaded) => {
    setDiagDetails((prev) => ({ ...prev, targetFileLoaded: loaded }));
  }, []);

  useEffect(() => {
    if (!started || !containerRef.current) return;

    let mounted = true;
    let mindarThree = null;

    const init = async () => {
      try {
        updateStatus("loading", "Initializing AR camera…");

        mindarThree = new MindARThree({
          container: containerRef.current,
          imageTargetSrc: targetFile,
          uiLoading: "no",
          uiScanning: "no",
          uiError: "no",
          warmupTolerance: 1,
          missTolerance: 3,
          filterMinCF: 0.001,
          filterBeta: 1000,
        });
        mindarRef.current = mindarThree;
        setTargetFileLoaded(true);

        const { renderer, scene, camera } = mindarThree;

        // Build arrow and attach to anchor
        const arrow = createArrowGroup(headingDegrees);
        const anchor = mindarThree.addAnchor(0);
        anchor.group.add(arrow);

        anchor.onTargetFound = () => {
          if (!mounted) return;
          setTargetVisible(true);
          updateStatus("found", `Waypoint detected: ${from}`);
        };
        anchor.onTargetLost = () => {
          if (!mounted) return;
          setTargetVisible(false);
          updateStatus("lost", `Searching for ${from} poster…`);
        };

        scene.add(new THREE.AmbientLight(0xffffff, 1));
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
        dirLight.position.set(2.5, 8, 5);
        scene.add(dirLight);

        updateStatus("ready", "Point camera at the poster");
        setCameraReady(true);

        await mindarThree.start();

        renderer.setAnimationLoop(() => {
          renderer.render(scene, camera);
        });
      } catch (err) {
        console.error("MindAR init error:", err);
        if (!mounted) return;
        // MindAR sometimes rejects with undefined; detect common causes from console or context
        const rawMsg = err?.message || String(err);
        const msg = rawMsg === "undefined" ? "" : rawMsg;
        if (msg.includes("fetch") || msg.includes("404") || msg.includes("network")) {
          updateStatus("error", `Target file not loaded: ${targetFile}`);
          setTargetFileLoaded(false);
        } else if (msg.includes("Permission") || msg.includes("NotAllowed")) {
          updateStatus("error", "Camera permission denied. Please allow camera access.");
          setCameraReady(false);
        } else if (msg.includes("NotFound")) {
          updateStatus("error", "Camera not found. Ensure a camera is available.");
          setCameraReady(false);
        } else if (!navigator.mediaDevices) {
          updateStatus("error", "Camera unavailable. This page must be served over HTTPS or localhost.");
          setCameraReady(false);
        } else if (msg) {
          updateStatus("error", `AR error: ${msg}`);
        } else {
          updateStatus("error", "AR initialization failed. Check camera permissions and HTTPS.");
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
  }, [started, from, headingDegrees, targetFile, updateStatus]);

  const statusStages = [
    { key: "camera", label: "Camera ready", ready: diagDetails.cameraReady },
    { key: "target", label: "Target file loaded", ready: diagDetails.targetFileLoaded },
    { key: "waiting", label: `Waiting for ${from} target`, ready: diagStatus === "ready" || diagStatus === "lost" },
    { key: "detected", label: `${from} detected`, ready: targetVisible },
  ];

  return (
    <div className="ar-stage">
      {!started && (
        <LaunchPanel
          fromId={from}
          toId={to}
          totalMeters={totalMeters}
          targetImage={targetImage}
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
                  {diagStatus === "found" ? (
                    <span className="ar-success-pill">
                      <CheckmarkIcon size={16} />
                      Waypoint detected
                    </span>
                  ) : (
                    <>
                      <span
                        className={`status-dot ${
                          diagStatus === "found"
                            ? "ok"
                            : diagStatus === "error"
                            ? "err"
                            : "scan"
                        }`}
                      />
                      {diagStatus === "error"
                        ? "AR error"
                        : diagStatus === "loading"
                        ? "Starting AR…"
                        : diagStatus === "found"
                        ? "Marker found"
                        : "Searching for marker"}
                    </>
                  )}
                </div>
                <div className="ar-status-meta">
                  {from} → {to} · {Math.round(totalMeters)} m
                </div>
                {diagMessage && (
                  <div className="ar-status-diag">{diagMessage}</div>
                )}
                {lastEventTime && (
                  <div className="ar-status-time">Last update: {lastEventTime}</div>
                )}

                {/* Stage indicators */}
                <div className="ar-stage-list">
                  {statusStages.map((stage) => (
                    <div
                      key={stage.key}
                      className={`ar-stage-item ${stage.ready ? "ready" : ""}`}
                    >
                      <span className={`ar-stage-dot ${stage.ready ? "ready" : ""}`} />
                      {stage.label}
                    </div>
                  ))}
                </div>

                {/* Troubleshooting details */}
                <div className="ar-troubleshoot">
                  <div className="ar-trouble-row">
                    <span className="ar-trouble-label">Target file:</span>
                    <code className="ar-trouble-value">{diagDetails.targetFileUrl}</code>
                  </div>
                  <div className="ar-trouble-row">
                    <span className="ar-trouble-label">Target visible:</span>
                    <span className={`ar-trouble-value ${targetVisible ? "ok" : ""}`}>
                      {targetVisible ? "Yes" : "No"}
                    </span>
                  </div>
                  <div className="ar-trouble-row">
                    <span className="ar-trouble-label">Last event:</span>
                    <span className="ar-trouble-value">{diagDetails.lastEvent}</span>
                  </div>
                </div>

                {/* Target thumbnail toggle */}
                <button
                  className="ar-target-toggle"
                  onClick={() => setShowTargetHelp((s) => !s)}
                >
                  {showTargetHelp ? "Hide" : "Show"} target to point at
                </button>

                {showTargetHelp && (
                  <div className="ar-target-card">
                    <img src={targetImage} alt={`Target poster for ${from}`} />
                    <div className="ar-target-caption">
                      Point your camera at this exact poster. The entire image
                      (not just the QR code) is the tracking target.
                    </div>
                  </div>
                )}
              </div>

              <Link to="/" className="btn utility">
                Exit
              </Link>
            </div>

            {/* Success overlay when target found */}
            {diagStatus === "found" && (
              <div className="ar-success-overlay">
                <div className="ar-success-card">
                  <div className="ar-success-icon">
                    <CheckmarkIcon size={32} />
                  </div>
                  <div className="ar-success-title">Waypoint detected: {from}</div>
                  <div className="ar-success-route">
                    Navigating to {to}
                  </div>
                </div>
              </div>
            )}

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

function LaunchPanel({ fromId, toId, totalMeters, targetImage, onStart }) {
  const [showTarget, setShowTarget] = useState(false);

  return (
    <div className="ar-launch">
      <div className="ar-launch-card">
        <div className="ar-launch-eyebrow">AR Nav</div>
        <h1 className="ar-launch-title">Ready to navigate.</h1>
        <p className="ar-launch-body">
          Tap the button to start AR. Point your camera at the{" "}
          <strong>{fromId}</strong> poster on the wall. Aim at the full poster
          image, not just the QR code. A 3D arrow will appear pointing toward{" "}
          <strong>{toId}</strong>.
        </p>

        {/* Target preview card */}
        <div className="ar-target-preview">
          <button
            className="ar-target-preview-toggle"
            onClick={() => setShowTarget((s) => !s)}
          >
            {showTarget ? "▾ Hide" : "▸ Show"} the exact target poster
          </button>
          {showTarget && (
            <div className="ar-target-preview-content">
              <img src={targetImage} alt={`Target poster for ${fromId}`} />
              <div className="ar-target-preview-caption">
                MindAR tracks this exact image. Print and stick this poster on
                the wall, then point your camera at it.
              </div>
            </div>
          )}
        </div>

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
