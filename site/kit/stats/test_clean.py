import os
import sys
import unittest

os.environ.setdefault("CARLOMITCHENER_BUCKET", "test")
os.environ.setdefault("STATS_FUNCTIONS", "one,two")
os.environ.setdefault("STATS_KEY", "stats.json")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from handler import clean

DIRTY = "sync PUT https://api.printful.com/sync/variant/5511431634?api_key=sk_live_9f3 200 Authorization: Bearer shpat_0123 " + "x" * 300

class Clean(unittest.TestCase):

    def test_clean_strips_urls_and_credentials_and_clips_to_160(self):
        out = clean(DIRTY)
        self.assertEqual(len(out), 160)
        self.assertIn("<url>", out)
        self.assertNotIn("http", out)
        self.assertNotIn("sk_live_9f3", out)
        self.assertNotIn("shpat_0123", out)

if __name__ == "__main__":
    unittest.main()
