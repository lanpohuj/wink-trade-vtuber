"""Read-only live connector probe. Stores counts, never viewer text or names."""
from __future__ import annotations
import argparse, json, logging, threading, time
from pathlib import Path
from winky.tiktok import TikTokConnector


def probe(channel: str, seconds: int) -> dict:
    started=time.monotonic();terminal=threading.Event();states=[]
    counts={'comments':0,'joins':0,'gifts':0,'follows':0,'likes':0}
    comment_times=[]
    def status(state, detail):
        reason='offline' if 'offline' in detail.lower() else 'signature_limit' if 'подпис' in detail.lower() else 'not_found' if 'не найден' in detail.lower() else 'age_restricted' if '18+' in detail else 'connection_error' if state=='error' else ''
        states.append({'state':state,'reason':reason,'at_sec':round(time.monotonic()-started,2)})
        print('TikTok',state,reason,flush=True)
        if state in ('offline','error'):terminal.set()
    def comment(_user,_text):
        counts['comments']+=1;comment_times.append(round(time.monotonic()-started,2))
    client=TikTokConnector(channel,comment,lambda _:counts.__setitem__('joins',counts['joins']+1),lambda _u,_g:counts.__setitem__('gifts',counts['gifts']+1),status,
        on_follow=lambda _:counts.__setitem__('follows',counts['follows']+1),on_like=lambda _u,n:counts.__setitem__('likes',counts['likes']+n))
    client.start()
    try:
        terminal.wait(seconds)
    finally:
        client.stop();client._thread.join(timeout=8)
    return {'channel':channel,'states':states,'received_event_counts':counts,'comment_event_times_sec':comment_times,'connector_thread_stopped':not client._thread.is_alive(),'messages_sent_to_tiktok':0,'voice_reply_verified':False}

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('channel');parser.add_argument('--seconds',type=int,default=30);parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args();logging.disable(logging.CRITICAL)
    result=probe(args.channel,min(60,max(5,args.seconds)));args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(result,ensure_ascii=False))
