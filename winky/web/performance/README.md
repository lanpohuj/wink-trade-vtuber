# Released avatar speech adapter

This is the packaged runtime snapshot of approved motions developed in
`experiments/winky_avatar`, plus the live metadata bridge. `release.json`
records file hashes. The original `../avatar.js` stays unchanged.

Develop new gestures in the isolated laboratory. Only publish an explicitly
reviewed snapshot here after its visual and speech-clock checks pass.
The native bootstrap uses `installPerformance` and the afplay begin/clock/end
contract; this package has no dependency on the laboratory server or its iframe.

Trade decisions and TikTok transport are not implemented in this package.

`framing.mjs` preserves the old 600x720 portrait density in a larger transparent
1000x920 native surface. An off-axis frustum adds space above and at the sides;
it does not shrink the character to fit every pose in the old viewport. Camera
and model scale stay constant through all gestures;
`idle.mjs` selects silent contextual activities and yields to every speech ID.
The native context message is read-only. The original idle action loop stays
suppressed. The panel's optional idle toggle can disable the new scheduler.

`celebration.mjs` consumes fresh, confirmed WIN facts from the existing received
trade context, independently of the audio queue. Five reactions form a shuffled
bag, with no repetition within a round or across its boundary. The same session
and closed-trade sequence deduplicates heartbeat and delayed voice events.
`victory-motions.mjs` and `victory-poses.mjs` use continuous asymmetric arm paths,
forearm pronation with neutral wrists, short hops and planted-foot leg IK. They do
not generate speech, interrupt afplay, change result calculation or send orders.
Development/review remains in the lab; `tools/package_avatar_performance.py`
copies the reviewed snapshot and updates its hashes.
