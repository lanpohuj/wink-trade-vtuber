#!/bin/bash
set -e
WINKY_LAB_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$WINKY_LAB_ROOT"
exec "$WINKY_LAB_ROOT/.venv/bin/python" experiments/winky_avatar/serve.py --open
