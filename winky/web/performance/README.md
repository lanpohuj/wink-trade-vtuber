# Released avatar speech adapter

This is the packaged runtime snapshot of approved motions developed in
`experiments/winky_avatar`, plus the live metadata bridge. `release.json`
records file hashes. The original `../avatar.js` stays unchanged.

Develop new gestures in the isolated laboratory. Only publish an explicitly
reviewed snapshot here after its visual and speech-clock checks pass.
The native bootstrap uses `installPerformance` and the afplay begin/clock/end
contract; this package has no dependency on the laboratory server or its iframe.

Trade decisions and TikTok transport are not implemented in this package.

`framing.mjs` protects the portrait's arms and head using the posed skin;
`idle.mjs` selects silent contextual activities and yields to every speech ID.
The native context message is read-only. The original idle action loop stays
suppressed. The panel's optional idle toggle can disable the new scheduler.
