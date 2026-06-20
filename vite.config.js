import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite config tuned for an AR.js app:
//  - dev server on 0.0.0.0 so a phone on the same Wi-Fi can hit it
//    (mobile browsers need an https-or-localhost origin to grant camera access;
//    `vite --host` exposes the LAN IP so the phone camera works in dev).
//  - AR.js / aframe are loaded as <script> tags from a CDN in index.html
//    rather than bundled. They expose window.AFRAME and a global `<a-scene>`
//    custom element which only works when injected as a real script.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: "0.0.0.0",
    port: 9876,
    allowedHosts: ["navigation.ffly.site", "homelab.local", "localhost", "127.0.0.1"],
  },
});
