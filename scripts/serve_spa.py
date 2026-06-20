#!/usr/bin/env python3
"""
SPA-aware static server: serves files from a directory, but falls back to
index.html for any path that doesn't match a real file. This is what
React Router / Vue Router / SvelteKit need in production — without it,
every deep route (like /ar or /posters) returns 404.

Usage:
  python3 serve_spa.py <root> <port>

Run in the background, e.g.:
  python3 serve_spa.py /root/tmp/ar-nav/dist 9876
"""
import sys, os
from http.server import HTTPServer, SimpleHTTPRequestHandler


class SPARequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, directory=None, **kwargs):
        super().__init__(*args, directory=directory, **kwargs)

    def send_head(self):
        # First try the literal path the client asked for.
        path = self.translate_path(self.path)
        if os.path.isfile(path) and not os.path.isdir(path):
            return super().send_head()
        # For directory paths (no trailing slash), let the default handler
        # try its usual directory index logic — that already returns 200
        # for "/" and 404 for unknown dirs.
        if self.path.endswith("/") or self.path == "/":
            return super().send_head()
        # Anything else (e.g. /ar, /posters, /ar/anything) — fall back to
        # index.html so the client-side router can take over.
        self.path = "/index.html"
        return super().send_head()

    # Quieter logs: drop the per-request timestamp prefix
    def log_message(self, format, *args):
        sys.stderr.write(
            "[%s] %s - %s\n" % (self.address_string(), format % args, self.headers.get("User-Agent", ""))
        )


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: serve_spa.py <root_dir> <port>", file=sys.stderr)
        sys.exit(1)
    root, port = sys.argv[1], int(sys.argv[2])
    os.chdir(root)
    print(f"Serving SPA {root} on http://0.0.0.0:{port}/  (index.html fallback enabled)", flush=True)
    HTTPServer(("0.0.0.0", port), lambda *a, **kw: SPARequestHandler(*a, directory=root, **kw)).serve_forever()
