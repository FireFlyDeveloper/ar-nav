# 📍 AR Nav — No-GPS Indoor Wayfinding

A React + Vite + AR.js application that turns printed QR stickers into an
indoor AR navigation system. **No app install, no GPS, no backend.**

## How it works

```
User scans QR sticker with phone camera
            │
            ▼  (native camera app decodes the URL)
Phone prompts "Open in browser?"  →  https://<host>/ar?from=QR_A1&to=room-301
            │
            ▼
React app loads, requests camera permission
            │
            ▼
AR.js finds the QR sticker in the camera view
            │
            ▼
A 3D arrow anchored to the sticker points toward the destination
based on a hand-authored indoor graph (no GPS, no Wi-Fi triangulation)
```

The QR sticker does **two** jobs:

1. It carries the URL (where to open, with the destination pre-filled).
2. It is also an **AR.js barcode marker** the camera can track. The
   matrix pattern inside every QR is exactly the kind of feature AR.js
   uses to fix the camera's pose in space. We exploit that to anchor the
   arrow in 3D.

## Project structure

```
src/
  main.jsx           React Router: /, /ar, /posters
  indoorGraph.js     Nodes, edges, Dijkstra, yaw computation
  pages/
    Home.jsx         Landing page with sample link + map
    ARNav.jsx        The A-Frame + AR.js camera scene
    QRPoster.jsx     Print-friendly QR generator
  styles.css
public/              static assets
index.html           Loads A-Frame + AR.js from CDN as <script> tags
```

## Quickstart

```bash
npm install
npm run dev
# → open http://localhost:5173 on a phone (same Wi-Fi)
```

Vite is configured to bind on `0.0.0.0` so the dev server is reachable
on the LAN — the phone browser needs an https-or-localhost origin to
grant camera permission, and the LAN IP works because browsers treat it
as a secure context for `getUserMedia`.

## How to print and install

1. Run `npm run dev` and open `/posters` on your laptop.
2. Click **Print these** to print the auto-generated QR stickers.
3. Stick them at corridor intersections. Each sticker encodes
   `/ar?from=QR_<id>&to=room-301`. The `from=` part is unique per sticker
   (it's the "you are here" pin), the `to=` part is the default
   destination for that sticker.
4. From your phone, open the regular camera app and point at a sticker.
5. Tap the "Open" prompt. The AR view appears. Point the camera at the
   sticker and the red arrow appears, pointing toward room-301.

To customize destinations per sticker, edit
`DEFAULT_DEST` in `src/pages/QRPoster.jsx` or extend the page to pick
the destination per waypoint.

## How to add a new building

Edit `src/indoorGraph.js`:

```js
export const NODES = {
  "QR_A1": { name: "Lobby", x: 0, z: 0, floor: 1 },
  "room-101": { name: "Room 101", x: 2, z: -4, floor: 1 },
  // ...more waypoints and destinations
};

export const EDGES = [
  ["QR_A1", "QR_A2", 5],   // distance in meters
  // ...more edges
];
```

Then refresh `/posters` and re-print.

## Production build & deploy

```bash
npm run build
npm run preview
```

The `dist/` folder is a static SPA. Deploy it to any static host
(Vercel, Netlify, GitHub Pages, Cloudflare Pages, S3). **Camera
access requires HTTPS** in production — all the hosts above provide it
automatically.

## Browser support

| Browser | Camera AR | Notes |
|---|---|---|
| iOS Safari 15+ | ✅ | Best experience; AR.js works via WebGL composite |
| Android Chrome | ✅ | Same code path |
| Desktop Chrome/Edge | ✅ | For testing; webcam works the same way |
| Firefox | ⚠️ | May need `media.navigator.permission.disabled` flipped in `about:config` |

## Limitations and honest notes

- **No GPS indoors.** Positioning is anchored to the printed marker the
  user is looking at. The system knows "user is at QR_A1" the moment
  AR.js locks onto the sticker, nothing more. This is by design — it
  works fully offline and the user always knows when the system has
  fixed on their location.
- **Waypoint coverage.** You need a printed QR at every decision point
  (intersection, doorway, floor change). One QR per ~5 m of corridor is
  a reasonable starting density.
- **No SLAM.** Unlike ARKit/ARCore apps, we don't do environment
  tracking between markers. The arrow is anchored to the marker, not to
  the world. This is fine for "follow the arrow 5 m to the next QR
  sticker, scan it, repeat" workflows.
- **iOS Safari QR detection.** iOS only started exposing the Barcode
  Detection API in Safari 17; older versions rely on the camera app
  itself to do QR decoding (which is what we want for the "scan with
  regular camera app" flow anyway).

## License

MIT
