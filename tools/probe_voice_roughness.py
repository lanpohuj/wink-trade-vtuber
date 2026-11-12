"""Small controlled delivery comparison after an owner-confirmed rough take.

Same text and voice, no retries. Sampling is stochastic: this comparison can
support a delivery choice but cannot prove that a tag caused the defect.
"""
import hashlib
import json
import shutil
from tools.lively_catalog import DOCS, ROOT, VOICES
from tools.build_lively_bank import estimate, write_json
from winky.fish_tts import FishAudioTTS
from tools.audit_voice_bank import measure


TEXT = 'Есть плюс! Ну, вот это приятно. Дайте мне секунду порадоваться — и смотрим дальше.'


def generate():
    estimate([dict(tts_text='[' + cue + '] ' + TEXT, lang='ru') for cue in
              ('excited, conversational', 'conversational', 'conversational')])
    engine = FishAudioTTS()
    rows = []
    try:
        if engine.voices['ru'] != VOICES['ru']:
            raise ValueError('Expected approved Marin voice')
        variants = [('A', 'excited, conversational', .82, .85),
                    ('B', 'conversational', .82, .85),
                    ('C', 'conversational', .65, .80)]
        for label, cue, temperature, top_p in variants:
            engine.tuning['ru'] = dict(speed=1.06, temperature=temperature, top_p=top_p, latency='balanced')
            text = '[' + cue + '] ' + TEXT
            # Adapter checks the actual payload against the same cumulative ledger.
            source = engine.synthesize(text, 'ru')
            dest = ROOT / 'assets/voices/lively_roughness' / f'ru-{label}.mp3'
            dest.parent.mkdir(parents=True, exist_ok=True)
            if dest.exists() and hashlib.sha256(dest.read_bytes()).hexdigest() != hashlib.sha256(source.read_bytes()).hexdigest():
                raise ValueError('Do not overwrite an existing probe')
            shutil.copy2(source, dest)
            rows.append(dict(label=label, text=TEXT, tts_text=text, lang='ru',
                file=dest.relative_to(ROOT).as_posix(), sha256=hashlib.sha256(dest.read_bytes()).hexdigest(),
                request_payload=engine.payload(text, 'ru'), metrics=measure(dest),
                auditory_verified=False, acceptance_status='pending'))
            print('staged probe', label, flush=True)
    finally:
        engine._client.close()
    write_json(DOCS / 'roughness-probes.json', rows)


if __name__ == '__main__':
    generate()
