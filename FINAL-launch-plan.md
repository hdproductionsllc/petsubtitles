# What My Pet Thinks — Launch Plan (FINAL)

Last updated: July 18, 2026
Status: **NOT YET RE-DEPLOYED.** App code is updated locally to `claude-sonnet-5` (content) + `claude-haiku-4-5` (detection), but the **live site is still the Feb 18 build**. Deploys are **manual CLI** (`npm run deploy` / `vercel --prod`) — pushing to GitHub alone does NOT ship. Stripe is in live mode. See the Pre-Launch Checklist before any posting begins.

---

## What This Product Is

A web app where you upload a pet photo and get a fake iMessage text conversation between you and your pet. The pet has a strong personality, opinions, and escalating demands. The output is a shareable image with your branding baked in.

**The pitch (use this everywhere):** "Find out what your pet would text you"
**Not this:** "AI translates your pet's thoughts" / "Put captions on pet photos"

**The one strategic insight this plan is built around:** the shared output image *is* the product's advertising. Every screenshot that lands in a group chat is a free impression — but only if a stranger who didn't make it can instantly grok "that's their pet texting them, and I can do it too" and has a way to act. The whole viral section below is about making that image self-explanatory and the link tappable. Everything else is distribution.

---

## Accounts & Assets

| Asset | Status | Details |
|-------|--------|---------|
| Domain | ✅ | whatmypetthinks.com |
| Instagram | ✅ | @whatmypetthinks (Reels are a primary channel now — see calendar) |
| TikTok | ✅ | @whatmypetthinks (business account) |
| YouTube | ⚠️ | Shorts channel — confirm handle before launch |
| X/Twitter | ✅ | closest available handle secured |
| Google Analytics | ✅ | GA4 property G-LJJE0F7RH9, 20+ events tracking full funnel |
| Stripe | ✅ | Live mode, $4.99/mo subscription (fee ~2.9% + $0.30 → net ~$4.55) |
| Vercel | ✅ | Pro plan ($20/mo), 60s function timeout |
| Anthropic | ⚠️ **FIX BEFORE LAUNCH** | $100/mo spending cap — **incoherent with a viral day, raise to $500–$1,000** (see Monetization + Pre-Launch) |
| Supabase | ✅ | Free tier, global daily cap protection (15K free gens/day) |

---

## Product Features (Current State)

### Live / In Code:
- **Text Conversation format** (LEAD) — upload photo → iMessage-style conversation with pet photo, bubbles, branded footer
- **Caption/Subtitle format** (SECONDARY) — upload photo → captioned image with subtitle overlay
- **4 voice styles:** Funny (default), Passive Aggressive, Gen-Z, Dramatic Narrator
- **Usage caps:** 3 free/day, no account required
- **PRO tier:** $4.99/mo, 15 generations/day (Stripe, live mode)
- **Pet detection:** cheap Haiku pre-check before the expensive content call
- **Quality gate:** auto-retry if output too short or too long
- **Share buttons:** Save, copy, Web Share API, clipboard auto-copy
- **Branded output:** whatmypetthinks.com footer on every image
- **Story format** already carries a QR code (`lib/imageCompositor.ts`)
- **PWA:** installable, offline detection

### Not Yet Built (this plan ships them):
- **Share-to-unlock loop** — the second viral engine (see Viral Loop)
- **Clickable share payload** — Web Share API sends `text` + `url` alongside the image, not just a pixel (highest-leverage change in the whole plan)
- **QR + CTA on the square/group-chat image** (Story already has it; extend to the format people actually share)

### Simplified First-Time Flow (keep):
- First-time user sees ONLY: photo + "What's your pet thinking?" button
- Defaults to Text Convo + Funny voice
- No format toggle, no voice picker, no name field until after the first result
- After first result: full customization unlocked

### Cut Features (stay cut):
- ~~Battle Mode~~, ~~Shakespeare~~, ~~Therapist~~, ~~Telenovela~~ voices — removed as gimmicky/overlapping/confusing

---

## Brand Identity

| Element | Value |
|---------|-------|
| Full name | What My Pet Thinks |
| Short name (app icon) | PetThinks |
| Domain | whatmypetthinks.com |
| Tagline | Find out what your pet would text you |
| Primary hashtag | #WhatMyPetThinks |
| Challenge hashtag | #WhatWouldYourPetText |
| Secondary hashtag | #TranslateYourPet |
| Brand color | Coral #FF6B4A |
| Dark background | #1A1A2E |
| Voice | Funny, warm, slightly unhinged. Like your funniest friend explaining their pet. |

### Social Bios (all platforms):
```
🐾 Find out what your pet would text you
📱 AI-powered pet conversations
📸 Upload a photo → get the texts
👇 Try it free
whatmypetthinks.com
```

---

## Generation Formats

| Format | Role | Description |
|--------|------|-------------|
| Text Conversation | **LEAD** — what you post, promote, and pitch | iMessage-style 6-message conversation between pet and owner. Pet photo at top, blue/gray bubbles, branded footer. This is the viral unit. |
| Caption/Subtitle | Secondary — still available, occasional variety content | Single caption overlaid on pet photo with branded footer. |

---

## Voice Styles

| Voice | ID | Personality | Best For |
|-------|----|-------------|----------|
| Funny | `funny` | Default comedy. Strong opinions, escalation, deadpan. | Everything. Default for first-time users. |
| Passive Aggressive | `passive` | Weaponized politeness. "fine." "interesting." Guilt trips. | Cats especially. Text convos where periods are weapons. |
| Gen-Z | `genz` | Internet speak. no cap, fr fr, its giving, slay. | TikTok audience. Instantly recognizable voice. |
| Dramatic Narrator | `dramatic` | David Attenborough narrating mundane pet moments. | Contrast humor. Feels premium. |

Smart regeneration suggests a different voice after each result to drive exploration. **This exploration wave is the natural home for share-to-unlock** (see Viral Loop §Experiential unlock).

---

## Monetization

| Tier | Price | Daily Cap | Features |
|------|-------|-----------|----------|
| Free | $0 | 3 generations/day, no account | Text Convo, Caption, all voices |
| PRO | $4.99/mo | 15 generations/day | All formats, all voices, bypasses global cap |

> Price changed July 18, 2026 from $9.99/20 to $4.99/15 (new Stripe live price `price_1TugJ7RORd39gMKRMLpmosnA`; the old $9.99 price remains active for any legacy subscribers). Rationale: $9.99 exceeds casual willingness-to-pay for a novelty app; $4.99 halves the objection while the 15/day cap keeps worst-case API cost profitable.

### Unit economics — measured July 18 2026 (`claude-sonnet-5` + `claude-haiku-4-5`, thinking off, images server-resized to 768px)

A **generation = 1 Haiku detection call + 1 Sonnet content call** (caption *or* convo). At any real volume the system-prompt cache stays warm (5-min TTL), so steady-state cost = the cache-hit column below.

**Cost per full generation (detection + content), cache-hit, blended 70% convo / 30% caption:**

| | Intro pricing (through Aug 31) | Post-intro (from Sept 1) |
|---|---|---|
| Caption gen | $0.0037 | $0.0052 |
| Convo gen | $0.0069 | $0.0100 |
| **Blended full gen** | **$0.0060 (~0.6¢)** | **$0.0086 (~0.85¢)** |

> Headline: a full generation costs **about half a cent to a cent.** Even the absolute worst case (all-convo, cache-miss, post-intro) tops out at ~1.8¢. **Your acquisition currency costs sub-cent to mint** — this is the single most important economic fact in the plan.

**⚠️ Sonnet 5 intro pricing ($2/M in, $10/M out) ENDS Aug 31 2026.** From Sept 1 it rises to $3/M in, $15/M out — blended cost up ~44%. PRO margins stay strong; the thing that shifts is the viral-day cap math (below). Re-check on Aug 31. Detection on Haiku 4.5 ($1/M in, $5/M out) is unaffected either way.

### Free-user cost (a heavy daily-maxer, 3 gens/day × 30 days)

| | Per day | Per month |
|---|---|---|
| Intro | $0.018 | **$0.54** |
| Post-intro | $0.026 | **$0.77** |

These assume someone maxing 3 gens *every day for a month*. A **typical** free visitor generates a handful of times ever (< $0.02 lifetime). Free-tier drag is small in aggregate — the risk is not the average visitor but sustained daily-maxers, which share-to-unlock could multiply. Monitor after the loop ships.

### PRO margin (net revenue ~$4.55 after Stripe fees on $4.99)

| Scenario | Gens/mo | Intro margin | Post-intro margin |
|---|---|---|---|
| **Worst** (15/day × 30) | 450 | $1.85 (41%) | $0.68 (15%) |
| **Typical** (5/day) | 150 | $3.65 (80%) | $3.26 (72%) |
| **Light** (30/mo) | 30 | $4.37 (96%) | $4.29 (94%) |

**PRO is profitable in every case** — even the theoretical max-abuse user (all 15 gens, every single day, post-intro pricing) keeps a 15% margin. No PRO usage pattern loses money. The 15/day cap (down from 20) is what keeps the worst case above water at $4.99.

### Break-even vs fixed costs

Fixed = Vercel Pro $20 + domain (~$1.25/mo amortized) + Supabase free = **~$21.25/mo**.
- At typical PRO margin (~$3.26–3.65): **6–7 PRO subscribers** cover all fixed infra.
- **Break-even = 6–7 typical PRO subs.** Very reachable. (Covers *fixed* cost only; free-tier API is variable — see the daily-maxer caveat above.)

### ⚠️ Viral-day cost + the cap that will break

Funnel: **visit → 40% try → ~2.5 gens per activated user**, so gens ≈ visitors (each visitor ≈ 1 generation on average).

| Visitors/day | Gens (~) | Intro cost | Post-intro cost | Binding limit |
|---|---|---|---|---|
| **1K** | 1,000 | $5.95 | $8.55 | None — comfortable |
| **10K** | 10,000 | $59.47 | $85.47 | **Anthropic $100/mo cap** — one day nearly exhausts the month |
| **100K** (capped at 15K/day) | 15,000 | capped $89.21 | capped $128.21 | **Anthropic cap + 15K/day cap both trip** |

**Which cap breaks first:**
- **Anthropic $100/mo cap** trips at **~16,800 gens (intro)** or **~11,700 gens (post-intro)**.
- **15K/day global free cap** trips at 15,000 gens.
- **Order:** *post-intro* → the Anthropic billing cap fires FIRST (~11.7K), before the 15K free cap even engages. The two limits are fighting each other.
- **Vercel 60s timeout is never binding** — calls run 3.3–6.4s. Watch Pro *concurrency* during a spike, not timeout.
- **Per-IP 20 req/min** stops single-actor abuse but does nothing against distributed viral load.

**Failure mode:** on a real viral day the app hard-stops around **10–17K generations (a ~10–17K-visitor day) — mid-moment, precisely when it's working.** The $100/mo cap cannot survive even a single 10K-visitor day.

**Fix (do before launch):**
- **Raise the Anthropic cap to $500/mo minimum, ideally $750–$1,000.** With the 15K/day free cap in place, a maxed viral day costs ~$90 (intro) / ~$128 (post). $500 absorbs ~4–5 capped viral days/month; $1,000 gives real breathing room. **Never launch a viral push with the cap below ~$130** (the cost the *daily* cap already permits), or the kill-switch fires on day one.
- **Keep the 15K/day free cap** as the circuit-breaker — but it only works if the Anthropic cap sits *well above* one day's 15K cost, so the intended free cap (not the billing kill-switch) is what throttles.

### Cost protection (current)
- Anthropic spending cap: **$100/mo — RAISE THIS** (see above)
- Global daily free cap: 15,000 generations/day
- Per-IP rate limiting: 20 requests/minute

---

## The Viral Loop

Two engines, running together. Neither is optional; they compound each other.

### Engine 1 — Founder-posted content (the seed)
You make the traffic. 1 post/day, cross-posted identically to TikTok + Instagram Reels + YouTube Shorts (see Launch Calendar). This is the primary acquisition engine — the loop below cannot self-start, it can only amplify traffic that already exists.

### Engine 2 — Share-to-unlock (the amplifier)
The shared output image is THE viral unit. Every screenshot in a group chat is a free impression. Two things make it convert; both are cheap, ship both week 1:

**1. The image must be self-explanatory to a stranger.** A group-chat viewer who didn't make it needs to instantly grok "this is *my* pet texting *me*, and I can do it too." Bake a persistent bottom strip on every shared/square image: pet photo (already present) + **"your pet would text you too → whatmypetthinks.com" + QR**. The Story format already has the QR (`lib/imageCompositor.ts`); **extend the QR + one-line CTA to the square/group-chat image**, which is where most sharing actually happens.

**2. HIGHEST LEVERAGE — share a clickable link, not just a pixel.** Change the Web Share API payload to send **`text` + `url` alongside the image**. In iMessage, WhatsApp, and Instagram DMs a URL renders as a **tappable link**, moving click-through from ~1.5% to ~10–20%. In the K-model below this single change lifts base K from ~0.09 to ~0.4 and makes viral (K>1) reachable. It's a payload change, not a redesign. **The QR is the fallback for screenshot-only contexts; the clickable share URL is the primary fix.**

#### The incentive: "share to unlock," never "share for credits"
The naive "+3 gens per share" is aimed at the wrong moment — it's only valued by users who've hit the 3/day cap, but **share intent peaks at the first delightful result**, when the user is nowhere near the cap. You'd be paying a cap-time currency to buy a delight-time action.

- **Primary incentive = an experiential unlock**, surfaced on the result card the instant the first convo lands, riding the exploration wave the "smart regeneration" already creates: *"Share to unlock the Dramatic Narrator voice on this pet"* / *"Share to unlock Story format"* (which conveniently carries the QR — the unlock *is* a better viral unit).
- **Keep +3 gens as a stacked secondary benefit** for users who *have* hit the cap — there it's a real 100% bump and does convert.
- **Guardrail:** never gate the *first* result or its shareability behind a share — that wrecks activation and starves the loop of its best content. The unlock is always for the *second* exploration. Keep +3 a *daily* top-up, not infinitely stackable, so no single actor can farm rewarded gens.

#### Why the incentive size barely matters (the honest K-math)
**K = shares/user × views/share × click-through × visitor→user conversion.** Self-sustaining at K ≥ 1.

| Variable | Pessimistic | Base | Optimistic |
|---|---|---|---|
| Shares per user | 0.10 | 0.20 | 0.40 |
| Views per share | 10 | 25 | 80 |
| Click-through | 1.5% | 4% | 12% |
| Visitor→user | 35% | 45% | 55% |
| **K** | **0.005** | **0.09** | **2.11** |
| Amplification `1/(1−K)` | ×1.005 | ×1.10 | runaway |
| Cost per acquired user | ~$0.36 | ~$0.06 | ~$0.02 |

**Read this honestly:** in the pessimistic and base cases **K ≪ 1 — the loop cannot stand on its own.** It's an amplifier worth ~+10% at base (turns 1,000 seeded users into ~1,100). It only tips viral in the optimistic column, and what drives that column is **12% click-through (a clickable link) and 80 views (Story reach) — NOT the +3-gen incentive.** The shareability of the unit and the clickability of the link are everything; the incentive size barely moves K.

**Cost per acquired user via the loop: $0.02–$0.36 (base ~$0.06)** — 10–50× cheaper than any paid channel. But it only converts traffic that already exists. Founder content, DM outreach, and (later) paid UGC are the acquisition engines; the loop makes each of their users worth ~10% more, at ~$0.06 a head.

#### The go/no-go metric — share rate (the one metric that matters)
Do **not** set K ≥ 1 as the bar — at base parameters one share produces only ~0.45 new users, so K ≥ 1 would need shares/generation ≥ 220%, which is impossible. You'd kill a loop that's doing its actual job.

- **GREEN — keep investing in the loop: share rate ≥ 20% shares/generation.** At 20% + base parameters, K ≈ 0.09 (×1.10 amplifier) — modest but free money on every seeded user.
- **YELLOW (10–20%):** loop lives, but fix output funniness before investing further.
- **RED (< 10%):** the output isn't screenshot-worthy. No loop or ad spend fixes that — improve the convos first (per Things to AVOID discipline).
- **Instrument week 1: assisted visits per share** (add `?ref=share` UTM to the shared URL). You cannot manage K without measuring the click side. If assisted visits/share climbs after you ship the clickable-link + QR fix, the loop is compounding; if it stays flat near zero, re-work the image, not the incentive.

---

## Content Library (lighter than before)

The Feb plan demanded 40+ pre-batched assets and then stalled un-executed for 5 months. Don't repeat that. Batch a **small, high-quality seed set** using the existing scripts, then produce week-of.

Use the existing batch pipeline:
- `batch-generate.mjs` — generate convos/captions in bulk
- `render-convos.mjs` — render text-conversation images
- `render-memes.mjs` — render caption/meme images

### Seed set (batch once, before launch):
- **8–10 text conversations** — your pets, Rebecca's family's pets, friends' pets, a few stock photos for breed variety. Rate each 1–5 on "would I screenshot and send this to a friend?" **Keep only 4s and 5s.**
- **3–4 captioned images** — variety/secondary content.
- **2–3 screen recordings** — film yourself generating + reacting; film someone reading their pet's texts for the first time (this is your best-performing format historically).

That's the whole library to start. One good convo per day is enough; quality of the *unit* is what drives share rate, not stockpile size.

---

## UGC Engine

### Layer 1 — You are the first creator (Week 1)
1 post/day, cross-posted identically to all three platforms (see calendar). Don't single-thread on TikTok.

### Layer 2 — DM outreach to pet influencers (**ELEVATED — start Day 1, this is a top priority**)
This is the highest-signal, lowest-cost seeding move and it feeds Engine 1 directly. DM pet influencers a text-conversation screenshot of **THEIR own pet** — it's irresistible and it *is* the demo:
```
Hey! I found out what [pet name] would text you
and I'm dying 😂 [attach text conversation screenshot]

It's free → whatmypetthinks.com
Would love to see what [pet name] texts about
more of your photos!
```
Run 5–10 personalized DMs/day from Day 1. Track replies and reposts — a single influencer repost seeds more traffic than a week of your own posting.

### Layer 3 — Personal network (Days 3–7)
Send the app to ~20 friends/family: "Try this on your pet and send me what it says." Repost the funniest with permission.

### Layer 4 — Challenge (Week 2, only if week-1 share rate ≥ 20%)
"Find out what your pet would text you → whatmypetthinks.com. Post with #WhatMyPetThinks — funniest gets featured!"

### Layer 5 — Paid UGC (Month 2+, only if organic works)
Commission pet accounts (10K–50K followers, $50–100/post). CPA ~$0.25–$2.00. Spend paid budget on **seeding traffic**, never on defending the loop.

---

## Launch Calendar

**Change from Feb plan:** 1 post/day × 7 days (was 2/day × 14), cross-posted identically to **TikTok + Instagram Reels + YouTube Shorts**. Lighter load that will actually get executed beats an ambitious schedule that stalls. Every day's decisions in week 2+ are gated on the **share-rate metric**.

### Pre-Launch (Days -2 to -1) — see full checklist below
- [ ] Deploy current Sonnet 5 code (`vercel --prod`)
- [ ] Raise Anthropic cap to $500–$1,000
- [ ] Ship clickable share payload + QR/CTA on square image + share-to-unlock
- [ ] Batch the seed set (8–10 convos, keep 4s/5s only)
- [ ] Verify cache hits in prod logs

### Week 1 — one post/day, cross-posted to all three platforms
| Day | Post (TikTok = IG Reels = YT Shorts) |
|-----|--------------------------------------|
| Mon | Text convo slideshow (best from seed set) |
| Tue | Screen recording reveal (you generating + reacting) |
| Wed | "I showed someone their pet's texts" (someone else's reaction) |
| Thu | Dog texts vs cat texts |
| Fri | Voice style showcase (same pet, 4 voices) |
| Sat | Breed-specific text convos |
| Sun | Best-of / challenge teaser + **review analytics** |

Throughout week 1: 5–10 influencer DMs/day (Layer 2). Watch **share rate** and **assisted visits/share** daily.

### Week 2 — decision gates driven by the go/no-go metric
- **If share rate ≥ 20% (GREEN):** launch #WhatMyPetThinks challenge, scale DM outreach, keep 1/day cross-posted, double down on the top format.
- **If 10–20% (YELLOW):** hold posting cadence, **fix output funniness first** (better convos > more posts). No challenge yet.
- **If < 10% (RED):** stop scaling distribution. The output isn't screenshot-worthy — rework the convos before spending another hour on content or a dollar on ads.

### Weeks 3–4
- Shift content mix based on which format drives the highest share rate.
- Increase DM outreach volume.
- Feature best UGC on your account.
- Confirm assisted-visits/share is climbing (loop compounding).

### Month 2+
- **If organic works:** scale posting, add paid UGC partnerships.
- **If organic is slow:** test $20–50/day paid promotion on best-performing posts.
- **Aug 31:** re-check the Anthropic cap against post-intro pricing (blended cost up ~44%, cap trips ~30% sooner).

---

## Metrics Dashboard

### Week 1 Targets:
| Metric | Target |
|--------|--------|
| Posts (× 3 platforms) | 7 (21 uploads) |
| Total views (all platforms) | 10,000–50,000 |
| App visits (GA4) | 200–500 |
| Generations completed | 50–150 |
| **Share rate** | **≥ 20% (the go/no-go)** |
| Assisted visits / share | instrument & trend up |

### Month 1 Targets:
| Metric | Target |
|--------|--------|
| Total views | 100,000–500,000 |
| App visits | 2,000–5,000 |
| Generations completed | 500–1,500 |
| PRO subscribers | 5–20 (don't expect much month 1; 6–7 covers fixed costs) |

### The One Metric That Matters:
**Share rate** — what percentage of people who generate actually share the result. **≥ 20% → the product works, you just need distribution. < 10% → the output needs to be funnier before anything else matters.** Everything in this plan optimizes for this number.

---

## Things to AVOID

- **Single-threading on TikTok** — cross-post the same asset to IG Reels + YT Shorts every time; one platform's algorithm can bury you.
- **Launching before raising the Anthropic cap** — a viral day at $100/mo hard-stops the app mid-moment.
- **Assuming a GitHub push ships** — deploys are manual (`vercel --prod`); the CTA/QR/cap changes don't go live until you deploy.
- **Over-batching content** — the Feb plan's 40-asset stockpile is why nothing shipped for 5 months. Small seed set, produce week-of.
- **Gating the first result behind a share** — kills activation and starves the loop of its best content.
- **Chasing K ≥ 1** — the loop is an amplifier, not a standalone engine; judge it on share rate.
- **Framing the unlock as "credits" or a paywall** — say "share to unlock," keep it feeling like discovery.
- Buying followers or engagement.
- Spamming comments with your link.
- Over-producing content (polish < volume at this stage).
- Waiting for the app store (web app IS the advantage).
- Waiting for everything to be "perfect" (ship and iterate).
- Leading with captions instead of text convos in marketing.
- Calling it "AI pet translator" instead of "find out what your pet would text you."
- Spending more than 10 minutes/day on strategy instead of making content.

---

## Pre-Launch Checklist (do these in order, then post)

1. **Deploy the current code.** `vercel --prod` (or `npm run deploy`). The live site is still the Feb 18 build running old model config — nothing below matters until this ships.
2. **Raise the Anthropic spending cap** to $500–$1,000 at console.anthropic.com. Non-negotiable; the $100 cap hard-stops the app on any real viral day (~10–17K gens).
3. **Build + ship share-to-unlock:** experiential unlock (extra voice / Story format) on the result card, +3 gens as stacked secondary for capped users, daily top-up (not infinitely stackable).
4. **Ship the clickable share payload:** Web Share API sends `text` + `url` with the image (highest-leverage change).
5. **Add QR + one-line CTA to the square/group-chat image** (`lib/imageCompositor.ts` already does this for Story — extend it).
6. **Batch the seed set** with `batch-generate.mjs` → `render-convos.mjs` / `render-memes.mjs`. Keep only 4s and 5s.
7. **Verify cache hits in prod logs** — confirm the Sonnet system-prompt cache is reading (0.1×), not writing (1.25×), under real traffic. Steady-state economics above depend on this.
8. **Add `?ref=share` UTM** to the shared URL so assisted-visits/share is measurable from day one.
9. **Test the full flow on 3 friends' phones** with no instructions: upload → generate → share → does the shared link render tappable?
