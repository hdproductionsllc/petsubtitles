# PetSubtitles Build Progress

## Phase 12: Sonnet 5 + Relaunch Prep (2026-07-18)

Goal: wake the project up — the live site is still the Feb 18 build; deploys are manual CLI, so pushed commits never shipped.

- [x] Verify what's live: whatmypetthinks.com serves a Feb 18 3:47 PM deployment (missing commit 78023fc + all local work)
- [x] Switch caption + convo generation to `claude-sonnet-5` (intro pricing $2/$10 through Aug 31, 2026)
- [x] Disable adaptive thinking on both calls (Sonnet 5 defaults it ON — would add hidden tokens + latency)
- [x] Bump max_tokens for the new tokenizer (caption 512→768, convo 1024→1536)
- [x] Add per-call usage logging (`[caption]`/`[convo]` lines show tokens + cache hits in Vercel logs)
- [x] Local generation flow test: 4/4 pass, 3–6.5s latency, cache hits confirmed (caption 1308 tok, convo 2351 tok cached reads)
- [x] Measured cost/gen: caption ~$0.003, convo ~$0.006 (+detection ~$0.001)
- [x] Rearchitect FINAL-launch-plan.md + add build specs (Opus workflow: 6 agents, 4 must-fix review findings caught + fixed)
- [x] Build share-to-unlock: share → 🎬 Dramatic Narrator unlocked for the day (+3 bonus gens, once/day, free tier) — `usageTracker.ts`, `VoiceSelector`, `ShareButtons`, `page.tsx`; GA4 events share_unlock_offered/granted
- [x] Shared-image CTA: "get your pet's texts →" / "get your pet's captions →" replaces "Try it free →" in standard footers
- [x] Web Share payload now includes tappable `url` field
- [x] Reprice PRO: $4.99/mo, 15 gens/day (was $9.99/20) — new Stripe live price `price_1TugJ7RORd39gMKRMLpmosnA`, Vercel + local env updated, UI/terms/success copy updated, plan margins recomputed (worst case +$0.68–1.85, typical +$3.26–3.65, break-even 6–7 subs)
- [ ] Raise Anthropic spending cap before launch (viral day would blow $100/mo cap and hard-stop the app) — DAVID, in console.anthropic.com
- [x] Commit + `npm run deploy`
- [ ] Verify cache hits + `[caption]`/`[convo]` usage lines in prod logs after deploy
- [ ] Follow-up: QR code on the standard share image (Story format already has one)
- [ ] "Reply to your pet" (Opus workflow in flight): generatePetReply in lib/anthropic.ts (reuses cached convo system prompt), POST /api/reply, ReplyComposer UI — thread re-composites into the share image; free 3 replies/convo → PRO nudge, PRO 20; GA4 reply_sent/reply_received/reply_limit_reached

## Phase 10: Cost Reduction Pass (2026-04-25)

Goal: cut per-generation API cost ~40-60% without changing output quality.

- [x] Move `sharp` from devDependencies → dependencies (needed at runtime, not just build)
- [x] Add `lib/serverImage.ts` — server-side resizer: max 768px longest edge, JPEG q85, returns `{ base64, mediaType }`
- [x] Wire resizer into `app/api/translate/route.ts` (before calling translatePetPhoto / generatePetConvo)
- [x] Wire resizer into `app/api/detect-pet/route.ts` (Haiku detection benefits too)
- [x] Add Anthropic prompt caching to `translatePetPhoto` system block (cache_control: ephemeral)
- [x] Add Anthropic prompt caching to `generatePetConvo` system block (cache_control: ephemeral)
- [x] Verify: `npm run build` passes clean
- [ ] Verify in production: check API logs for `cache_read_input_tokens` > 0 after 2nd request

Why prompt caching matters here: system prompts are ~2K+ tokens and identical on every request. Anthropic charges ~10% of input price for cached reads after the first hit.

Why image resizing matters: a 4MB phone photo costs ~4-5x the vision tokens of a 768px version, and the model doesn't gain detail it can use.

Follow-up (separate PR): Haiku 4.5 vs Sonnet 4.6 bake-off on caption path.

## Phase 11: Haiku vs Sonnet Bake-Off (2026-04-25)

Goal: empirically measure whether Haiku 4.5 produces caption quality comparable to Sonnet 4.6, so we can route easy cases to Haiku and halve blended cost.

- [x] Build `scripts/bake-off.mjs` — calls both models on the same photo with identical system prompt, captures captions + latency + tokens
- [x] Generate self-contained HTML viewer with inline base64 photos for blind judging
- [x] Run on ~12 diverse photos
- [ ] User judges via `bake-off-results/viewer.html` — confirms or refutes the preview verdict
- [x] Verdict from preview: Haiku misidentifies species (husky → cat on photo #8) and produces generic punchlines. **Do NOT route caption path to Haiku.** Keep Sonnet 4.6.
- [x] Document failure modes in `tasks/lessons.md` for future re-bake when Haiku 4.6+ ships

## Phase 1–8: Core App (Complete)
- [x] Next.js 16 + Tailwind v4 + TypeScript scaffold
- [x] Claude vision API, HEIC conversion, image compositing
- [x] All UI components, state machine, monetization, sharing
- [x] Offline detection, accessibility, error handling

## Phase 9: Viral-Ready Overhaul (Complete)
- [x] ExampleCarousel with 6 real composited pet photos (Unsplash, royalty-free)
- [x] Coral footer (#FF6B4A) on standard, story, and battle images
- [x] Share buttons — two large coral primary buttons side by side
- [x] "Different Caption" re-translates same photo, no re-upload
- [x] "New Photo" auto-opens file picker
- [x] SocialProof horizontal scrolling gallery with real thumbnails
- [x] GA4 analytics — lib/analytics.ts helper + 12 events wired up
- [x] SEO: OG image, JSON-LD, meta keywords, canonical URL, robots
- [x] Privacy policy updated for GA4
- [x] Deploy convenience script (npm run deploy)

## Testing Checklist (All PASS)
- [x] Landing page shows rotating examples immediately (no blank state)
- [x] "Try It Free" opens the photo picker
- [x] Both share buttons appear prominently after translation
- [x] "Share" opens native share sheet with standard image
- [x] "Share to Story" opens native share sheet with 9:16 image
- [x] Coral branded footer visible on every shared image
- [x] Story image has full vertical layout with CTA text + QR code
- [x] "Different Caption" regenerates without re-uploading
- [x] "New Photo" opens picker immediately
- [x] Social proof gallery scrolls horizontally on mobile
- [x] OG image preview works when URL pasted
- [x] All analytics events fire (page_load, photo_selected, translate_tapped, etc.)
- [x] Build passes clean (0 errors, 0 warnings)
- [x] TypeScript diagnostics clean

## Before Deploy
- [ ] Replace `G-XXXXXXXXXX` in `app/layout.tsx` with your actual GA4 Measurement ID
- [ ] Run `npm run deploy` (or `vercel --prod --yes --name petsubtitles`)
- [ ] Test on physical phone: carousel, translate flow, sharing, battle mode
