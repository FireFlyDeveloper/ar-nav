# Zappar Image Tracking Targets

This folder should contain `.zpt` target files for each waypoint poster.

## How to generate a target file

1. Design a high-contrast poster for each waypoint (e.g. `QR_A1.png`).
   The poster must have plenty of visual features — gradients, text, logos —
   so Zappar's image tracker can lock onto it reliably.

2. Upload the image to the Zappar Universal AR Target Trainer:
   https://docs.zap.works/universal-ar/zapworks-cli/
   Or use the ZapWorks Designer web interface.

3. Download the generated `.zpt` file and place it here, named exactly
   after the waypoint ID:

   ```
   public/targets/QR_A1.zpt
   public/targets/QR_A2.zpt
   public/targets/QR_A3.zpt
   ...
   ```

4. Rebuild the app (`npm run build`) so the files are copied into `dist/targets/`.

## Current status

No `.zpt` files are checked in yet. The AR page will show "Searching for marker"
until a valid target file is provided and the poster is in view.

## Demo route

The default demo route expects:
- `public/targets/QR_A1.zpt` for the starting waypoint
- URL: `/ar?from=QR_A1&to=room-301`
