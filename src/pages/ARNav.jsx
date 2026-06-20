import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { findPath, directionYaw, pathLength, NODES } from "../indoorGraph.js";

/**
 * The AR view.
 *
 *  - Reads `?from=` (the QR the user just scanned = "you are here")
 *    and `?to=` (their destination) from the URL.
 *  - Shows a launch panel; the user must click "Start camera" to grant
 *    the getUserMedia permission. The browser's auto-play policy treats
 *    the camera as media and refuses to start it outside a user gesture.
 *  - On click, we getUserMedia ourselves, attach the stream to a
 *    <video> we create and append to the DOM, then mount the A-Frame
 *    scene with `arjs-video-selector` pointing at our video. AR.js
 *    picks it up via the WebcamTexture path.
 *
 *  This avoids the AR.js issue where its internal getUserMedia races
 *  with the user gesture and the <video> element ends up orphaned in
 *  memory (causing the "black canvas" symptom even though the camera
 *  indicator is on).
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
 * ARScene
 *
 *  1. On mount, create a <video id="arjs-video"> and append it to
 *     document.body.
 *  2. Request the camera ourselves (inside the user-gesture context
 *     that set started=true).
 *  3. Attach the stream to the video and play it.
 *  4. Mount the A-Frame scene with arjs configured to use the existing
 *     video element via the webcam-texture path. AR.js will pick it up
 *     and pipe it into the WebGL canvas as a VideoTexture.
 */
function ARScene({
  yaw,
  fromId,
  onCameraState,
  onCameraError,
  onScanned,
  onConfirmFrom,
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // ─── Step 1: Prime the camera permission ────────────────────────
    // The browser's getUserMedia must be invoked inside a user-gesture
    // context. We arrived here from setStarted(true) → onClick, but
    // that single chain is sometimes considered "expired" by the
    // time AR.js's nested init runs. We solve this by requesting
    // getUserMedia ourselves FIRST, in the same call stack as the
    // click. The <video> we create here is given the same id
    // (#arjs-video) AR.js looks for, so it adopts it as the source
    // and the marker detection pipeline runs against our stream.
    //
    // This works around the AR.js issue where the <video> is
    // orphaned in memory when getUserMedia fails silently inside
    // AR.js's own init.
    const video = document.createElement("video");
    video.id = "arjs-video";
    video.setAttribute("autoplay", "");
    video.setAttribute("playsinline", "");
    video.muted = true;
    // AR.js positions the <video> at z-index:-2 by default (so the
    // WebGL canvas overlays it). We flip that with CSS below to
    // make the live feed actually visible.
    video.style.cssText =
      "position:fixed;top:0;left:0;width:100vw;height:100vh;object-fit:cover;z-index:1;display:block;";
    document.body.appendChild(video);
    videoRef.current = video;

    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        video.srcObject = stream;
        await video.play();
        onCameraState("live");
      } catch (err) {
        if (cancelled) return;
        onCameraError(`${err.name}: ${err.message}`);
        onCameraState("error");
      }
    })();

    // ─── Step 3: Build the A-Frame scene ────────────────────────────
    // IMPORTANT: do NOT use videoTexture:true — that swaps to the
    // "WebcamTexture" branch which renders the camera as a fullscreen
    // plane and has NO marker detection. We need the default artoolkit
    // pipeline (artoolkit's ArController + ArMarkerControls) so that
    // <a-marker> can fire markerFound. AR.js will create its own
    // <video id="arjs-video"> and append it to body inside the
    // getUserMedia success callback — which fires only because we got
    // here from a user-gesture click.
    const sceneEl = document.createElement("a-scene");
    sceneEl.setAttribute("embedded", "");
    sceneEl.setAttribute("vr-mode-ui", "enabled: false");
    sceneEl.setAttribute("renderer", "logarithmicDepthBuffer: true; alpha: true;");
    sceneEl.setAttribute(
      "arjs",
      "sourceType: webcam; detectionMode: mono_and_matrix; matrixCodeType: 3x3; debugUIEnabled: false; trackingBackend: artoolkit;"
    );
    sceneEl.style.cssText =
      "position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:0;";
    sceneRef.current = sceneEl;

    // Camera entity (required for AR.js)
    const cam = document.createElement("a-entity");
    cam.setAttribute("camera", "");
    sceneEl.appendChild(cam);

    // One <a-marker> per QR waypoint
    const waypointIds = Object.keys(NODES).filter((id) => id.startsWith("QR_"));
    waypointIds.forEach((id, idx) => {
      const marker = document.createElement("a-marker");
      marker.setAttribute("type", "barcode");
      marker.setAttribute("value", String(idx));
      marker.setAttribute("smooth", "true");
      marker.setAttribute("smoothCount", "5");
      marker.setAttribute("smoothTolerance", "0.01");
      marker.setAttribute("smoothThreshold", "2");

      // Cone arrow pointing along the path
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
      arrow.setAttribute("rotation", `-90 ${(yaw * 180) / Math.PI} 0`);
      arrow.setAttribute(
        "animation",
        "property: position; to: 0 0.6 0; dir: alternate; dur: 800; loop: true"
      );
      marker.appendChild(arrow);

      // Waypoint label
      const label = document.createElement("a-text");
      label.setAttribute("value", `→ ${id}`);
      label.setAttribute("color", "#ffffff");
      label.setAttribute("align", "center");
      label.setAttribute("position", "0 0.8 0");
      marker.appendChild(label);

      sceneEl.appendChild(marker);
    });

    // Wire marker events after the scene loads
    sceneEl.addEventListener("loaded", () => {
      const markers = sceneEl.querySelectorAll("a-marker");
      markers.forEach((marker, idx) => {
        marker.addEventListener("markerFound", () => {
          onScanned(true);
          onConfirmFrom(waypointIds[idx]);
        });
        marker.addEventListener("markerLost", () => onScanned(false));
      });
    });

    // ─── Step 4: Mount the scene ────────────────────────────────────
    mountRef.current.appendChild(sceneEl);

    return () => {
      cancelled = true;
      // Stop the camera stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((tr) => tr.stop());
        streamRef.current = null;
      }
      // Remove the video
      if (video.parentNode) video.parentNode.removeChild(video);
      // Remove the scene
      if (sceneEl.parentNode) sceneEl.parentNode.removeChild(sceneEl);
    };
  }, [yaw, onCameraState, onCameraError, onScanned, onConfirmFrom]);

  return <div ref={mountRef} className="ar-scene-mount" />;
}
