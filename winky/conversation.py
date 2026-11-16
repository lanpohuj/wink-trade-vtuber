"""Small, playback-driven episode state. No trading decisions live here."""
from dataclasses import dataclass, field


@dataclass
class Conversation:
    dialogue_until: float = 0
    last_comment_at: float = 0
    last_hook_at: float | None = None
    last_search_at: float = -1e12
    spoken_episodes: dict = field(default_factory=dict)

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
