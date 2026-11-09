"""Decode, measure and transcribe every staged recording; never asserts hearing."""

import json, subprocess, time, re, difflib, html
from pathlib import Path
import numpy as np
from faster_whisper import WhisperModel
from tools.audit_voice_bank import measure

ROOT = Path(__file__).resolve().parents[1]
bank = ROOT / "assets/voices/fish_v3"
model = WhisperModel(
    "small",
    device="cpu",
    compute_type="int8",
    download_root="/private/tmp/winky-models",
)


def normalized(text):
    return re.sub(r"[^a-zа-я0-9]", "", text.lower().replace("ё", "е"))


seen = set()
while True:
    for path in sorted(bank.glob("*/*/*.review.json")):
        if path in seen:
            continue
        row = json.loads(path.read_text())
        media = bank / row["file"]
        report = path.with_suffix(".qc.json")
        if report.exists():
            seen.add(path)
            continue
        metrics = measure(media)
        raw = subprocess.run(
            [
                "ffmpeg",
                "-v",
                "error",
                "-i",
                str(media),
                "-f",
                "f32le",
                "-ar",
                "16000",
                "-ac",
                "1",
                "pipe:1",
            ],
            capture_output=True,
            check=True,
        ).stdout
        segments, _ = model.transcribe(
            np.frombuffer(raw, dtype=np.float32),
            language=row["lang"],
            beam_size=3,
            word_timestamps=True,
        )
        parts = [
            {
                "start": s.start,
                "end": s.end,
                "text": s.text,
                "words": [
                    {"word": w.word, "start": w.start, "end": w.end}
                    for w in (s.words or [])
                ],
            }
            for s in segments
        ]
        transcript = " ".join(s["text"].strip() for s in parts)
        ratio = difflib.SequenceMatcher(
            None, normalized(row["text"]), normalized(transcript)
        ).ratio()
        issues = []
        if ratio < 0.9:
            issues.append("transcript_mismatch")
        if metrics.get("clipped_fraction", 0) > 0.001:
            issues.append("possible_clipping")
        if not metrics.get("decode_ok"):
            issues.append("decode_failure")
        if metrics.get("rms", 0) < 0.005:
            issues.append("near_silence")
        max_duration = (
            8
            if row["category"] == "STREAM_INSIGHT" or row.get("reuse_candidate")
            else 5.5
        )
        if metrics.get("duration", 999) > max_duration:
            issues.append("long_for_category")
        result = {
            "id": row["id"],
            "expected": row["text"],
            "transcript": transcript,
            "similarity": round(ratio, 3),
            "metrics": metrics,
            "segments": parts,
            "issues": issues,
            "auditory_verified": False,
        }
        report.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
        seen.add(path)
        print("checked", len(seen), row["id"], issues, flush=True)
    if len(seen) >= 240:
        break
    time.sleep(1)
rows = []
for path in sorted(bank.glob("*/*/*.review.qc.json")):
    rows.append(json.loads(path.read_text()))
manifest_path = bank / "manifest.json"
manifest = json.loads(manifest_path.read_text())
by_id = {row["id"]: row for row in rows}
for records in manifest["categories"].values():
    for record in records:
        qc = by_id[record["id"]]
        if qc["metrics"]["sha256"] != record["sha256"]:
            raise ValueError("QC belongs to different audio: " + record["id"])
        record["transcript"] = qc["transcript"]
        record["automatic_qc_passed"] = not qc["issues"]
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
(ROOT / "docs/voice-audit/fish-qc.json").write_text(
    json.dumps(
        {"auditory_review_complete": False, "records": rows},
        ensure_ascii=False,
        indent=2,
    )
    + "\n"
)
(bank / "qc.json").write_text(json.dumps({"records": [
    {key: row[key] for key in ("id", "transcript", "issues")} for row in rows
]}, ensure_ascii=False, indent=2) + "\n")

print(
    "QC complete",
    len(rows),
    "flagged",
    sum(bool(r["issues"]) for r in rows),
    flush=True,
)
