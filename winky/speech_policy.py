"""Playback-boundary arbitration. Selection never consumes a turn."""
from collections import OrderedDict


RESULT_CATEGORIES = frozenset(('TRADE_WIN', 'TRADE_LOSS', 'TRADE_REFUND'))
SOCIAL_KINDS = frozenset(('gift', 'follow', 'like', 'join'))


def speech_kind(item):
    if item.event.get('category') in RESULT_CATEGORIES:
        return 'result'
    if item.event.get('chat_kind') in SOCIAL_KINDS:
        return 'social'
    return 'reply' if item.priority == 3 else 'other'


def viewer_key(item):
    return str(item.event.get('viewer_key') or getattr(item.chat_item, 'user_key', '') or item.source)


class SpeechArbiter:
    def __init__(self):
        self.last_kind = 'other'
        self.interlude_used = True
        self.viewers = OrderedDict()

    def choose(self, ready):
        """At most one result/thanks between ready conversational answers."""
        replies = [i for i in ready if speech_kind(i) == 'reply']
        results = [i for i in ready if speech_kind(i) == 'result']
        socials = [i for i in ready if speech_kind(i) == 'social']
        if replies:
            if not self.interlude_used and self.last_kind == 'reply':
                if results:
                    return min(results, key=lambda i: i.created_at), 'fresh_result_between_answers'
                if socials:
                    return min(socials, key=self.social_rank), 'thanks_between_answers'
            chosen = min(replies, key=lambda i: (self.viewers.get(viewer_key(i), float('-inf')), i.created_at))
            return chosen, 'current_chat_fair_turn'
        if results:
            return min(results, key=lambda i: i.created_at), 'confirmed_result'
        if socials:
            return min(socials, key=self.social_rank), 'real_social_event'
        return min(ready, key=lambda i: (i.priority, i.created_at)), 'eligible_event'

    @staticmethod
    def social_rank(item):
        return ({'gift': 0, 'follow': 1, 'like': 2, 'join': 3}.get(item.event.get('chat_kind'), 4), item.created_at)

    def started(self, item, now):
        kind = speech_kind(item)
        if kind == 'reply':
            key = viewer_key(item)
            self.viewers.pop(key, None)
            self.viewers[key] = now
            if len(self.viewers) > 512:
                self.viewers.popitem(last=False)
            self.interlude_used = False
        elif kind in ('result', 'social'):
            self.interlude_used = True
        self.last_kind = kind
