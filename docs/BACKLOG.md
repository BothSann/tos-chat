# tos-chat — v2 Backlog

Cut from v1 to keep it small, but **must-have** later. Each item is meant to become a lesson; `nestjs-learn-pick-task` can pick from here once v1 is done.

## Realtime features

- [ ] **Online presence**: who is in a room right now (Socket.IO rooms + connection tracking)
- [ ] **Typing indicators**: throttled `typing:start` / `typing:stop` events
- [ ] **Read receipts**: last-read message per member
- [ ] **Edit and delete messages**: author-only, broadcast `message:updated` / `message:deleted`
- [ ] **Direct messages (DMs)**: two-person private rooms
- [ ] **Notifications**: unread counts, mentions

## Content

- [ ] **File and image uploads**: object storage (e.g. R2/S3), presigned URLs, size/type limits

## Accounts and moderation

- [ ] **Two-factor authentication**: Better Auth `twoFactor` plugin (TOTP + backup codes)
- [ ] **Kick and ban**: owner moderation, banned users cannot rejoin
- [ ] **Password change removes members**: one transaction updates the hash and deletes every membership except the owner's; the gateway removes their live sockets from the room
- [ ] **Telegram sign-in**: official `genericOAuth` plugin against Telegram's OIDC (`https://oauth.telegram.org/.well-known/openid-configuration`, PKCE), no third-party plugin. Start with a spike: one real login. Needs a public HTTPS callback registered with BotFather (a Cloudflare tunnel or the real host). Telegram has no email (`<sub>@telegram.invalid`, unverified), so it links only from inside a session

## Architecture and ops

- [ ] **Re-check the session on open sockets**: a socket is authenticated once at the handshake, so a session revoked elsewhere keeps working until disconnect. Re-check with `getSession` on `message:send` or on a timer, and disconnect when it is gone
- [ ] **Shared Redis store for throttling**: for when the API runs on more than one instance. In-memory counters count per instance and reset on restart or redeploy
- [ ] **Web e2e loading-sequence tests**: Playwright `instant()` tests asserting what renders before uncached work resolves (`nextjs-app-architecture` → `references/testing.md`)
- [ ] **ESLint guards for web rules**: enforce the rules that keep getting broken (e.g. no `*-queries` imports in `src/app/`, no barrels)
- [ ] **Modular-monolith migration**: DDD layers + dependency-cruiser boundaries (`nestjs-modular-monolith` skill)
