# MindAR Image Tracking Targets

This folder should contain `.mind` target files for each waypoint poster.

## How to generate a target file

1. Design a high-contrast poster for each waypoint (e.g. `QR_A1.png`).
   The poster must have plenty of visual features — gradients, text, logos —
   so MindAR's image tracker can lock onto it reliably.

2. Compile the image into a `.mind` target using the MindAR target compiler:
   - Online compiler: https://hiukim.github.io/mind-ar-js-doc/tools/compile/
   - CLI: `npx mind-ar@latest target-compile ./QR_A1.png ./QR_A1.mind`

3. Place the generated `.mind` file here, named exactly after the waypoint ID:

   ```
   public/targets/QR_A1.mind
   public/targets/QR_A2.mind
   public/targets/QR_A3.mind
   ...
   ```

4. Rebuild the app (`npm run build`) so the files are copied into `dist/targets/`.

## Current status

No `.mind` files are checked in yet. The AR page will show a diagnostic message
("Target file not loaded") until a valid target file is provided and the poster is in view.

## Demo route

The default demo route expects:
- `public/targets/QR_A1.mind` for the starting waypoint
- URL: `/ar?from=QR_A1&to=room-301`
