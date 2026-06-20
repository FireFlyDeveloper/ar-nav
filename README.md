# 📍 AR Nav — No-GPS Indoor Wayfinding

A React + Vite + **Zappar Universal AR** application that turns printed
QR stickers into an indoor AR navigation system. **No app install, no
GPS, no backend.**

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
Zappar image tracker locks onto the printed sticker
            │
            ▼
A 3D arrow anchored to the sticker points toward the destination
based on a hand-authored indoor graph (no GPS, no Wi-Fi triangulation)
```

The sticker is a normal QR code (so the phone's camera app can decode
the URL), and the same printed area is also the image target Zappar
locks onto. The matrix inside the QR plus the surrounding art give the
tracker enough texture to fix the camera's pose in 3D space.

## Project structure

```
src/
  main.jsx           React Router: /, /ar, /posters
  indoorGraph.js     Nodes, edges, Dijkstra, yaw computation
  pages/
    Home.jsx         Landing page with sample link + map
    ARNav.jsx        The Zappar canvas + image tracker + 3D arrow
    QRPoster.jsx     Print-friendly QR generator
  styles.css
index.html           Plain shell; React mounts the canvas
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
| iOS Safari 15+ | ✅ | Best experience; Zappar uses WebGL composite |
| Android Chrome | ✅ | Same code path |
| Desktop Chrome/Edge | ✅ | For testing; webcam works the same way |
| Firefox | ⚠️ | May need `media.navigator.permission.disabled` flipped in `about:config` |

## Hosting on a custom domain?

Zappar's image-tracker license check is hard-coded to the host the app
is loaded from. The Zappar WASM module whitelists these host patterns
and treats everything else as a custom domain that must be registered
with Zappar:

* `*.zappar.io`, `*.webar.run`, `*.arweb.app`
* `*.ngrok.io`, `*.ngrok-free.app`
* Local testing: `0.0.0.0`, `127.*`, `192.168.*`, `10.*`

If you open the app on a custom domain (e.g. `navigation.ffly.site`),
Zappar will display a black banner that says "Visit our licensing page
to find out about hosting on your own domain." and the AR camera will
not start until that domain is registered for an active Zappar /
ZapWorks subscription.

**To test without paying for a license:**

* `npm run dev` and open it on your phone over the local Wi-Fi — the
  LAN IP gets the `192.168.*` exemption.
* For sharing with a phone on a different network, expose the preview
  port with ngrok: `ngrok http 4173` — the `*.ngrok.io` /
  `*.ngrok-free.app` URL is also exempt. (Free anonymous ngrok tunnels
  were retired in 2023; you need a verified account and `authtoken`.)

**For production on a custom domain:** contact
[support@zappar.com](mailto:support@zappar.com) (or your ZapWorks
account manager) to register the domain for the Enterprise /
Distribution self-hosting license. See
[docs.zap.works/universal-ar/licensing](https://docs.zap.works/universal-ar/licensing/).

## Limitations and honest notes

- **No GPS indoors.** Positioning is anchored to the printed marker the
  user is looking at. The system knows "user is at QR_A1" the moment
  Zappar locks onto the sticker, nothing more. This is by design — it
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
