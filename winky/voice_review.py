"""Local, hash-bound defect reports. Originals are never rewritten."""
from __future__ import annotations

import hashlib
import json
import math
import threading
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class VoiceReview:
    def __init__(self, path=None):
        self.path = path or ROOT / 'voice_cache/speech-review/defects.json'
        self.lock = threading.RLock()

    def reports(self):
        try:
            return json.loads(self.path.read_text())
        except (OSError, ValueError):
            return []

    def blocked(self, row, path):
        reports = [r for r in self.reports() if r.get('status') == 'excluded'
                   and (r.get('id') == row['id'] or r.get('path') == str(path))]
        if not reports:
            return False
        sha = hashlib.sha256(path.read_bytes()).hexdigest()
        return any(r['sha256'] == sha for r in reports)

    def report(self, row, issue='хрип', offset_sec=None):
        with self.lock:
            path = Path(row['path']).resolve()
            if not path.is_relative_to(ROOT.resolve()) or not path.is_file():
                raise ValueError('Audio is unavailable')
            offset = None if offset_sec in (None, '') else float(offset_sec)
            if offset is not None and (not math.isfinite(offset) or offset < 0):
                raise ValueError('Invalid audio position')
            record = dict(id=row['id'], path=str(path), text=row['text'],
                          lang=row.get('lang', 'ru'), sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                          issue=str(issue or 'хрип')[:300], offset_sec=offset,
                          reported_at=time.time(), status='excluded', auditory_verified=False)
            reports = self.reports()
            reports.append(record)
            self.path.parent.mkdir(parents=True, exist_ok=True)
            tmp = self.path.with_suffix('.tmp')
            tmp.write_text(json.dumps(reports, ensure_ascii=False, indent=2))
            tmp.replace(self.path)
            return record
