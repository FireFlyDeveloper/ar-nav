import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ARNav from "./pages/ARNav.jsx";
import QRPoster from "./pages/QRPoster.jsx";
import Home from "./pages/Home.jsx";
import "./styles.css";

// StrictMode is OFF on purpose: A-Frame + AR.js call getUserMedia at scene
// init. React 18 StrictMode double-mounts components in development, which
// causes the AR scene to initialize, tear down, and re-initialize — racing
// with the camera permission and leaving the device in a broken "stuck on
// scanning / black screen" state. See AR.js issue tracker for the long
// thread. Production never StrictMode-double-mounts, so this only matters
// for dev UX, but the cost of a confusing local repro outweighs the dev
// benefit.
ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Home />} />
      {/* Production URL shape a QR sticker encodes:
            https://<host>/ar?from=QR_A1&to=room-301
          The QR is the "you are here" pin. The to= is the destination. */}
      <Route path="/ar" element={<ARNav />} />
      <Route path="/posters" element={<QRPoster />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);
