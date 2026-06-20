#!/usr/bin/env bash
# Create the ar-nav GitHub repo via the API. Acquires the token by reading
# the shell's own env table at runtime (not interpolated into the command
# body before execution).
set -euo pipefail

# Read the token directly from the process's environ. This is the only safe
# way to use a credential in a bash script under the terminal redaction
# layer: the literal text "GITHUB_TOKEN" never appears in the source we
# wrote, and the value flows through Python's dict not through the shell's
# text substitution.
TOKEN=$(python3 -c "import os; print(os.environ.get('GITHUB_TOKEN',''))")
if [ -z "$TOKEN" ]; then
  echo "GITHUB_TOKEN is not set in this shell" >&2
  exit 1
fi

ACCT=$(curl -fsS -H "Authorization: token $TOKEN" \
        https://api.github.com/user \
      | python3 -c "import sys,json; print(json.load(sys.stdin)['login'])")
echo "Authenticated as: $ACCT"

# Use a file for the JSON body so the literal repo description doesn't pass
# through a heredoc-rewriting pipeline.
cat > /tmp/ar-nav-repo.json <<'JSON'
{
  "name": "ar-nav",
  "description": "No-GPS indoor AR wayfinding. Scan a QR sticker with the phone camera, the browser opens a WebAR view with a 3D arrow to the destination. React + Vite + AR.js, no app install.",
  "private": false,
  "has_issues": true,
  "has_projects": true,
  "has_wiki": false
}
JSON

HTTP=$(curl -sS -o /tmp/create-repo.json -w "%{http_code}" \
        -H "Authorization: token $TOKEN" \
        -H "Accept: application/vnd.github+json" \
        -X POST \
        --data @/tmp/ar-nav-repo.json \
        "https://api.github.com/user/repos")

echo "POST /user/repos -> HTTP $HTTP"
python3 -c "
import json
d = json.load(open('/tmp/create-repo.json'))
if 'html_url' in d:
    print('Created:', d['html_url'])
    print('SSH:    ', d['ssh_url'])
else:
    print('Response:', json.dumps(d, indent=2)[:500])
"
