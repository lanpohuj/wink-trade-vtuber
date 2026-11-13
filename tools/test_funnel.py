#!/usr/bin/env python3
"""Run funnel suites with disposable SQLite and dummy credentials, never .env/production."""
from pathlib import Path
import os
import subprocess
import sys
import tempfile

root = Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix="wink-funnel-tests-") as temp:
    for pattern in ["test_security_audit.py", "test_funnel_regressions.py"]:
        env = dict(os.environ, BOT_TOKEN="123456789:TEST_ONLY", POSTBACK_SECRET="test-only",
                   INTERNAL_API_TOKEN="publisher-test-only", ADMIN_TG_IDS="900000001",
                   DATABASE_URL=f"sqlite+aiosqlite:///{temp}/{pattern}.db", LUMEAN_API_KEY="",
                   FISHAUDIO_API_KEY="", DEEPSEEK_API_KEY="", DATABASE_ECHO="false")
        result = subprocess.run([sys.executable, "-m", "unittest", "discover", "-s", "tests", "-p", pattern, "-v"], cwd=root, env=env)
        if result.returncode:
            raise SystemExit(result.returncode)
