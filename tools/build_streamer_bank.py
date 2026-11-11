"""Build a separate 500-line bank; never overwrites the live bank."""

from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
from tools import build_commentary_bank as build
from tools.streamer_catalog import catalog, ROOT
from winky.censor import check_phrase

BANK = ROOT / "assets/voices/streamer_v2"
DOCUMENTS = ROOT / "docs/voice-audit/streamer-v2"


def configure():
    build.BANK = BANK
    build.CATALOG = DOCUMENTS / "catalog-500.json"
    build.QC_OUTPUT = DOCUMENTS / "qc.json"
    # Conversational takes may be longer; playback still measures the real file
    # and checks the complete available window before starting it.
    build.MAX_DURATION_SEC = 10


def preflight():
    rows = catalog()
    assert len(rows) == 500 and all(
        sum(r["lang"] == lang for r in rows) == 250 for lang in ("ru", "en")
    )
    for row in rows:
        if not check_phrase(row["text"])[0] or len(row["tts_text"].encode()) > 500:
            raise ValueError("Text preflight failed: " + row["id"])
    return rows


def write_catalog():
    rows = preflight()
    DOCUMENTS.mkdir(parents=True, exist_ok=True)
    (DOCUMENTS / "catalog-500.json").write_text(
        json.dumps(
            dict(
                version=1,
                review_status="approved_delivery_pending_audio_qc",
                records=rows,
            ),
            ensure_ascii=False,
            indent=2,
        )
        + "\n"
    )
    return rows


def verify_delivery(approval):
    if (
        approval.get("voice_samples_accepted") is not True
        or approval.get("method") != "owner_sampled"
    ):
        raise ValueError("Owner delivery acceptance required")
    pilots = json.loads((DOCUMENTS / "pilot.json").read_text())
    expected = {r["file"]: r["metrics"]["sha256"] for r in pilots}
    accepted = {
        r["file"]: r["sha256"]
        for r in approval.get("delivery_samples", [])
        if r.get("accepted") is True
    }
    if accepted != expected:
        raise ValueError("Both languages and all three delivery samples must match")
    for file, sha in expected.items():
        path = ROOT / file
        if hashlib.sha256(path.read_bytes()).hexdigest() != sha:
            raise ValueError("Delivery sample changed")


def generate(only_ids=None):
    from config import settings
    from winky.fish_tts import FishAudioTTS

    rows = preflight()
    approval = json.loads((DOCUMENTS / "acceptance.json").read_text())
    verify_delivery(approval)
    engine = FishAudioTTS()
    try:
        for lang in ("ru", "en"):
            engine.tuning[lang] = dict(
                speed=1.06, temperature=0.82, top_p=0.85, latency="balanced"
            )
        pending = [
            r
            for r in rows
            if (not only_ids or r["id"] in only_ids)
            and not engine.is_cached(r["tts_text"], r["lang"])
        ]
        spent = json.loads((engine.root / "budget.json").read_text()).get(
            "reserved_usd", 0
        )
        estimate = sum(len(r["tts_text"].encode()) for r in pending) * 15 / 1_000_000
        if spent + estimate > settings.FISHAUDIO_BUDGET_USD:
            raise ValueError(
                f"Entire requested batch exceeds approved remaining budget: ${estimate:.4f}"
            )
        print(
            json.dumps(
                dict(
                    estimated_remaining_usd=round(estimate, 4),
                    new_requests=len(pending),
                )
            ),
            flush=True,
        )
    finally:
        engine._client.close()
    configure()
    build.generate(only_ids)


def activate():
    approval = json.loads((DOCUMENTS / "acceptance.json").read_text())
    verify_delivery(approval)
    configure()
    build.activate(DOCUMENTS / "acceptance.json")
    manifest = json.loads((BANK / "manifest.json").read_text())
    if manifest.get("active_count") != 500:
        raise ValueError("All 500 recordings must pass before switching")
    # Pointer switches atomically; the old bank and its media remain untouched.
    pointer = ROOT / "assets/voices/commentary-bank.json"
    temporary = pointer.with_suffix(".tmp")
    temporary.write_text(json.dumps({"path": "streamer_v2"}) + "\n")
    temporary.replace(pointer)


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("command", choices=["catalog", "generate", "qc", "activate"])
    p.add_argument("--only-id", action="append")
    args = p.parse_args()
    if args.command == "catalog":
        write_catalog()
    elif args.command == "generate":
        generate(args.only_id)
    elif args.command == "qc":
        configure()
        build.qc()
    else:
        activate()
