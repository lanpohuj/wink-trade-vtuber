"""Resumable staged bank generation; never activates unreviewed audio."""

from __future__ import annotations
import concurrent.futures, hashlib, json, shutil, threading
from pathlib import Path
from winky.fish_tts import FishAudioTTS
from winky.tts import media_duration_seconds, compute_rms_chunks

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "assets/voices/fish_v3"


def generate():
    source = json.loads((ROOT / "docs/voice-audit/catalog-240.json").read_text())
    DEST.mkdir(parents=True, exist_ok=True)
    engine = FishAudioTTS()
    lock = threading.Lock()
    records = []

    def one(original):
        item = dict(original)
        relative = f"{item['lang']}/{item['category']}/{item['id']}.mp3"
        target = DEST / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        reuse = item.get("reuse_candidate")
        old = ROOT / "assets/voices/lumean" / reuse["file"] if reuse else None
        if (
            reuse
            and old.is_file()
            and hashlib.sha256(old.read_bytes()).hexdigest() == reuse["sha256"]
        ):
            if not target.exists():
                shutil.copy2(old, target)
            item["text"] = reuse["text"]
            item["source_provider"] = "lumean_preserved"
        elif not target.exists():
            path = engine.synthesize(item["text"], item["lang"])
            shutil.copy2(path, target)
            item["source_provider"] = "fish_direct"
        item.update(
            file=relative,
            status="review_pending",
            auditory_verified=False,
            duration=media_duration_seconds(target),
            sha256=hashlib.sha256(target.read_bytes()).hexdigest(),
            provider="fish_direct",
        )
        item["text_sha256"] = hashlib.sha256(item["text"].encode()).hexdigest()
        item["rms_file"] = relative + ".rms2.json"
        compute_rms_chunks(target)
        target.with_suffix(".review.json").write_text(
            json.dumps(item, ensure_ascii=False, indent=2) + "\n"
        )
        with lock:
            records.append(item)
            print(
                "staged",
                len(records),
                "/ 240",
                item["id"],
                round(item["duration"], 2),
                flush=True,
            )
        return item

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            futures = [pool.submit(one, row) for row in source["records"]]
            for future in concurrent.futures.as_completed(futures):
                try:
                    future.result()
                except Exception:
                    for pending in futures:
                        pending.cancel()
                    raise
    finally:
        categories = {}
        for item in sorted(records, key=lambda r: r["id"]):
            categories.setdefault(item["category"], []).append(item)
        (DEST / "manifest.json").write_text(
            json.dumps(
                {
                    "version": "3.0",
                    "activated": False,
                    "total_phrases": len(records),
                    "categories": categories,
                },
                ensure_ascii=False,
                indent=2,
            )
            + "\n"
        )
        engine._client.close()


if __name__ == "__main__":
    generate()
