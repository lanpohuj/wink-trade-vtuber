# Telegram funnel hardening — 2026-11-13

The funnel grants ordinary users access after attributed broker registration and cumulative confirmed USD deposits of at least $10. Admin/manual grants remain deliberate exceptions. Trading-extension code, its statistics and Winky/avatar code are unchanged.

## Receipt processing

`partner_events` is the durable event ledger. Its primary key, balance update, entitlement recalculation, raw journal and notification outbox are committed together under SQLite `BEGIN IMMEDIATE`. A failed write rolls back all effects. Parallel distinct payments cannot lose updates; duplicate deliveries cannot repeat a payment. Values are validated as exact positive USD cents.

Trader identity conflicts are quarantined without credit. Unattributed Trader IDs cannot be claimed by merely knowing the account number. Attributed events that arrive before `/start` remain pending and are reconciled when that Telegram user appears. A late registration also rechecks entitlement. Existing users, point totals, history and manual access are preserved; new ledger/lease/outbox/stats tables are additive.

The API accepts GET, JSON POST and form POST at `/api/postback`, using `X-Postback-Token` or the existing query token. A deposit requires a real transaction ID, or the documented Pocket Partners event timestamp. `click_id` is attribution, never payment identity. Missing identity/invalid amounts are logged without credit; conflicting identities do not modify balances. Tokens are removed from raw receipt data and access logs.

## Pocket Partners settings

Campaign `wink`, ID `988258`, and both `/register` affiliate bases were matched against the authenticated partner cabinet. All three campaign callbacks remain enabled: registration, first deposit and repeat deposit. Callback host is the independently verified working HTTPS host `2.31.127.199.sslip.io`.

Parameters, in addition to the existing private token:

- Registration: `event=reg&sub_id1={sub_id1}&trader_id={trader_id}&event_time={date_time}`.
- First deposit: `event=dep&sub_id1={sub_id1}&trader_id={trader_id}&amount={sumdep}&event_time={date_time}&deposit_kind=first`.
- Repeat deposit: same, with `deposit_kind=repeat`.

The partner's documented macro list exposes `{date_time}` rather than a payment-ID macro. When no payment ID exists, event identity uses trader, event time, USD amount and first/repeat kind. Identical values cannot distinguish two genuinely different payments with the exact same provider timestamp; a provider transaction ID should supersede this fallback if supplied. Real timestamp stability/delivery still requires a genuine conversion; synthetic tests do not prove it.

The main domain was delegated to Namecheap contact-verification nameservers despite the correct VPS A record in its normal zone. The owner confirmed the verification email during this release. Keep callbacks and Mini App on the working hostname until public DNS/TLS checks confirm restoration. This avoids depending on registrar/cache propagation.

## API and Mini App

- All identity decisions use valid signed Telegram initData: positive integer user ID, unique fields, auth_date no more than 24 hours old and no more than 30 seconds in the future. Adjust the maximum using `WEBAPP_AUTH_MAX_AGE_SECONDS`.
- `/signal/sync` and `/live_stats` writes require an authenticated admin or the separate server-only `INTERNAL_API_TOKEN`. The postback secret is not a publisher credential. Never embed the publisher secret in browser links or JavaScript.
- A legacy unauthenticated remote publisher is now rejected; this release does not alter Winky's local relay. To publish remotely it must use the new authenticated contract. Local trading and speech paths are unchanged.
- `/me` uses the signed identity, ignores a claimed foreign tg_id, and does not award activity. Signed `POST /activity` records a visit atomically. Anonymous profile requests cannot create users or award points.
- Free signal reservations live in SQLite and expire after 60 seconds. Successful history and active reservations share the three-signal limit; failures release a reservation. Analysis network calls do not hold the database write lock.
- Anonymous history/sync reads are rejected. Free users see only their own signal history; live stream sync requires paid/admin access. The aggregate leaderboard and live score remain public read-only data.
- Registration/deposit links in the Mini App are filled from authenticated profile data. Badges and funnel stages use server entitlement, including deposits below $10 and language changes.
- API/network failures show an error; they do not generate random signals. Expiry ends neutrally and never invents a WIN. Server text is escaped at the HTML boundary; chat shows returned signal information rather than random RSI/confidence.
- Live stats start without fabricated results and persist in SQLite; only authorized publishers can change them. Existing extension/local-storage statistics are not reset or rewritten.
- Notification delivery uses a durable outbox with leases and retries; Telegram outages cannot roll back a deposit. Blocking stops further pushes. Delivery is at least once: an acknowledgement lost after Telegram accepted a message may cause a duplicate notification, but never a duplicate deposit.
- Failed daily teasers do not consume the send allowance and can retry during the configured hour. Users below the deposit threshold remain eligible for the deposit reminder. Startup no longer discards pending Telegram updates.

## Verification and operation

Run `.venv/bin/python tools/test_funnel.py` for the original security suite and new regressions. It always launches subprocesses with disposable SQLite files and dummy credentials. Run `node --test tests/funnel_frontend.test.cjs` for failure, expiry, escaping and link behavior. Test cases cover parallel deposits and duplicates, journal rollback, ownership, late/pre-start events, exact cents, outbox retry/blocking, concurrent demo quota, stale signatures, profile/activity authorization, RU/EN dispatcher flow and old-schema upgrade.

`GET /health` reports database availability and whether the Telegram polling task is running; HTTP 503 distinguishes API-only/unavailable mode. It does not prove a real user-to-broker conversion or a fresh Telegram message exchange.

Before deployment, back up SQLite using its online backup API and retain a permission-restricted env backup. Generate `INTERNAL_API_TOKEN` privately on the server. After deployment check `/health`, `/webapp/`, protected endpoints, container logs, file hashes and preserved user/history counts. Never test a fictitious deposit against a real user's production account.
