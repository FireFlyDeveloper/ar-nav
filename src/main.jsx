import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate as RouterNavigate } from "react-router-dom";
import ARNav from "./pages/ARNav.jsx";
import QRPoster from "./pages/QRPoster.jsx";
import Home from "./pages/Home.jsx";
import Mapper from "./pages/Mapper.jsx";
import Navigate from "./pages/Navigate.jsx";
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
      {/* QR scan opens the 2D map navigator — no camera required. */}
      <Route path="/navigate" element={<Navigate />} />
      {/* Optional AR guidance (camera + marker detection). */}
      <Route path="/ar" element={<ARNav />} />
      <Route path="/mapper" element={<Mapper />} />
      <Route path="/posters" element={<QRPoster />} />
      <Route path="*" element={<RouterNavigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);
