"""Direct Fish Audio adapter; ready files only, no alternate-provider fallback."""

from __future__ import annotations
import hashlib, json, threading, uuid, subprocess, fcntl
from pathlib import Path
import httpx
from config import settings


class FishAudioTTS:
    name = "Fish Audio"
    BASE_URL = "https://api.fish.audio"

    def __init__(self):
        self._client = httpx.Client(timeout=httpx.Timeout(120, connect=15))
        self.root = Path(__file__).resolve().parents[1] / "voice_cache" / "fish_direct"
        self.root.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()
        self._file_locks = {}
        self.voices = {
            "ru": settings.FISHAUDIO_RU_VOICE_ID,
            "en": settings.FISHAUDIO_EN_VOICE_ID,
        }
        self.names = {"ru": "Марин китагава", "en": "Venti"}
        self.tuning = {}
        path = self.root / "settings.json"
        if path.exists():
            data = json.loads(path.read_text())
            self.voices.update(data.get("voices", {}))
            self.names.update(data.get("names", {}))
            self.tuning = data.get("tuning", {})

    @property
    def ru_service(self):
        return "fishaudio"

    @property
    def en_service(self):
        return "fishaudio"

    @property
    def ru_voice_id(self):
        return self.voices["ru"]

    @property
    def en_voice_id(self):
        return self.voices["en"]

    @property
    def ru_voice_name(self):
        return self.names["ru"]

    @property
    def en_voice_name(self):
        return self.names["en"]

    def get_tuning(self, slot):
        result = {
            "speed": 1.06,
            "temperature": 0.82,
            "top_p": 0.85,
            "latency": "balanced",
            "model_id": "s2.1-pro",
            "sample_rate": 44100,
            "normalize": True,
            "normalize_volume": True,
            **self.tuning.get(slot, {}),
        }
        result["normalize_text"] = result["normalize"]
        return result

    def _save(self):
        path = self.root / "settings.json"
        tmp = path.with_suffix(".tmp")
        tmp.write_text(
            json.dumps(
                {"voices": self.voices, "names": self.names, "tuning": self.tuning},
                ensure_ascii=False,
            )
        )
        tmp.replace(path)

    def set_voice(self, lang_slot, service_key, voice_id, voice_name=""):
        from winky.tts import TTSError

        if (
            service_key not in ("fishaudio", "fish_direct")
            or lang_slot not in self.voices
        ):
            raise TTSError("Unsupported Fish voice slot")
        response = self._client.get(
            self.BASE_URL + "/model/" + voice_id, headers=self._headers()
        )
        response.raise_for_status()
        with self._lock:
            self.voices[lang_slot] = voice_id
            self.names[lang_slot] = voice_name or response.json().get("title", voice_id)
            self._save()

    def save_voice_tuning(self, slot, tuning_data):
        from winky.tts import TTSError

        tuning_data = dict(tuning_data)
        if "normalize_text" in tuning_data:
            tuning_data["normalize"] = tuning_data.pop("normalize_text")
        allowed = {
            "speed",
            "temperature",
            "top_p",
            "latency",
            "normalize",
            "normalize_volume",
            "sample_rate",
        }
        clean = {k: v for k, v in tuning_data.items() if k in allowed}
        if not 0.5 <= float(clean.get("speed", 1.06)) <= 2:
            raise TTSError("Invalid Fish speed")
        for key in ("temperature", "top_p"):
            if not 0 <= float(clean.get(key, 0.7)) <= 1:
                raise TTSError("Invalid Fish sampling setting")
        if clean.get("latency", "normal") not in ("normal", "balanced", "low"):
            raise TTSError("Invalid Fish latency")
        if int(clean.get("sample_rate", 44100)) not in (32000, 44100):
            raise TTSError("Invalid MP3 sample rate")
        with self._lock:
            self.tuning.setdefault(slot, {}).update(clean)
            self._save()
        return self.get_settings()

    def get_settings(self):
        data = {
            "provider": "fish_direct",
            "model": "s2.1-pro",
            "templates_supported": False,
            "budget_limit_usd": settings.FISHAUDIO_BUDGET_USD,
        }
        for lang in ("ru", "en"):
            data[lang] = {
                "service_key": "fishaudio",
                "voice_id": self.voices[lang],
                "voice_name": self.names[lang],
                "tuning": self.get_tuning(lang),
            }
            data.update(
                {
                    lang + "_service": "fishaudio",
                    lang + "_voice_id": self.voices[lang],
                    lang + "_voice_name": self.names[lang],
                    lang + "_tuning": self.get_tuning(lang),
                }
            )
        return data

    def _headers(self):
        return {
            "Authorization": "Bearer " + settings.FISHAUDIO_API_KEY,
            "model": "s2.1-pro",
        }

    def payload(self, text, lang):
        t = self.get_tuning(lang)
        return {
            "text": text,
            "reference_id": self.voices[lang],
            "language": lang,
            "format": "mp3",
            "sample_rate": t["sample_rate"],
            "mp3_bitrate": 128,
            "latency": t["latency"],
            "normalize": t["normalize"],
            "temperature": t["temperature"],
            "top_p": t["top_p"],
            "prosody": {
                "speed": t["speed"],
                "volume": 0,
                "normalize_loudness": t["normalize_volume"],
            },
        }

    def get_cache_path(self, text, lang="ru"):
        # Case and inline delivery cues can change prosody. Hash exactly the
        # request that is sent, rather than reusing a lower-cased recording.
        payload = self.payload(text, lang)
        return self._path_for_payload(payload, lang)

    def _path_for_payload(self, payload, lang):
        key = hashlib.sha256(
            json.dumps(payload, sort_keys=True, ensure_ascii=False).encode()
        ).hexdigest()[:24]
        return self.root / (lang + "_" + payload["reference_id"]) / f"{key}.mp3"

    def is_cached(self, text, lang="ru"):
        p = self.get_cache_path(text, lang)
        return p.is_file() and p.stat().st_size > 1024

    def _budget(self, amount, refund=False):
        from winky.tts import TTSError

        with (self.root / "budget.lock").open("a") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            path = self.root / "budget.json"
            data = (
                json.loads(path.read_text()) if path.exists() else {"reserved_usd": 0}
            )
            total = max(0, data["reserved_usd"] + (-amount if refund else amount))
            if total > settings.FISHAUDIO_BUDGET_USD:
                raise TTSError("Fish Audio budget limit reached")
            data["reserved_usd"] = total
            tmp = path.with_suffix(".tmp")
            tmp.write_text(json.dumps(data))
            tmp.replace(path)

    def synthesize(self, text, lang="ru", bypass_cache=False):
        from winky.tts import TTSError, compute_rms_chunks
        from winky.censor import check_phrase

        if not text.strip() or not check_phrase(text)[0]:
            raise TTSError("Unsafe or empty speech")
        if lang not in ("ru", "en"):
            raise TTSError("Unsupported language")
        request_payload = self.payload(text, lang)
        target = self._path_for_payload(request_payload, lang)
        target.parent.mkdir(parents=True, exist_ok=True)
        with self._lock:
            file_lock = self._file_locks.setdefault(str(target), threading.Lock())
        with file_lock:
            if not bypass_cache and target.is_file() and target.stat().st_size > 1024:
                return target
            if not settings.FISHAUDIO_API_KEY:
                raise TTSError("FISHAUDIO_API_KEY missing")
            cost = len(text.encode("utf8")) * 15 / 1_000_000
            self._budget(cost)
            temp = target.with_suffix("." + uuid.uuid4().hex + ".part")
            try:
                with self._client.stream(
                    "POST",
                    self.BASE_URL + "/v1/tts",
                    headers=self._headers(),
                    json=request_payload,
                ) as response:
                    if response.status_code != 200:
                        self._budget(cost, refund=True)
                        raise TTSError(f"Fish Audio HTTP {response.status_code}")
                    with temp.open("wb") as output:
                        for chunk in response.iter_bytes():
                            output.write(chunk)
                if temp.stat().st_size < 1024:
                    raise TTSError("Fish audio too short or empty")
                result = subprocess.run(
                    [
                        "ffprobe",
                        "-v",
                        "error",
                        "-show_entries",
                        "format=duration",
                        "-of",
                        "json",
                        str(temp),
                    ],
                    capture_output=True,
                    text=True,
                    timeout=10,
                )
                if (
                    result.returncode
                    or float(json.loads(result.stdout)["format"]["duration"]) <= 0
                ):
                    raise TTSError("Fish audio decode failed")
                temp.replace(target)
                compute_rms_chunks(target)
                target.with_suffix(".metadata.json").write_text(
                    json.dumps(
                        {
                            "provider": "fish_direct",
                            "model": "s2.1-pro",
                            "voice_id": request_payload["reference_id"],
                            "lang": lang,
                            "text": text,
                            "request_payload": request_payload,
                            "estimated_usd": cost,
                        },
                        ensure_ascii=False,
                    )
                )
                return target
            except httpx.HTTPError as error:
                raise TTSError(
                    "Fish Audio network failure; no automatic paid retry"
                ) from error
            finally:
                temp.unlink(missing_ok=True)

    def apply_live_preset(self, slot):
        return self.save_voice_tuning(
            slot, {"speed": 1.06, "temperature": 0.82, "top_p": 0.85, "latency": "balanced"}
        )

    def list_user_templates(self):
        return []

    def clear_voice_cache(self, lang_slot="all"):
        return 0

    def search_voices(self, catalog="", query="", language="", gender="", page=1):
        r = self._client.get(
            self.BASE_URL + "/model",
            headers=self._headers(),
            params={"title": query, "page_size": 20, "page_number": page},
        )
        r.raise_for_status()
        data = r.json()
        items = data.get("items", data.get("models", []))
        return [
            {
                "id": i.get("_id", i.get("id")),
                "voice_id": i.get("_id", i.get("id")),
                "name": i.get("title"),
                "service": "fishaudio",
                "service_key": "fishaudio",
                "preview_url": (i.get("samples") or [{}])[0].get("audio"),
            }
            for i in items
        ]

    def preview_voice_sample(self, service_key, voice_id):
        r = self._client.get(
            self.BASE_URL + "/model/" + voice_id, headers=self._headers()
        )
        r.raise_for_status()
        samples = r.json().get("samples") or []
        return samples[0].get("audio", "") if samples else ""

    def set_template_id(self, *args):
        from winky.tts import TTSError

        raise TTSError("Fish Audio uses voice IDs, not templates")

    def apply_template_to_slot(self, *args):
        self.set_template_id()
