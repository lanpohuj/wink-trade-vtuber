"""Generate only small, unapproved delivery comparisons, never bank replacements."""
import json
import shutil
from pathlib import Path

from winky.fish_tts import FishAudioTTS
from winky.tts import media_duration_seconds

ROOT = Path(__file__).resolve().parents[1]
CASES = [
    ('ru_A', 'ru', '[happy] Прошлая сделка закрылась в плюс. Мяу, принято!', {}),
    ('ru_B', 'ru', '[warm and playful] О, сделка в плюс! Мур, записала.',
     dict(speed=1.0, temperature=0.82, top_p=0.85, latency='balanced')),
    ('en_A', 'en', '[happy] That closed trade finished positive. Meow!', {}),
    ('en_B', 'en', "[warm and playful] Nice, that one's a win! Meow, noted.",
     dict(speed=1.0, temperature=0.82, top_p=0.85, latency='balanced')),
]


def generate():
    dest = ROOT / 'voice_cache/fish_delivery_auditions'
    dest.mkdir(parents=True, exist_ok=True)
    engine = FishAudioTTS()
    rows = []
    try:
        for ident, lang, text, tuning in CASES:
            # Local comparison only: do not save tuning into runtime settings.
            engine.tuning[lang] = tuning.copy()
            source = engine.synthesize(text, lang)
            path = dest / (ident + '.mp3')
            shutil.copy2(source, path)
            rows.append(dict(id=ident, lang=lang, request=engine.payload(text, lang),
                             path=str(path), duration=media_duration_seconds(path),
                             auditory_verified=False, accepted=False))
            (dest / 'manifest.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2) + '\n')
            print(ident, round(rows[-1]['duration'], 2), flush=True)
    finally:
        engine._client.close()


if __name__ == '__main__':
    generate()
