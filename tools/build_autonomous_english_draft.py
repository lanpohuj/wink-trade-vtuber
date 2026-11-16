"""English adaptation of the accepted Russian scope. No text approval or TTS purchase."""
import hashlib
import json
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from tools.autonomous_voice_probe import DOCS,save

VENTI='e34c486929524d41b88646b4ac2f382f'
LINES={
 'win':[
  'Yes! Ooh, that felt good!','Yesss! I like that!','Got it! Give me a second to enjoy that.',
  'Oh, that feels good!','Well, look at that. I’m happy now.','Ah, yes! Lovely!',
  'Yes! This is why I like watching.','A win. Mm, nice.','Phew. I can breathe again.',
  'Yes! I was getting nervous there.','Now I can smile!','Yesss! We got that one.'],
 'loss':[
  'A loss… I really don’t like that.','Oh, no…','Ah. That’s disappointing.','Ahh, that’s annoying!',
  'Ugh… That upset me.','A loss. Yeah, that stings.','Okay… give me a second.',
  'Ouch… that’s disappointing.','Shame. I wanted a different ending.','Ugh… yeah, I’m annoyed.',
  'Oh. Okay, taking a breath.','Oh, great… A loss. Yeah, that’s annoying. Moving to the next stake.'],
 'refund':[
  'Oh, it came back. Well, at least there’s that.','Okay, a refund. I can breathe.',
  'A tie. Okay, it happens.','Phew, nothing lost.','Well… call it even.','A refund. I was already getting tense.'],
 'search_interest':[
  'Okay, what have we got? Let me check a couple of timeframes. I want to see if there’s a move here.',
  'Oh, wait… now that’s interesting.','Mm… nothing’s caught my eye yet.','One second… I want a closer look.'],
 'observation':['Oh, now it’s moving!','Come on… just a little more.'],
 'social':[
  'Oh, thank you! That means a lot.','Whoa! That’s a surprise. Thank you!',
  'Ah, thank you! You caught me off guard.','That’s sweet… thanks for spoiling me.',
  'Oh, you’re sticking around! Hey, hey.','Thanks for the follow! Get comfy.',
  'Okay, now you’re with us. I’m glad!','Oh, someone new! Glad you’re here.',
  'Oh, look at all those hearts! Thank you!','I see your hearts. That’s sweet.',
  'Thanks for the love! Here’s a heart for you.','Okay, now I’m smiling. Thank you, everyone!'],
 'bot':[
  'If you want to explore the tools, start with the bot in my bio. It walks you through the steps.',
  'The bot explains access. It’s linked in my bio. If a step is confusing, tell me which one.',
  'By the way, the bot is linked in my bio. You can check the access requirements there.',
  'A little reminder: the bot link is in my bio.','You can check how access works in the bot. Link’s in my bio.',
  'The tools are linked in my bio, through the bot.','If you need the setup steps, they’re in the bot linked in my bio.',
  'The bot’s in my bio. You can take a look; I’ll be here.'],
 'chat_greeting':[
  'Hey, hey! Oh, good to see you.','Oh, hi! Perfect timing.','Hey! Come hang out.',
  'Hey there! Okay, now we can chat.','Hi! I see you.','Hey! What’s been the best part of your day?',
  'Hi! I’m glad you said something.','Hey, hey. Make yourself comfortable. I’m here.']}
DIRECTIONS={'Открыла вверх.':'Opened up.','Зашла вверх.':'I’m in, up.',
            'Открыла вниз.':'Opened down.','Зашла вниз.':'I’m in, down.'}


def build():
    source=DOCS/'autonomous-bank-ru-approved.json';rows=[]
    for ru in json.loads(source.read_text())['records']:
        purpose=ru['purpose']
        if purpose.startswith('direction_'):text=DIRECTIONS[ru['text']]
        else:text=LINES[purpose][int(ru['id'].rsplit('_',1)[1])-1]
        row={**ru,'id':ru['id'].replace('_ru_','_en_'),'source_ru_id':ru['id'],'source_ru_text':ru['text'],
             'source_ru_text_sha256':ru['text_sha256'],'lang':'en','voice_id':VENTI,'text':text,
             'text_sha256':hashlib.sha256(text.encode()).hexdigest(),'status':'draft',
             'text_review_accepted':False,'auditory_verified':False,'scene_review_accepted':False,
             'semantic_group':'en:'+purpose,'owner_text_decision_source':'pending_english_adaptation_review'}
        row.pop('existing_audio',None);rows.append(row)
    save(DOCS/'autonomous-bank-en-draft.json',dict(version=1,lang='en',activated=False,paid_generation_authorized=False,
        source_ru_catalog_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),records=rows,
        counts=dict(cards=len(rows),distinct_texts=len({r['text'] for r in rows})),
        note='Adapted conversational English; conditions match the Russian bank. Text and audio remain unapproved.'))
    lines=['# Винки: английская адаптация принятого состава','',
           '76 карточек / 68 разных текстов. Это черновик, без автоматического одобрения и без генерации аудио. Голос для будущей EN-озвучки — Venti. Условия уместности и ограничения совпадают с RU; четыре отклонённых вопроса не возвращаются.','',
           '| ID | Русский источник | Английская адаптация |','|---|---|---|']
    for r in rows:lines.append(f"| {r['id']} | {r['source_ru_text']} | {r['text']} |")
    (DOCS/'autonomous-bank-en-draft.md').write_text('\n'.join(lines)+'\n')
    print(json.dumps(dict(cards=len(rows),unique_texts=len({r['text'] for r in rows}),approved=False,tts_requests=0)))


if __name__=='__main__':build()
