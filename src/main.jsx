import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ARNav from "./pages/ARNav.jsx";
import QRPoster from "./pages/QRPoster.jsx";
import Home from "./pages/Home.jsx";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/ar" element={<ARNav />} />
      <Route path="/posters" element={<QRPoster />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);
