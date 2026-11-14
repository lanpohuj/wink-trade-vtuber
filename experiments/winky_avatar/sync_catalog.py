"""Read-only source catalog for the isolated avatar. Never imports the application."""
from __future__ import annotations

import ast
import hashlib
import re
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]


def fingerprint(text):
    text = re.sub(r'^\[[a-z_]+\]\s*', '', str(text), flags=re.I)
    return ' '.join(text.lower().split())


def literal_assignments(path):
    tree = ast.parse(path.read_text())
    for node in ast.walk(tree):
        if isinstance(node, ast.Assign):
            targets, value = node.targets, node.value
        elif isinstance(node, ast.AnnAssign):
            targets, value = [node.target], node.value
        else:
            continue
        for target in targets:
            if not isinstance(target, ast.Name):
                continue
            try:
                yield target.id, ast.literal_eval(value), node.lineno
            except (ValueError, TypeError):
                pass


def compat_phrases():
    """Legacy avatar bridge pools, including f-strings kept as templates."""
    tree=ast.parse((ROOT / 'winky/app.py').read_text())
    def text_value(node):
        if isinstance(node,ast.Constant) and isinstance(node.value,str):return node.value
        if isinstance(node,ast.JoinedStr):
            return ''.join(part.value if isinstance(part,ast.Constant) else '{'+ast.unparse(part.value)+'}' for part in node.values)
        return None
    aliases={'win':'TRADE_WIN','loss_step1':'TRADE_LOSS','loss_step2':'TRADE_LOSS',
             'flat_skip':'WEAK_SIGNAL_SWITCH_PAIR','ask_chat':'NARRATE_ENGAGE',
             'start_analysis':'ANALYZING_CHART','switch_pair':'PAIR_SWITCHED_NEW_SCAN'}
    def visit(nodes,category,lang='ru'):
        for node in nodes:
            if isinstance(node,ast.If):
                test=ast.unparse(node.test)
                yes_category,no_category,yes_lang,no_lang=category,category,lang,lang
                if test.startswith('event_type == '):
                    yes_category=aliases.get(ast.literal_eval(node.test.comparators[0]),category)
                if test=="lang == 'en'":yes_lang,no_lang='en','ru'
                if test=='is_buy':yes_category,no_category='OPEN_TRADE_CALL','OPEN_TRADE_PUT'
                yield from visit(node.body,yes_category,yes_lang)
                yield from visit(node.orelse,no_category,no_lang)
            elif isinstance(node,ast.Assign) and isinstance(node.value,ast.List):
                name=next((t.id for t in node.targets if isinstance(t,ast.Name)),'')
                if name not in ['phrases','phrases_ru','phrases_en']:continue
                language='en' if name.endswith('_en') else 'ru' if name.endswith('_ru') else lang
                for item in node.value.elts:
                    value=text_value(item)
                    if value:yield value,category,language,item.lineno
    for node in ast.walk(tree):
        if isinstance(node,ast.FunctionDef) and node.name in ['on_signal_result','handle_trading_event']:
            yield from visit(node.body,'SIGNAL_ANNOUNCEMENT' if node.name=='on_signal_result' else 'TRADE_EVENT')


def build_catalog(recordings):
    rows = [dict(r, source='recording') for r in recordings]
    matches = {(r['lang'],fingerprint(r['text'])): r for r in recordings}

    def add(text, *, source, route, lang, category='CHAT_REPLY', emotion='happy', intent='', chat_kind='', line=0):
        if not isinstance(text, str) or not text.strip():
            return
        identity = f'{source}:{route}:{lang}:{len(rows)}'
        recording = matches.get((lang,fingerprint(text)))
        row = dict(id=identity, text=text, lang=lang, category=category, emotion=emotion,
                   intent=intent, chat_kind=chat_kind, source=source, route=route,
                   source_line=line, duration=recording['duration'] if recording else 5,
                   audio=recording['audio'] if recording else None,
                   playback='existing_recording' if recording else 'visual_only_no_synthesis')
        rows.append(row)

    data = yaml.safe_load((ROOT / 'winky/scenarios.yaml').read_text()) or {}
    quick_intents = {'greeting':'greeting','how_to_use':'bot','cta_bio':'bot','balance_info':'bot','about_stream':'strategy',
                     'skeptics_reply':'skeptic','thanks_likes':'thanks','smart_pace':'gambler',
                     'ask_in_chat':'engage','ask_chat_pair':'pair_request'}
    category_aliases = {'trade_win':'TRADE_WIN','green_streak':'TRADE_WIN',
                        'trade_loss_step1':'TRADE_LOSS','trade_loss_step2':'TRADE_LOSS',
                        'flat_skip':'WEAK_SIGNAL_SWITCH_PAIR'}
    for row in data.get('quick_replies', []):
        for lang in ['ru', 'en']:
            for text in row.get('texts_' + lang, []):
                add(text, source='scenario', route='quick_' + row['id'], lang=lang,
                    emotion=row.get('emotion','happy'), intent=quick_intents.get(row['id'], ''),
                    category=category_aliases.get(row['id'],'QUICK_REPLY'))
    for row in data.get('keyword_replies', []):
        intent = {'kw_hello':'greeting','kw_scam':'skeptic','kw_analytics':'strategy'}.get(row['id'],'bot')
        for lang in ['ru','en']:
            add(row.get('text_' + lang,''), source='keyword', route=row['id'], lang=lang,
                emotion=row.get('emotion','happy'), intent=intent)
    for key, kind in [('greetings','join'),('follows','follow'),('gift_thanks','gift'),('likes','like'),('fallbacks','fallback')]:
        for lang, pool in (data.get(key) or {}).items():
            for text in pool:
                add(text, source='scenario_social', route=key, lang=lang, chat_kind=kind)
    for key, pool in (data.get('cta') or {}).items():
        if isinstance(pool,list):
            for text in pool:
                add(text,source='scenario_cta',route=key,lang='en' if key.endswith('_en') else 'ru',
                    category='NARRATE_ENGAGE' if key.startswith('warmup') else 'NARRATE_CTA')
    social = {'JOIN_PHRASES':'join','FOLLOW_PHRASES':'follow','GIFT_PHRASES':'gift','LIKE_PHRASES':'like','FILLERS':'question'}
    for name, value, line in literal_assignments(ROOT / 'winky/chat_router.py'):
        prefix = name.rsplit('_',1)[0]
        if prefix not in social or not isinstance(value,list):
            continue
        for text in value:
            add(text, source='router_fallback', route=name, lang='en' if name.endswith('_EN') else 'ru',
                chat_kind=social[prefix], emotion='thinking' if prefix=='FILLERS' else 'happy', line=line)
    for name, value, line in literal_assignments(ROOT / 'winky/chat_style.py'):
        if name != 'POOLS' or not isinstance(value,dict):
            continue
        for intent, pool in value.items():
            for pair in pool.strip().splitlines():
                parts=pair.split(' | ')
                for lang, text in zip(['ru','en'],parts):
                    add('[wink] ' + text.strip(),source='local_reply',route='local_'+intent,
                        lang=lang,intent=intent,line=line)
    for name, value, line in literal_assignments(ROOT / 'winky/scenarios.py'):
        if name != 'STREAM_VOICE_BANK' or not isinstance(value,dict):
            continue
        for lang, categories in value.items():
            for key, pool in categories.items():
                if key.startswith('buy_') or key=='open_trade_call': category='OPEN_TRADE_CALL'
                elif key.startswith('sell_') or key=='open_trade_put': category='OPEN_TRADE_PUT'
                else: category={'trade_win':'TRADE_WIN','trade_loss':'TRADE_LOSS','flat_skip':'WEAK_SIGNAL_SWITCH_PAIR'}.get(key,key.upper())
                for text in pool:
                    add(text,source='legacy_scenario_text',route=key,lang=lang,category=category,line=line)

    for text,category,lang,line in compat_phrases():
        add(text,source='app_compat_text',route=category.lower(),lang=lang,category=category,line=line)

    contracts = [
        ('join','CHAT_REACTION','join','greeting'),('follow','CHAT_REACTION','follow','thanks'),
        ('gift','CHAT_REACTION','gift','thanks'),('like','CHAT_REACTION','like','thanks'),
        ('pair_request','CHAT_REPLY','','pair_request'),('llm_reply','CHAT_REPLY','','general'),
        ('llm_fallback','CHAT_REPLY','','general'),('manual','MANUAL','','general'),
        ('signal_announcement','SIGNAL_ANNOUNCEMENT','','general'),('trade_event','TRADE_EVENT','','general'),
        ('quick_reply','QUICK_REPLY','','general'),('keyword_reply','CHAT_REPLY','','general'),
    ]
    routes = [dict(id=name, category=category,chat_kind=kind,intent=intent) for name,category,kind,intent in contracts]
    source_hashes={p:hashlib.sha256((ROOT / p).read_bytes()).hexdigest() for p in [
        'winky/scenarios.yaml','winky/scenarios.py','winky/chat_router.py','winky/chat_style.py','winky/deepseek.py','winky/director.py','winky/app.py','winky/tts.py']}
    return dict(rows=rows,routes=routes,source_sha256=source_hashes,
                note='Static templates without an active recording are visual-only; this catalog never changes voice eligibility or generates speech.')
