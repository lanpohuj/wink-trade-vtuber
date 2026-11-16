"""Small, playback-driven episode state. No trading decisions live here."""
from dataclasses import dataclass, field
from collections import deque


@dataclass
class Conversation:
    dialogue_until: float = 0
    last_comment_at: float = 0
    last_hook_at: float | None = None
    last_search_at: float = -1e12
    spoken_episodes: dict = field(default_factory=dict)
    turns: deque = field(default_factory=lambda: deque(maxlen=48))
    current_viewer: str = ''
    interrupted_by: str = ''

    def comment(self, now):
        self.last_comment_at = now
        self.dialogue_until = now + 20

    def active(self, now):
        return now < self.dialogue_until

    def hook_due(self, now):
        if self.last_hook_at is None:
            return True
        answered = self.last_comment_at > self.last_hook_at
        return now - self.last_hook_at >= (60 if answered else 120)

    def started(self, event, now):
        purpose = event.get('purpose')
        if event.get('category') == 'CHAT_REPLY':
            self.dialogue_until = now + event.get('duration_sec', 15) + 20
            key = event.get('viewer_key', '')
            if key and event.get('comment') and event.get('text'):
                self.turns.append(dict(viewer_key=key, comment=event['comment'],
                                       reply=event['text'], spoken_at=now))
                self.current_viewer = key
                self.interrupted_by = ''
        elif self.active(now) and (event.get('category') in ('TRADE_WIN', 'TRADE_LOSS', 'TRADE_REFUND')
                                  or event.get('chat_kind') in ('gift', 'follow')):
            self.interrupted_by = event.get('chat_kind') or event.get('category')
        if purpose == 'moment_question':
            self.last_hook_at = now
        if purpose == 'search_interest':
            self.last_search_at = now
        if event.get('episode_key'):
            self.spoken_episodes[event['episode_key']] = now
            if len(self.spoken_episodes) > 512:
                oldest = min(self.spoken_episodes, key=self.spoken_episodes.get)
                del self.spoken_episodes[oldest]

    def permits(self, event, now):
        if event.get('episode_key') in self.spoken_episodes:
            return False
        if event.get('purpose') == 'moment_question':
            return self.hook_due(now)
        if event.get('purpose') == 'search_interest':
            return now - self.last_search_at >= 90
        return True

    def context(self, viewer_key, now):
        """Only this viewer's actually spoken turns; no pending replies as memory."""
        turns = [dict(t) for t in self.turns if t['viewer_key'] == viewer_key and 0 <= now - t['spoken_at'] <= 7200]
        return {'spoken_turns': turns[-4:],
                'interrupted_by': self.interrupted_by if viewer_key == self.current_viewer and self.active(now) else ''}
