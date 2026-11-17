import unittest
from winky.chat_style import reply_pool


class AccessFallbackTests(unittest.TestCase):
    def test_identity_skepticism_and_guarantees_do_not_trigger_access_advertising(self):
        for message in ('Ты бот?', 'ты тупой ии бот', 'Это бот?', 'Are you a bot?', 'You are an AI bot',
                        'это скам, где твоя ссылка', 'бот гарантирует прибыль?', 'fake bot link'):
            with self.subTest(message=message):
                key,pool=reply_pool(message)
                self.assertFalse(key.endswith(':bot'));self.assertEqual(pool,[])

    def test_direct_access_requests_keep_the_approved_specific_fallback(self):
        for message in ('Где бот?', 'Дай ссылку', 'Как получить доступ?', 'Бот для сигналов где?',
                        'where is the bot?', 'bot link?', 'How do I get access?'):
            with self.subTest(message=message):
                key,pool=reply_pool(message)
                self.assertTrue(key.endswith(':bot'))
                self.assertTrue(pool)

    def test_a_bare_bot_keyword_does_not_invent_a_question_about_access(self):
        self.assertEqual(reply_pool('бот')[1],[])
        self.assertEqual(reply_pool('bot')[1],[])
