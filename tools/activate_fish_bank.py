"""Activate only a complete bank with explicit listening acceptance and hashes."""

import argparse, hashlib, json
from pathlib import Path
from winky.voice_bank import CATEGORY_COUNTS

ROOT = Path(__file__).resolve().parents[1]


def activate(approval):
    bank = ROOT / "assets/voices/fish_v3"
    path = bank / "manifest.json"
    manifest = json.loads(path.read_text())
    approved = json.loads(approval.read_text())
    if approved.get("method") != "owner_listening":
        raise ValueError("Listening acceptance required")
    records = [r for rows in manifest["categories"].values() for r in rows]
    if len(records) != 240 or len({r["id"] for r in records}) != 240:
        raise ValueError("Expected 240 unique recordings")
    byid = {r["id"]: r for r in approved["records"]}
    for category, count in CATEGORY_COUNTS.items():
        rows = manifest["categories"].get(category, [])
        for lang in ("ru", "en"):
            if sum(r["lang"] == lang for r in rows) != count:
                raise ValueError("Incomplete bank")
        for row in rows:
            if row.get("automatic_qc_passed") is not True:
                raise ValueError("Automatic QC required: " + row["id"])
            accepted = byid.get(row["id"], {})
            media = (bank / row["file"]).resolve()
            if not media.is_relative_to(bank.resolve()):
                raise ValueError("Recording outside bank")
            actual = hashlib.sha256(media.read_bytes()).hexdigest()
            if (
                accepted.get("accepted") is not True
                or accepted.get("sha256") != actual
                or actual != row["sha256"]
            ):
                raise ValueError("Unreviewed or changed audio: " + row["id"])
            row.update(
                status="ready", auditory_verified=True, review_method="owner_listening"
            )
    manifest["activated"] = True
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    tmp.replace(path)
    pointer = bank.parent / "active-bank.json"
    tmp = pointer.with_suffix(".tmp")
    tmp.write_text(json.dumps({"path": "fish_v3"}))
    tmp.replace(pointer)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("approval", type=Path)
    activate(parser.parse_args().approval)
