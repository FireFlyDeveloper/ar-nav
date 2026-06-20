import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { findPath, directionYaw, pathLength, NODES } from "../indoorGraph.js";

/**
 * The AR view.
 *
 *  - Reads `?from=` (the QR the user just scanned = "you are here")
 *    and `?to=` (their destination) from the URL.
 *  - Shows a launch panel; the user must click "Start camera" so the
 *    entire A-Frame + AR.js init chain (which includes getUserMedia)
 *    runs inside a real user-gesture call stack. The browser's
 *    auto-play policy silently denies camera permission when the
 *    getUserMedia happens outside a gesture — that's the historical
 *    "stuck on scanning / black screen" bug.
 *  - On click, we mount the <a-scene>. AR.js creates its own
 *    <video id="arjs-video">, calls getUserMedia, wires the marker
 *    detection pipeline, and renders the WebGL canvas. We do NOT
 *    pre-create the <video> or call getUserMedia ourselves — that
 *    used to cause two competing video elements to coexist in the
 *    DOM, with the one we made having no srcObject, which froze
 *    marker detection on a blank first frame.
 *  - On unmount we stop every camera track and remove the scene, so
 *    the next mount starts clean (no "stuck camera" bug).
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

  const [started, setStarted] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [confirmedFrom, setConfirmedFrom] = useState(from);
  const [cameraState, setCameraState] = useState("idle"); // idle | live | error
  const [cameraError, setCameraError] = useState(null);

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
        <p>No path from <code>{from}</code> to <code>{to}</code>.</p>
        <Link to="/" className="btn primary">Back home</Link>
      </div>
    );
  }

  return (
    <div className="ar-stage" data-status={cameraState}>
      {!started && (
        <LaunchPanel
          fromId={from}
          toId={to}
          nextStep={nextStep}
          onStart={() => setStarted(true)}
        />
      )}

      {started && (
        <ARScene
          path={path}
          toId={to}
          yaw={yaw}
          fromId={from}
          onCameraState={setCameraState}
          onCameraError={setCameraError}
          onScanned={setScanned}
          onConfirmFrom={setConfirmedFrom}
        />
      )}

      <div className="ar-overlay">
        <div className="row">
          <div className="who">
            {cameraState === "error"
              ? "Camera blocked"
              : scanned
              ? `On ${confirmedFrom}`
              : cameraState === "live"
              ? nextStep ? `Next: ${nextStep}` : "Arrived"
              : "Scan a sticker"}
          </div>
          <div className="meta">
            {cameraState === "error"
              ? cameraError || "Check browser permission"
              : `from ${from} → ${to}`}
          </div>
        </div>
        <div className="row">
          <Link to="/" className="btn btn-pill btn-secondary">Exit</Link>
        </div>
      </div>

      {cameraState === "live" && !scanned && nextStep && (
        <div className="ar-floating-bar">
          <span className="ar-floating-bar-text">Point camera at a waypoint QR</span>
          <span className="ar-floating-bar-meta">{Math.round(totalMeters)} m route</span>
        </div>
      )}
    </div>
  );
}

function LaunchPanel({ fromId, toId, nextStep, onStart }) {
  return (
    <div className="ar-launch">
      <div className="ar-launch-card">
        <div className="ar-launch-eyebrow">AR Nav</div>
        <h1 className="ar-launch-title">Ready to navigate.</h1>
        <p className="ar-launch-body">
          Tap the button to start the camera. Point it at the{" "}
          <strong>{fromId}</strong> sticker on the wall. We'll show a 3D
          arrow pointing toward <strong>{toId}</strong>.
        </p>
        <div className="ar-launch-cta">
          <button
            type="button"
            className="btn btn-pill btn-primary"
            onClick={onStart}
          >
            Start camera
          </button>
        </div>
        <div className="ar-launch-fine">
          Camera feed stays on this device. No video is uploaded.
        </div>
      </div>
    </div>
  );
}

/**
 * Build the A-Frame scene and let AR.js own the entire lifecycle.
 *
 * The scene is mounted as JSX <a-scene> on the React tree — React handles
 * custom elements fine. The scene element attaches to the DOM, AR.js's
 * component init runs (it sees the `arjs` attribute), requests the camera
 * via getUserMedia (still inside the user-gesture call stack because the
 * mount happened during the onClick handler), creates <video id="arjs-video">,
 * wires the ArController + ArMarkerControls, and starts the render loop.
 *
 * Path geometry: each QR waypoint gets a <a-marker type="barcode" value="N">.
 * For marker N (corresponding to waypointId in our sorted waypoint list), the
 * arrow inside it points toward the *next* node on the path from that
 * waypoint toward the destination. If a waypoint isn't on the user's route,
 * we just don't show a direction (arrow faces east / yaw=0, label still shows).
 */
function ARScene({
  path,
  toId,
  yaw,
  fromId,
  onCameraState,
  onCameraError,
  onScanned,
  onConfirmFrom,
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);

  // Stable list of QR waypoint ids in a deterministic order — must match
  // the <a-marker value="N"> we render, so the index N inside markerFound
  // maps back to the same waypointId.
  const waypointIds = useMemo(
    () => Object.keys(NODES).filter((id) => id.startsWith("QR_")),
    []
  );

  // For each waypoint, compute the "next hop on the path toward `to`".
  // If the waypoint is on the path at index i, nextHop = path[i+1] (else null).
  const nextHopByWaypoint = useMemo(() => {
    const map = {};
    for (const id of waypointIds) {
      const idx = path.indexOf(id);
      map[id] = idx >= 0 && idx < path.length - 1 ? path[idx + 1] : null;
    }
    return map;
  }, [path, waypointIds]);

  useEffect(() => {
    if (!mountRef.current) return;
    const mount = mountRef.current;

    // Build the A-Frame scene. We use JSX but mount imperatively by
    // creating the element directly so the React tree doesn't re-render
    // A-Frame's DOM (which would race with AR.js's own mutations).
    const sceneEl = document.createElement("a-scene");
    sceneEl.setAttribute("embedded", "");
    sceneEl.setAttribute("vr-mode-ui", "enabled: false");
    sceneEl.setAttribute("renderer", "logarithmicDepthBuffer: true; alpha: true;");
    sceneEl.setAttribute("background", "transparent");
    sceneEl.setAttribute(
      "arjs",
      "sourceType: webcam; detectionMode: mono_and_matrix; matrixCodeType: 3x3; debugUIEnabled: false; trackingBackend: artoolkit;"
    );
    // Fill the viewport; AR.js's own CSS handles the <video> and canvas
    // positions (z-index 1 video, z-index 2 canvas, see styles.css).
    sceneEl.style.cssText =
      "position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:2;";
    sceneRef.current = sceneEl;

    // Camera entity — required for AR.js so the user has a viewpoint.
    const cam = document.createElement("a-entity");
    cam.setAttribute("camera", "");
    sceneEl.appendChild(cam);

    // One <a-marker> per QR waypoint.
    waypointIds.forEach((id, idx) => {
      const marker = document.createElement("a-marker");
      marker.setAttribute("type", "barcode");
      marker.setAttribute("value", String(idx));
      marker.setAttribute("smooth", "true");
      marker.setAttribute("smoothCount", "5");
      marker.setAttribute("smoothTolerance", "0.01");
      marker.setAttribute("smoothThreshold", "2");

      // The arrow's rotation depends on this waypoint's "next hop". If
      // the waypoint is on the path, point at the next node; otherwise
      // point at the default `yaw` prop (current AR view's heading).
      const nextHop = nextHopByWaypoint[id];
      const arrowYaw =
        nextHop != null ? directionYaw(id, nextHop) : yaw;
      const yawDeg = (arrowYaw * 180) / Math.PI;

      // Blue cone arrow — Apple #0066cc, animated up/down to feel alive.
      const arrow = document.createElement("a-entity");
      arrow.setAttribute(
        "geometry",
        "primitive: cone; radiusBottom: 0.06; radiusTop: 0; height: 0.5; openEnded: true"
      );
      arrow.setAttribute(
        "material",
        "color: #0066cc; emissive: #0066cc; emissiveIntensity: 0.4; opacity: 0.95;"
      );
      arrow.setAttribute("position", "0 0.4 0");
      arrow.setAttribute("rotation", `-90 ${yawDeg} 0`);
      arrow.setAttribute(
        "animation",
        "property: position; to: 0 0.6 0; dir: alternate; dur: 800; loop: true"
      );
      marker.appendChild(arrow);

      // Waypoint id label, sitting just above the arrow.
      const label = document.createElement("a-text");
      label.setAttribute("value", `→ ${id}`);
      label.setAttribute("color", "#ffffff");
      label.setAttribute("align", "center");
      label.setAttribute("position", "0 0.8 0");
      label.setAttribute("scale", "0.5 0.5 0.5");
      marker.appendChild(label);

      sceneEl.appendChild(marker);
    });

    // Wire marker events after AR.js has fully initialized the scene
    // and its ArController is running.
    const onLoaded = () => {
      const markers = sceneEl.querySelectorAll("a-marker");
      markers.forEach((marker, idx) => {
        const waypointId = waypointIds[idx];
        marker.addEventListener("markerFound", () => {
          onScanned(true);
          onConfirmFrom(waypointId);
        });
        marker.addEventListener("markerLost", () => onScanned(false));
      });

      // Watch the <video id="arjs-video"> AR.js creates. When its
      // srcObject is set and readyState >= 2, the camera is live.
      // This is our "live" signal for the overlay.
      const arjsVideo = document.getElementById("arjs-video");
      if (arjsVideo) {
        const onPlaying = () => {
          onCameraState("live");
          onCameraError(null);
        };
        const onError = () => {
          onCameraError("Video element error");
          onCameraState("error");
        };
        arjsVideo.addEventListener("playing", onPlaying, { once: true });
        arjsVideo.addEventListener("error", onError, { once: true });
        // If it was already playing by the time we hooked up, fire live now.
        if (arjsVideo.readyState >= 2 && !arjsVideo.paused) {
          onCameraState("live");
        }
      } else {
        // AR.js hasn't created the <video> yet — listen for it on body.
        const observer = new MutationObserver(() => {
          const v = document.getElementById("arjs-video");
          if (v) {
            observer.disconnect();
            v.addEventListener(
              "playing",
              () => {
                onCameraState("live");
                onCameraError(null);
              },
              { once: true }
            );
            if (v.readyState >= 2 && !v.paused) onCameraState("live");
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        // Stop observing after 10 s — if AR.js hasn't created the video
        // by then, something is very wrong and we should surface it.
        setTimeout(() => observer.disconnect(), 10000);
      }
    };
    sceneEl.addEventListener("loaded", onLoaded);

    // AR.js also surfaces the camera state via its own arError / arReady
    // events on the <a-scene>. We hook those as a safety net.
    sceneEl.addEventListener("arError", (e) => {
      const msg =
        (e && e.detail && e.detail.message) ||
        (e && e.detail && e.detail.err && e.detail.err.message) ||
        "Camera permission denied";
      onCameraError(msg);
      onCameraState("error");
    });
    sceneEl.addEventListener("arReady", () => {
      // arReady means AR.js's WebGL/ArController is up; the video will
      // be live momentarily. We let the playing/observer path set the
      // canonical "live" state.
    });

    // Mount the scene. This triggers AR.js's component init, which
    // requests the camera. Because we're inside the onClick handler's
    // synchronous chain, the user-gesture token is still valid.
    mount.appendChild(sceneEl);

    return () => {
      // Tear everything down: stop the camera, remove the scene,
      // and remove the <video> AR.js created. This prevents the
      // "stuck camera on next mount" bug.
      try {
        const arjsVideo = document.getElementById("arjs-video");
        if (arjsVideo && arjsVideo.srcObject) {
          arjsVideo.srcObject.getTracks().forEach((tr) => tr.stop());
          arjsVideo.srcObject = null;
        }
        if (arjsVideo && arjsVideo.parentNode) {
          arjsVideo.parentNode.removeChild(arjsVideo);
        }
      } catch (_) {
        /* ignore */
      }
      if (sceneEl.parentNode) sceneEl.parentNode.removeChild(sceneEl);
      sceneRef.current = null;
    };
  }, [
    path,
    toId,
    yaw,
    fromId,
    waypointIds,
    nextHopByWaypoint,
    onCameraState,
    onCameraError,
    onScanned,
    onConfirmFrom,
  ]);

  return <div ref={mountRef} className="ar-scene-mount" />;
}
