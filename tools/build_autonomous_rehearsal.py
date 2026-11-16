"""Build a staged six-minute review from existing MP3s. Never calls TTS or trades."""
import array
import hashlib
import json
import math
from pathlib import Path
import shutil
import subprocess
import sys
import wave

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from winky.editorial import approved

OUT = ROOT / 'docs/voice-audit/conversation-v1'
RATE = 24000
DURATION = 360


def build():
    ffmpeg = shutil.which('ffmpeg')
    if not ffmpeg:
        raise RuntimeError('ffmpeg is required')
    records = {}
    for bank in ('conversation_pilot_v1', 'lively_v3'):
        folder = ROOT / 'assets/voices' / bank
        data = json.loads((folder / 'manifest.json').read_text())
        for rows in data['categories'].values():
            for row in rows:
                records[row['id']] = (folder, row)

    # Scripted comments provide context for already recorded answers. Not a live LLM demonstration.
    script = [
        (4, 'streamer2_ru_narrate_scan_01', 'NARRATE_SCAN', '', '', ''),
        (27, 'streamer2_ru_narrate_engage_18', 'NARRATE_ENGAGE', '', '', ''),
        (62, 'conversation_pilot_ru_07', 'CHAT_REPLY', 'a', 'По-моему, сейчас будет минус', 'skeptic'),
        (73, 'conversation_pilot_ru_08', 'CHAT_REPLY', 'a', '', 'joke'),
        (92, 'conversation_pilot_ru_02', 'CHAT_REPLY', 'b', 'Тебе идёт эта улыбка', 'compliment'),
        (97, 'lively3_ru_chat_reaction_012', 'CHAT_REACTION', 'c', '', 'gift'),
        (115, 'conversation_pilot_ru_09', 'CHAT_REPLY', 'a', 'Я вообще просто смотрю', 'compliment'),
        (124, 'conversation_pilot_ru_06', 'CHAT_REPLY', 'a', 'Ладно, на тебя смотрю', 'compliment'),
        (153, 'lively3_ru_narrate_cta_009', 'CHAT_REPLY', 'd', 'А где найти инструменты?', 'bot'),
        (184, 'conversation_pilot_ru_01', 'TRADE_WIN', '', '', ''),
        (219, 'lively3_ru_chat_reaction_006', 'CHAT_REACTION', 'e', '', 'follow'),
        (245, 'lively3_ru_narrate_engage_009', 'NARRATE_ENGAGE', '', '', ''),
        (340, 'lively3_ru_narrate_cta_022', 'NARRATE_CTA', '', '', '')
    ]
    scenes = [
        (0, 'Тихий чат', 'Поиск, интерес к происходящему и свободная пластика.'),
        (25, 'Приглашение к разговору', 'Один понятный вопрос. Отсутствие ответа не вызывает претензий.'),
        (58, 'Скепсис → исход → продолжение', 'Предположение зрителя становится поводом для связанного ответа.'),
        (88, 'Комплимент и подарок', 'Ответ зрителю, отдельное спасибо и возврат к разговору.'),
        (110, 'Продолжение знакомства', 'Две реплики связаны реальными словами одного участника.'),
        (149, 'Победа во время объяснения', 'Большой жест ждёт границы до пяти секунд, затем отменяется.'),
        (180, 'Короткая победная реакция', 'Свежий подтверждённый плюс: голос и заметное движение.'),
        (215, 'Подписка', 'Короткое спасибо по событию, без приветствия каждого входящего.'),
        (240, 'Свободная пауза', 'Разговорная подача и заметные действия. Новую тишину не заполняем автоматически.'),
        (335, 'Напоминание о боте', 'Больше трёх минут после ответа о доступе, в свободный момент.')
    ]
    context_events = [
        {'at': 0, 'phase': 'ANALYZING'},
        {'at': 58, 'phase': 'IN_TRADE', 'remaining_sec': 14},
        {'at': 72, 'phase': 'RESULT', 'result': 'WIN', 'seq': 1},
        {'at': 84, 'phase': 'ANALYZING'},
        {'at': 149, 'phase': 'IN_TRADE', 'remaining_sec': 4.2},
        {'at': 153.2, 'phase': 'RESULT', 'result': 'WIN', 'seq': 2},
        {'at': 166, 'phase': 'ANALYZING'},
        {'at': 180, 'phase': 'IN_TRADE', 'remaining_sec': 3},
        {'at': 183, 'phase': 'RESULT', 'result': 'WIN', 'seq': 3},
        {'at': 199, 'phase': 'ANALYZING'},
        {'at': 260, 'phase': 'IDLE'}
    ]
    samples = array.array('h', [0]) * (DURATION * RATE)
    clips, previous_end = [], 0
    for index, (at, identity, category, viewer, comment, intent) in enumerate(script):
        folder, row = records[identity]
        path = (folder / row['file']).resolve()
        if not path.is_relative_to(folder.resolve()) or not approved(row['text']):
            raise RuntimeError(f'Unapproved text or path: {identity}')
        owner_listened = identity.startswith('conversation_pilot_')
        if owner_listened and (row.get('status') != 'ready' or row.get('auditory_verified') is not True):
            raise RuntimeError(f'Unaccepted pilot: {identity}')
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if row.get('sha256') and digest != row['sha256']:
            raise RuntimeError(f'Audio changed: {identity}')
        raw = subprocess.check_output([ffmpeg, '-v', 'error', '-i', str(path), '-f', 's16le', '-ac', '1', '-ar', str(RATE), '-'])
        pcm = array.array('h'); pcm.frombytes(raw)
        if sys.byteorder != 'little':
            pcm.byteswap()
        length = len(pcm) / RATE
        if at < previous_end or at + length > DURATION:
            raise RuntimeError('Overlapping or out-of-range audio')
        previous_end = at + length
        begin = round(at * RATE); samples[begin:begin+len(pcm)] = pcm
        rms = [math.sqrt(sum(s*s for s in pcm[i:i+1200]) / len(pcm[i:i+1200])) / 32768 for i in range(0,len(pcm),1200)]
        peak = max(rms) or 1
        rms = [0 if r/peak < .18 else round(min(1, ((r/peak-.18)/.82)**1.2*1.15),3) for r in rms]
        event = dict(id=f'rehearsal-{index}',category=category,text=row['text'],duration=length,
                     movement_mode='vivid',viewer_key=viewer,comment=comment,intent=intent,lang='ru',source='rehearsal',created_at=at)
        if category == 'CHAT_REACTION':
            event['chat_kind'] = intent
        if intent == 'bot':
            event['max_duration_sec'] = 25
        if category == 'TRADE_WIN':
            event.update(session_id='rehearsal',trade_seq=3)
        if category == 'NARRATE_ENGAGE':
            event['purpose'] = 'moment_question'
        if identity == 'conversation_pilot_ru_01':
            event['performance'] = dict(timing_review='draft',beats=[dict(start=.10,duration=2.6,gesture='joy')])
        clips.append(dict(at=at,id=identity,audio_path=path.relative_to(ROOT).as_posix(),sha256=digest,
                          duration=length,owner_listened=owner_listened,
                          audio_status='owner_per_recording' if owner_listened else 'historical_text_approved_preview_only',
                          event=event,rms=rms))
    payload = dict(version=1,duration_sec=DURATION,fps=24,staged=True,live_llm=False,
                   generated_audio=False,background_music=False,
                   note='Постановочная проверка на реальной модели и существующих MP3; не живой TikTok или Pocket. Фоновая музыка не добавлена. Старые записи не становятся принятым новым банком.',
                   clips=clips,context_events=context_events,
                   scenes=[dict(at=at,title=title,description=description) for at,title,description in scenes])
    (OUT / 'autonomous-rehearsal-timeline.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n')
    target = ROOT / 'artifacts/winky-autonomous'; target.mkdir(parents=True,exist_ok=True)
    if sys.byteorder != 'little':
        samples.byteswap()
    with wave.open(str(target/'rehearsal-audio.wav'),'wb') as out:
        out.setparams((1,2,RATE,0,'NONE','not compressed')); out.writeframes(samples.tobytes())
    print(json.dumps(dict(clips=len(clips),duration_sec=DURATION,new_tts_requests=0),ensure_ascii=False))


if __name__ == '__main__':
    build()
