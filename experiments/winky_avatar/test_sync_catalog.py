"""Read-only extraction and audio eligibility checks; no application imports."""
import tempfile
import unittest
from collections import Counter
from pathlib import Path

from sync_catalog import build_catalog, compat_phrases, literal_assignments


class CatalogTests(unittest.TestCase):
    def test_ast_reads_literal_and_annotated_values_without_executing(self):
        with tempfile.TemporaryDirectory() as directory:
            file=Path(directory)/'never_import.py'
            file.write_text("raise RuntimeError('must not execute')\nWORDS: dict={'ru':('hello',)}\nDYNAMIC=call()\n")
            self.assertEqual(list(literal_assignments(file)),[('WORDS',{'ru':('hello',)},2)])

    def test_all_static_sources_and_compatibility_branches_are_covered(self):
        catalog=build_catalog([])
        self.assertEqual(Counter(r['source'] for r in catalog['rows']),{
            'scenario':67,'keyword':14,'scenario_social':36,'scenario_cta':18,
            'router_fallback':61,'local_reply':104,'legacy_scenario_text':242,'app_compat_text':33,
        })
        self.assertEqual(len({r['id'] for r in catalog['rows']}),575)
        self.assertEqual(len({r['id'] for r in catalog['routes']}),12)
        self.assertTrue(all(r['audio'] is None and r['playback']=='visual_only_no_synthesis' for r in catalog['rows']))
        compat=list(compat_phrases())
        for category,count in [('OPEN_TRADE_CALL',4),('OPEN_TRADE_PUT',4),('TRADE_LOSS',6),('TRADE_WIN',5)]:
            self.assertEqual(sum(r[1]==category for r in compat),count)
        self.assertTrue(any('{pair}' in r[0] for r in compat))

    def test_only_exact_same_language_active_recording_can_attach_audio(self):
        catalog=build_catalog([])
        text=next(r['text'] for r in catalog['rows'] if r['lang']=='ru')
        recording=dict(id='test',text=text,lang='en',duration=4,audio='/audio/0')
        mismatched=build_catalog([recording])
        self.assertTrue(all(r['audio'] is None for r in mismatched['rows'] if r['source']!='recording' and r['text']==text))
        matched=build_catalog([{**recording,'lang':'ru'}])
        self.assertTrue(any(r['audio']=='/audio/0' for r in matched['rows'] if r['source']!='recording' and r['text']==text))


if __name__=='__main__':
    unittest.main()
