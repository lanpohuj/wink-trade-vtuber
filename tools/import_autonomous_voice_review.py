"""Import quality verdicts for evaluation-only audio; never enables it for the stream."""
import argparse
import json
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from tools.autonomous_voice_probe import FREE_BANK, DOCS
from tools.import_conversation_voice_review import import_review

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('review',type=Path);args=parser.parse_args()
    print(json.dumps(import_review(args.review,bank=FREE_BANK,docs=DOCS,
                                  kind='autonomous_voice_probe_delivery_review',review_filename='owner-autonomous-voice-review.json')))
