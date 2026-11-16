"""Trace historical panel buttons to existing audio; never generates speech."""
from __future__ import annotations

import hashlib
import html
import json
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
import wave

import yaml

from tools.conversation_voice_pilot import ROOT, DOCS, save
from winky.censor import sanitize_for_tiktok
from winky.editorial import approved

ARCHIVE = ROOT / 'assets/voices/legacy_delivery_references_v1'


def normalize(text):
    return re.sub(r'[^a-zа-я0-9]', '', re.sub(r'\[[^\]]*\]', '', text).lower().replace('ё', 'е'))


def build():
    scenario = yaml.safe_load((ROOT / 'winky/scenarios.yaml').read_text())
    inventory = []
    voices = dict(ru='1db1618b6eaf4571ac7db70e20eb6727', en='e34c486929524d41b88646b4ac2f382f')
    for lang, voice in voices.items():
        cache = ROOT / 'voice_cache' / ('fishaudio_' + voice[:12])
        entries = json.loads((cache / 'manifest.json').read_text()).values()
        by_text = {normalize(r['text']): r for r in entries}
        for button in scenario['quick_replies']:
            for n, text in enumerate(button.get('texts_' + lang, []), 1):
                raw = re.sub(r'^\[[^\]]*\]\s*', '', text)
                row = by_text.get(normalize(text)) or by_text.get(normalize(sanitize_for_tiktok(raw, lang)))
                media = cache / row['file'] if row else None
                exists = bool(media and media.is_file())
                inventory.append(dict(
                    button=button['id'], label=button['label'], lang=lang, variant=n,
                    panel_text=text, cached_text=row['text'] if row else None,
                    match='normalized_exact' if exists else 'no_confirmed_cached_file',
                    file=media.relative_to(ROOT).as_posix() if exists else None,
                    sha256=hashlib.sha256(media.read_bytes()).hexdigest() if exists else None,
                    cache_created_at=row.get('created_at') if row else None,
                    text_approved_for_live=approved(text),
                ))
    reserve_root = ROOT / 'assets/voices/lumean'
    reserve = json.loads((reserve_root / 'manifest.json').read_text())
    reserve_inventory = []
    for category, rows in reserve['categories'].items():
        for row in rows:
            media = reserve_root / row['file']
            reserve_inventory.append(dict(id=row['id'], category=category, text=row['text'],
                file=media.relative_to(ROOT).as_posix(), exists=media.is_file(),
                sha256=hashlib.sha256(media.read_bytes()).hexdigest() if media.is_file() else None,
                text_approved_for_live=approved(row['text'])))
    save(DOCS / 'legacy-panel-inventory.json', dict(
        panel_route='panel.js renderQuickReplies → WinkyAPI.quick_reply → scenarios.yaml',
        reserve_route='/api/winky/voice_manifest → assets/voices/lumean/manifest.json',
        runtime_engine_note='Historical cache match does not prove the running process currently plays this file.',
        panel_variants=inventory, reserve_records=reserve_inventory))
    chosen = []
    for button, variant in [('greeting', 1), ('ask_in_chat', 1), ('trade_win', 1), ('ask_chat_pair', 2)]:
        row = next(r for r in inventory if r['button'] == button and r['lang'] == 'ru' and r['variant'] == variant)
        if not row['file']:
            raise ValueError('No confirmed cache match: ' + button)
        chosen.append(dict(id=f'legacy_panel_{button}_{variant}', label=row['label'], text=row['cached_text'],
                           source_file=row['file'], sha256=row['sha256'],
                           provenance='panel_button_and_normalized_exact_cache_match',
                           source_created_at=row['cache_created_at'],
                           text_approved_for_live=row['text_approved_for_live']))
    old_win = next(r for r in reserve_inventory if r['id'] == 'win_01')
    chosen.insert(3, dict(id='legacy_reserve_win_01', label='Резерв: win_01', text=old_win['text'],
                         source_file=old_win['file'], sha256=old_win['sha256'],
                         provenance='reserve_manifest', text_approved_for_live=old_win['text_approved_for_live']))
    ARCHIVE.mkdir(parents=True, exist_ok=True)
    for row in chosen:
        dest = ARCHIVE / (row['id'] + '.mp3')
        if dest.exists() and hashlib.sha256(dest.read_bytes()).hexdigest() != row['sha256']:
            raise ValueError('Never overwrite a reference with another take: ' + row['id'])
        if not dest.exists():
            shutil.copy2(ROOT / row['source_file'], dest)
        row.update(file=dest.relative_to(ROOT).as_posix(), scope='delivery_reference_only',
                   owner_requested_source=True, exact_clip_individually_accepted=False)
    save(DOCS / 'legacy-delivery-references.json', dict(
        version=1, references=chosen, new_tts_requests=0,
        note='Additional delivery references requested by owner; historical text rejections remain in effect.'))
    # A small comparison uses only existing audio, with a one-second gap.
    pilot = json.loads((ROOT / 'assets/voices/conversation_pilot_v1/manifest.json').read_text())
    pilot_rows = {r['id']: r for group in pilot['categories'].values() for r in group}
    comparison = list(chosen)
    for n in (1, 9):
        row = pilot_rows[f'conversation_pilot_ru_{n:02}']
        if row.get('review_accepted') is not True:
            raise ValueError('Comparison take not accepted')
        comparison.append(dict(id=row['id'], label=f'Новая проба: {n:02}, принята', text=row['text'],
                               file='assets/voices/conversation_pilot_v1/' + row['file'], sha256=row['sha256']))
    timeline = []
    position = 0
    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / 'comparison.wav'
        with wave.open(str(wav), 'wb') as output:
            output.setparams((1, 2, 44100, 0, 'NONE', 'not compressed'))
            for index, row in enumerate(comparison):
                media = ROOT / row['file']
                if hashlib.sha256(media.read_bytes()).hexdigest() != row['sha256']:
                    raise ValueError('Changed reference')
                pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(media), '-f', 's16le',
                                      '-ac', '1', '-ar', '44100', 'pipe:1'], check=True, capture_output=True).stdout
                duration = len(pcm) / 88200
                timeline.append(dict(row, start=round(position, 3), end=round(position+duration, 3)))
                output.writeframes(pcm)
                position += duration
                if index < len(comparison)-1:
                    output.writeframes(b'\0' * 88200)
                    position += 1
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(wav), '-c:a', 'libmp3lame',
                        '-b:a', '128k', str(DOCS / 'legacy-delivery-comparison.mp3')], check=True)
    save(DOCS / 'legacy-delivery-timeline.json', dict(duration_sec=round(position, 3), records=timeline))
    lines = ['# Дополнительные ориентиры: старый пульт и резерв', '',
             'Сначала пять старых записей, затем две принятые новые для сравнения. '
             'Новой генерации нет. Ориентиры относятся к подаче; старые оценки содержания сохраняются.', '',
             '| Начало | Источник | Текст |', '|---|---|---|']
    for row in timeline:
        seconds = int(row['start'])
        lines.append(f"| {seconds//60}:{seconds%60:02} | {row['label']} | {row['text']} |")
    (DOCS / 'legacy-delivery-comparison.md').write_text('\n'.join(lines)+'\n')
    cards = ''.join('<article><h2>'+html.escape(row['label'])+'</h2><p>'+html.escape(row['text'])+
                    '</p><audio controls preload="none" src="../../../'+html.escape(row['file'])+'"></audio></article>' for row in timeline)
    (DOCS / 'legacy-delivery-references.html').write_text(
        '<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        '<title>Старые ориентиры подачи Винки</title><style>body{font:17px system-ui;background:#141925;color:#eef1ff;margin:24px auto;max-width:850px;padding:16px}article{padding:16px;margin:20px 0;background:#252d42;border-radius:12px}p{line-height:1.5}audio{width:100%}</style>'
        '<h1>Старый пульт и резерв: ориентиры подачи</h1><p>Пять старых записей и две принятые новые для сравнения. Это архивные образцы подачи; их тексты не получили нового разрешения на эфир.</p>'
        '<audio controls preload="none" src="legacy-delivery-comparison.mp3"></audio>'+cards+'</html>')
    print(json.dumps(dict(panel_buttons=len(scenario['quick_replies']), panel_variants=len(inventory),
                          cached_matches=sum(r['file'] is not None for r in inventory), reserve_records=len(reserve_inventory),
                          archived_references=len(chosen), comparison_sec=round(position, 3))))


if __name__ == '__main__':
    build()
