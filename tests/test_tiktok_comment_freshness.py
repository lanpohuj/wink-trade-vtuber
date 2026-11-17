from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch

from winky.tiktok import TikTokConnector


class TikTokFreshnessTests(unittest.TestCase):
    def setUp(self):
        self.connector = TikTokConnector('test', Mock(), Mock(), Mock(), Mock())
        self.connector._connected_since = 1800000000

    def message(self, identity='a', created=1800000001000, room='room'):
        return SimpleNamespace(common=SimpleNamespace(msg_id=identity, create_time=created, room_id=room))

    def accept(self, event):
        with patch('winky.tiktok.time.time', return_value=1800000002):
            return self.connector._accept_comment(event)

    def test_same_message_id_is_delivered_once_even_after_reconnect(self):
        event = self.message()
        self.assertTrue(self.accept(event))
        self.connector._connected_since = 1800000002
        self.assertFalse(self.accept(event))
        self.assertEqual(self.connector.comment_counts, dict(received=2, delivered=1, duplicate=1))

    def test_repeated_words_with_new_ids_and_ids_in_different_rooms_are_valid(self):
        self.assertTrue(self.accept(self.message()))
        self.assertTrue(self.accept(self.message('b')))
        self.assertTrue(self.accept(self.message(room='other')))

    def test_initial_history_and_stale_messages_do_not_reach_the_brain(self):
        self.assertFalse(self.accept(self.message('history', created=1799999990000)))
        self.connector._connected_since = 0
        self.assertFalse(self.accept(self.message('stale', created=1799999970000)))
        self.assertEqual(self.connector.comment_counts['history_or_stale'], 2)

    def test_seconds_milliseconds_and_missing_metadata_remain_compatible(self):
        self.assertTrue(self.accept(self.message('seconds', created=1800000001)))
        self.assertTrue(self.accept(self.message('millis', created=1800000001000)))
        self.assertTrue(self.accept(SimpleNamespace()))
        self.assertTrue(self.accept(SimpleNamespace()))

    def test_message_history_is_bounded(self):
        for number in range(2100):
            self.assertTrue(self.accept(self.message(str(number))))
        self.assertEqual(len(self.connector._seen_comments), 2048)
