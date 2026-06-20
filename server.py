import http.server
import socketserver
import os

PORT = 7777
DIRECTORY = "/root/tmp/ar-nav/.worktrees/t_fb3f695d/dist"

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        path = self.path.split('?')[0]
        file_path = os.path.join(DIRECTORY, path.lstrip('/'))
        if path != '/' and not os.path.exists(file_path):
            self.path = '/'
        return super().do_GET()

with socketserver.TCPServer(("0.0.0.0", PORT), Handler) as httpd:
    print(f"Serving at http://localhost:{PORT}", flush=True)
    httpd.serve_forever()
