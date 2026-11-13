"""Resumable Fish generation, measurable QC and explicit sampled acceptance."""

from __future__ import annotations
import argparse, concurrent.futures, difflib, hashlib, json, re, shutil, subprocess, threading
from pathlib import Path
from winky.fish_tts import FishAudioTTS
from winky.tts import compute_rms_chunks, media_duration_seconds
from winky.censor import check_phrase

ROOT = Path(__file__).resolve().parents[1]
BANK = ROOT / "assets/voices/commentary_v1"
CATALOG = ROOT / "docs/voice-audit/commentary-160.json"
QC_OUTPUT = ROOT / "docs/voice-audit/commentary-qc.json"
MAX_DURATION_SEC = 7


def generate(only_ids=None):
    rows = json.loads(CATALOG.read_text())["records"]
    manifest_path = BANK / "manifest.json"
    existing = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    previous_rows = {
        r["id"]: r for group in existing.get("categories", {}).values() for r in group
    }
    if existing.get("activated") and not only_ids:
        raise ValueError("Active bank: use --only-id for a deferred recording")
    if only_ids:
        if not set(only_ids).issubset({r["id"] for r in rows}):
            raise ValueError("Unknown recording")
        rows = [r for r in rows if r["id"] in only_ids]
        if any(previous_rows.get(r["id"], {}).get("status") == "ready" for r in rows):
            raise ValueError("Do not overwrite a ready recording in place")
    for row in rows:
        if not check_phrase(row["text"])[0]:
            raise ValueError("Unsafe catalog text: " + row["id"])
    engine = FishAudioTTS()
    lock = threading.Lock()
    for lang in ("ru", "en"):
        engine.tuning[lang] = {
            "speed": 1.06,
            "temperature": 0.82,
            "top_p": 0.85,
            "latency": "balanced",
        }
    BANK.mkdir(parents=True, exist_ok=True)

    def one(source):
        row = dict(source)
        assert check_phrase(row["text"])[0]
        if engine.voices[row["lang"]] != row["voice_id"]:
            raise ValueError("Voice slot differs from approved voice")
        dest = BANK / row["lang"] / row["category"] / (row["id"] + ".mp3")
        dest.parent.mkdir(parents=True, exist_ok=True)
        previous = dest.with_suffix(".review.json")
        prior = json.loads(previous.read_text()) if previous.exists() else {}
        if (
            not dest.exists()
            or not previous.exists()
            or prior.get("text_sha256") != row["text_sha256"]
            or prior.get('request_payload') != engine.payload(row['tts_text'], row['lang'])
        ):
            shutil.copy2(engine.synthesize(row["tts_text"], row["lang"]), dest)
            # RMS is cached by filename. A replacement take needs a new envelope,
            # otherwise its mouth animation can retain the previous duration.
            dest.with_suffix(dest.suffix + ".rms2.json").unlink(missing_ok=True)
        compute_rms_chunks(dest)
        row.update(
            file=dest.relative_to(BANK).as_posix(),
            duration=media_duration_seconds(dest),
            sha256=hashlib.sha256(dest.read_bytes()).hexdigest(),
            request_payload=engine.payload(row["tts_text"], row["lang"]),
            status="review_pending",
            auditory_verified=False,
        )
        dest.with_suffix(".review.json").write_text(
            json.dumps(row, ensure_ascii=False, indent=2) + "\n"
        )
        with lock:
            print("staged", row["id"], round(row["duration"], 2), flush=True)
        return row

    result = []
    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            futures = [pool.submit(one, row) for row in rows]
            for future in concurrent.futures.as_completed(futures):
                try:
                    result.append(future.result())
                except Exception:
                    for pending in futures:
                        pending.cancel()
                    raise
    finally:
        engine._client.close()
        categories = {}
        if only_ids:
            previous_rows.update({r["id"]: r for r in result})
            for row in previous_rows.values():
                categories.setdefault(row["category"], []).append(row)
        # Include previous successful attempts when resuming a partial run.
        for path in [] if only_ids else sorted(BANK.glob("*/*/*.review.json")):
            row = json.loads(path.read_text())
            categories.setdefault(row["category"], []).append(row)
        metadata = (
            existing
            if only_ids
            else {"version": "1.0", "bank_type": "commentary_v1", "activated": False}
        )
        metadata["categories"] = categories
        temp = BANK / "manifest.tmp"
        temp.write_text(
            json.dumps(
                metadata,
                ensure_ascii=False,
                indent=2,
            )
            + "\n"
        )
        temp.replace(manifest_path)


def normalize(text, lang="ru"):
    text = text.lower().replace("ё", "е")
    forms = (
        [
            (r"two[-\s]+hundred(?:[-\s]+and)?[-\s]+forty[-\s]+two", "242"),
            (r"one[-\s]+hundred(?:[-\s]+and)?[-\s]+ten", "110"),
            ("fifty", "50"),
            ("fifteen", "15"),
            ("thirty", "30"),
            (r"half[-\s]+a[-\s]+minute", "30"),
        ]
        if lang == "en"
        else [
            ("двести сорок два", "242"),
            ("сто десять", "110"),
            (r"пятьдесят|пятидесяти", "50"),
            ("пятнадцать", "15"),
            ("тридцать", "30"),
            (r"пол\s*минуты", "30"),
        ]
    )
    for words, number in forms:
        text = re.sub(words, number, text)
    return re.sub(r"[^a-zа-я0-9]", "", text)


def qc(only_ids=None):
    import numpy as np
    from faster_whisper import WhisperModel
    from tools.audit_voice_bank import measure

    model = WhisperModel(
        "small",
        device="cpu",
        compute_type="int8",
        download_root="/private/tmp/winky-models",
    )
    manifest = json.loads((BANK / "manifest.json").read_text())
    reports = []
    source = {r["id"]: r for r in json.loads(CATALOG.read_text())["records"]}
    for category in manifest["categories"].values():
        for row in category:
            if only_ids and row['id'] not in only_ids:
                continue
            if row["text_sha256"] != source[row["id"]]["text_sha256"]:
                raise ValueError("Catalog text changed; regenerate " + row["id"])
            row["conditions"] = source[row["id"]]["conditions"]
            row["requires_listening"] = source[row["id"]].get(
                "requires_listening", False
            )
            path = BANK / row["file"]
            saved = path.with_suffix(".qc.json")
            if (
                saved.exists()
                and json.loads(saved.read_text()).get("sha256") == row["sha256"]
            ):
                report = json.loads(saved.read_text())
            else:
                metrics = measure(path)
                data = subprocess.run(
                    [
                        "ffmpeg",
                        "-v",
                        "error",
                        "-i",
                        str(path),
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
                    np.frombuffer(data, dtype=np.float32),
                    language=row["lang"],
                    beam_size=3,
                )
                parts = [
                    {"start": s.start, "end": s.end, "text": s.text} for s in segments
                ]
                transcript = " ".join(s["text"].strip() for s in parts)
                ratio = difflib.SequenceMatcher(
                    None,
                    normalize(row["text"], row["lang"]),
                    normalize(transcript, row["lang"]),
                ).ratio()
                issues = []
                if ratio < 0.9:
                    issues.append("transcript_mismatch")
                if not metrics.get("decode_ok") or metrics.get("rms", 0) < 0.005:
                    issues.append("decode_or_silence")
                if metrics.get("clipped_fraction", 0) > 0.001:
                    issues.append("possible_clipping")
                if metrics.get("duration", 999) > min(MAX_DURATION_SEC, row.get('max_duration_sec', MAX_DURATION_SEC)):
                    issues.append("too_long")
                if not check_phrase(transcript)[0]:
                    issues.append("content_review")
                report = dict(
                    id=row["id"],
                    sha256=row["sha256"],
                    expected=row["text"],
                    transcript=transcript,
                    similarity=round(ratio, 3),
                    metrics=metrics,
                    segments=parts,
                    issues=issues,
                    auditory_verified=False,
                )
                saved.write_text(
                    json.dumps(report, ensure_ascii=False, indent=2) + "\n"
                )
            ratio = difflib.SequenceMatcher(
                None,
                normalize(row["text"], row["lang"]),
                normalize(report["transcript"], row["lang"]),
            ).ratio()
            report["similarity"] = round(ratio, 3)
            report["issues"] = [
                issue
                for issue in report["issues"]
                if issue not in ("transcript_mismatch", "spoken_number_mismatch")
            ]
            if ratio < 0.9:
                report["issues"].append("transcript_mismatch")
            kind = row.get("conditions", {}).get("result_kind")
            amount = {"LOSS_110": "110", "LOSS_242": "242", "LOSS_RESET": "50"}.get(
                kind
            )
            expiry = row.get("conditions", {}).get("expiry")
            number = amount or {"15s": "15", "30s": "30"}.get(expiry)
            if number and number not in normalize(report["transcript"], row["lang"]):
                report["issues"].append("spoken_number_mismatch")
            saved.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
            row.update(
                transcript=report["transcript"],
                automatic_qc_passed=not report["issues"],
            )
            reports.append(report)
            print("checked", len(reports), row["id"], report["issues"], flush=True)
    (BANK / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"
    )
    report_path = QC_OUTPUT.with_name('qc-selected.json') if only_ids else QC_OUTPUT
    report_path.write_text(
        json.dumps(
            {"auditory_review_complete": False, "records": reports},
            ensure_ascii=False,
            indent=2,
        )
        + "\n"
    )
    (BANK / ('qc-selected.json' if only_ids else 'qc.json')).write_text(
        json.dumps({"records": reports}, ensure_ascii=False, indent=2) + "\n"
    )


def activate(approval_path, allow_partial=False):
    manifest = json.loads((BANK / "manifest.json").read_text())
    approval = json.loads(approval_path.read_text())
    if (
        approval.get("method") != "owner_sampled"
        or approval.get("voice_samples_accepted") is not True
    ):
        raise ValueError("Sampled acceptance required")
    reviewed = {r["id"]: r for r in approval.get("records", [])}
    rows = [r for group in manifest["categories"].values() for r in group]
    catalog_rows = {r["id"]: r for r in json.loads(CATALOG.read_text())["records"]}
    expected = set(catalog_rows)
    if len(rows) != len(expected) or {r["id"] for r in rows} != expected:
        raise ValueError("Incomplete bank")
    for row in rows:
        path = (BANK / row["file"]).resolve()
        if (
            not path.is_relative_to(BANK.resolve())
            or hashlib.sha256(path.read_bytes()).hexdigest() != row["sha256"]
        ):
            raise ValueError("Changed audio")
        heard = reviewed.get(row["id"], {})
        requested_revision = (
            heard.get("owner_requested_revision") is True
            and heard.get("text_sha256") == row["text_sha256"]
            and row.get("automatic_qc_passed") is True
        )
        needs_listening = catalog_rows[row["id"]].get("requires_listening") and not (
            heard.get("accepted") is True
            and heard.get("sha256") == row["sha256"]
            and (heard.get("listened") is not False or requested_revision)
        )
        if needs_listening and not allow_partial:
            raise ValueError("Corrected recording needs listening: " + row["id"])
        report = json.loads(path.with_suffix(".qc.json").read_text())
        if report.get("sha256") != row["sha256"] or any(
            i != "transcript_mismatch" for i in report["issues"]
        ):
            raise ValueError("Technical QC failed: " + row["id"])
        if not row.get("automatic_qc_passed") and not (
            heard.get("accepted") is True and heard.get("sha256") == row["sha256"]
        ):
            raise ValueError("Flagged recording needs listening: " + row["id"])
        if heard.get("accepted") is False:
            raise ValueError("Rejected recording")
        if needs_listening:
            row.update(
                status="review_pending", review_accepted=False, auditory_verified=False
            )
            continue
        row.update(
            status="ready",
            review_method="owner_sampled",
            review_accepted=True,
            auditory_verified=heard.get("accepted") is True
            and heard.get("sha256") == row["sha256"]
            and heard.get("listened") is not False,
            review_basis="owner_requested_text_revision"
            if requested_revision
            else "owner_sampled",
            qc_override_accepted=bool(report["issues"])
            and heard.get("accepted") is True,
        )

    def coverage(row):
        detailed = row["category"].startswith("OPEN_") or row["category"] in (
            "NARRATE_EXPIRY",
            "NARRATE_RESULT",
        )
        return (
            row["category"],
            row["lang"],
            json.dumps(row["conditions"], sort_keys=True) if detailed else "",
        )

    required = {coverage(row) for row in catalog_rows.values()}
    if not required.issubset(
        {coverage(row) for row in rows if row["status"] == "ready"}
    ):
        raise ValueError("Required commentary coverage missing")
    manifest.update(
        activated=True,
        review_method="owner_sampled",
        review_accepted=True,
        active_count=sum(row["status"] == "ready" for row in rows),
    )
    temp = BANK / "manifest.tmp"
    temp.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    temp.replace(BANK / "manifest.json")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("command", choices=["generate", "qc", "activate"])
    p.add_argument("--approval", type=Path)
    p.add_argument("--only-id", action="append")
    p.add_argument(
        "--allow-partial",
        action="store_true",
        help="Keep unreviewed variants out; require every functional context",
    )
    args = p.parse_args()
    if args.command == "activate":
        activate(args.approval, allow_partial=args.allow_partial)
    elif args.command == "generate":
        generate(args.only_id)
    else:
        globals()[args.command]()
