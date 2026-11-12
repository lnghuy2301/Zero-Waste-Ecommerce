import os
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.error import URLError

import api_chatbot


class EcoBotTests(unittest.TestCase):
    def setUp(self):
        self.client = api_chatbot.app.test_client()
        self.env = patch.dict(os.environ, {'GROQ_API_KEY': ''})
        self.env.start()

    def tearDown(self):
        self.env.stop()

    def test_health(self):
        self.assertEqual(self.client.get('/health').json['status'], 'ok')

    def test_invalid_questions(self):
        for data in [None, [], {}, {'question': None}, {'question': 123}, {'question': '  '}, {'question': 'x' * 1001}]:
            with self.subTest(data=type(data).__name__):
                result = self.client.post('/api/chat', json=data)
                self.assertEqual(result.status_code, 400)

    def test_greeting_without_key(self):
        result = self.client.post('/api/chat', json={'question': 'Xin chào!'})
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json['mode'], 'local')

    def test_product_search_without_accents(self):
        result = self.client.post('/api/chat', json={'question': 'ban chai tre'})
        self.assertIn('Bàn chải tre', result.json['response'])
        self.assertTrue(result.json['image_url'].startswith('/images/demo/'))

    def test_shipping_policy(self):
        result = self.client.post('/api/chat', json={'question': 'phí giao hàng'})
        self.assertIn('30.000đ', result.json['response'])

    def test_unknown_answer_does_not_invent_product(self):
        result = self.client.post('/api/chat', json={'question': 'zxqv98324'})
        self.assertIn('chưa có thông tin', result.json['response'])

    def test_groq_outage_falls_back_without_exposing_error(self):
        with patch.dict(os.environ, {'GROQ_API_KEY': 'fake-test-key'}), patch('api_chatbot.urlopen', side_effect=URLError('private-upstream-detail')):
            result = self.client.post('/api/chat', json={'question': 'binh inox'})
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json['mode'], 'local')
        self.assertNotIn('private-upstream-detail', result.json['response'])

    def test_all_catalogue_images_exist(self):
        for doc in api_chatbot.load_documents():
            if doc['image']:
                path = api_chatbot.BASE_DIR.parent / 'frontend/public' / doc['image'].lstrip('/')
                self.assertTrue(path.is_file(), str(path))

    def test_large_request_is_rejected(self):
        result = self.client.post('/api/chat', data='x' * 20000, content_type='application/json')
        self.assertEqual(result.status_code, 413)


if __name__ == '__main__':
    unittest.main()
