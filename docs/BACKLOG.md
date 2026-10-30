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

## Architecture and ops

- [ ] **Web e2e loading-sequence tests**: Playwright `instant()` tests asserting what renders before uncached work resolves (`nextjs-app-architecture` → `references/testing.md`)
- [ ] **ESLint guards for web rules**: enforce the rules that keep getting broken (e.g. no `*-queries` imports in `src/app/`, no barrels)
- [ ] **Modular-monolith migration**: DDD layers + dependency-cruiser boundaries (`nestjs-modular-monolith` skill)
- [ ] **Deployment**: hosting for api, web, and Postgres; buy a domain at Cloudflare Registrar; production cookies; Resend sending domain (`mail.<domain>`); move Telegram's callback from ngrok to a named Cloudflare tunnel or the real host
