import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite config tuned for a Zappar Universal AR app:
//  - dev server on 0.0.0.0 so a phone on the same Wi-Fi can hit it
//    (mobile browsers need an https-or-localhost origin to grant camera access;
//    `vite --host` exposes the LAN IP so the phone camera works in dev).
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
});
