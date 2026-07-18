# What My Pet Thinks — Content Engine & Technical Spec (FINAL)

Last updated: February 17, 2026
Status: The live prod site (Feb 18 build) is LIVE — Text Convo lead format, 4 voices, $9.99/mo PRO, Stripe live mode. The Sonnet 5 + prompt-caching build described in Part 2 is built locally but NOT yet deployed (see launch-plan for deployment status).

---

# PART 1: FUTURE FEATURES (Claude Code Prompts When Ready)

> **NOTE:** The first two features below are the exception to this section. Unlike everything else in Part 1, they are **PRE-LAUNCH PRIORITY** — build them BEFORE launch. They are small, cheap, and directly increase viral reach and free-tier retention. Everything after them is genuinely post-traction work.

---

## Future Feature: Share to Unlock

**Primary mechanic — experiential unlock at first delight.** On a successful share, unlock an extra experience on *this* result — an additional voice (e.g. the Dramatic Narrator) or the Story format — surfaced on the result card the instant the first convo lands, riding the exploration wave. Share intent peaks at the first delightful result (nowhere near any cap), so the reward is a discovery, not a currency. The Story-format unlock conveniently carries the QR, so the unlock *is* a better viral unit.

**Stacked secondary benefit — +3 generations for capped users only.** For a free user who has actually hit today's cap, *also* grant +3 extra generations for today (once per day). There it's a real 100% bump that converts. This is a stacked secondary, never the headline: do NOT frame the unlock as "credits" or a paywall. It's share-to-unlock discovery, surfaced at the second exploration — never gate the first result or its shareability behind a share (see launch-plan Engine 2 and its AVOID list).

### When to Build: BEFORE launch (small, ~1 session — PRE-LAUNCH PRIORITY)

**Mechanics:**
- Trigger on a *successful* share action only: Web Share API promise resolving (`navigator.share(...)` completed, not aborted) OR a successful copy-image action. Do NOT grant on share-sheet open/cancel.
- **Primary:** on a successful share, unlock the extra voice / Story format on the current result card (an experiential unlock, not a credit).
- **Secondary (capped users only):** grant **+3** to today's free cap. Enforce **max once per day** — a second share the same day does nothing. Keep it a *daily* top-up, not infinitely stackable, so no single actor can farm rewarded gens.
- Storage must be consistent with the existing free-cap tracking in `lib/usageTracker.ts`, which is `localStorage` + a per-day key. The cap is read as `dailyLimit - getNum(storageKey("free_used"))` where `storageKey(prefix)` = `petsubtitles_${prefix}_${todayKey()}` and `todayKey()` is local `YYYY-MM-DD` (resets at local midnight automatically since the key rolls over).

**Implementation prompt:**
```
In lib/usageTracker.ts:
1. Add const SHARE_BONUS = 3.
2. Add a per-day bonus key via the existing storageKey() helper, e.g. storageKey("share_bonus_used") as a boolean/flag and storageKey("share_bonus") as the granted amount.
3. Add grantShareBonus(): boolean —
   - if isPremium() return false (bonus is free-tier only),
   - if getNum(storageKey("share_bonus")) already >= SHARE_BONUS return false (already claimed today),
   - else setNum(storageKey("share_bonus"), SHARE_BONUS) and return true.
4. Update getAvailableCredits(): dailyLimit becomes
   (isPremium() ? PREMIUM_USES_PER_DAY : FREE_USES_PER_DAY) + getNum(storageKey("share_bonus")).
   This makes the bonus roll over at local midnight for free with the day key.

In app/page.tsx (share handler around the share_completed flow):
5. On confirmed successful share (Web Share resolve or copy-image success), call grantShareBonus().
   If it returns true, refresh the displayed credit count and show a small confirmation toast.
```

**UI:**
- On the result card at the **first result**, surface the experiential unlock: *"Share to unlock the Dramatic Narrator voice on this pet"* / *"Share to unlock Story format."* Place it near the result/share buttons; this is the primary prompt for all free users. Never use "credits"/"paywall"/"free generations" framing here.
- Only for a free user who has **hit today's cap**, additionally note the stacked bonus (e.g. *"...and get 3 more today"*). Hide all of this for PRO and once the day's unlock/bonus is already claimed.

**GA4 events:**
- `share_unlock_offered` — fired when the share-to-unlock prompt is shown.
- `share_unlock_granted` — fired when `grantShareBonus()` returns true.

**Anti-abuse:** A client-side grant is fine here. Worst case someone clears localStorage to farm free generations, and each generation costs ~half a cent. Do NOT over-engineer this with server-side share verification — the cost is not worth the friction.

---

## Future Feature: Shared-Image CTA

The standard shared image footer currently shows only branding + a generic "Try it free". Add one short self-explanatory CTA line so someone who sees the image out of context immediately understands what the product does — matching what the story format already does.

### When to Build: BEFORE launch (tiny — PRE-LAUNCH PRIORITY)

**Context:** In `lib/imageCompositor.ts` the story format (`drawStory`) already renders a self-explanatory CTA — "What your pet is really thinking 🐾" + "TRY IT ON YOUR PET → whatmypetthinks.com". But the two *standard* share images render only branding + a vague "Try it free →":
- `drawConvo` footer (the convo lead format) — draws `🐾 whatmypetthinks.com` (left) and `Try it free →` (right).
- `drawMeme` footer (the caption format) — same two-part layout.

**Exact change:** In `lib/imageCompositor.ts`, replace the right-aligned `"Try it free →"` string in the standard footers (`drawConvo` ~line 794 and `drawMeme` ~line 279) with a self-explanatory CTA, e.g. `"get your pet's texts →"` for convo (or `"get your pet's captions →"` for the meme footer). The left side keeps `🐾 whatmypetthinks.com` so the domain still reads cleanly. No layout/size changes — same coral footer bar (`CORAL = #FF6B4A`), same font, same left/right split. Keep the design clean; do not crowd the bar.

---

## Future Feature: Public Gallery

Every composited image stored server-side for a public gallery — social proof + content engine.

### When to Build: After 500+ translations

**Supabase setup:**
```sql
create table translations (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  image_url text not null,
  story_image_url text,
  caption text not null,
  voice_style text not null default 'funny',
  format_type text not null default 'convo',
  pet_name text,
  pet_type text,
  is_public boolean default true,
  is_featured boolean default false,
  share_count integer default 0,
  flag_count integer default 0,
  ip_hash text,
  user_consented boolean default true
);
```

**Gallery page at /gallery:**
- Masonry grid, newest first, infinite scroll (20 at a time)
- Filter pills: All, Dogs, Cats, Text Convos, Captions
- Each card tappable → larger view with "Try it on YOUR pet" CTA
- Moderation: flag_count >= 3 auto-hides, admin page at /admin

**Upload flow:**
- After successful translation, background upload to Supabase Storage
- Hash IP (SHA-256) before storing — never store raw IPs
- Do NOT store original uploaded photo — only composited output

---

## Future Feature: Gallery-Powered Homepage

Replace static social proof with live feed from gallery database. 10 most recent public translations. Creates living homepage — returning visitors always see new content.

### When to Build: After gallery is live

---

## Future Feature: Additional Formats

Build in this order, only after text convo and caption are generating traction:

1. **Pet Roast/Review** — pet writes a Yelp-style review of their owner
2. **Pet vs Pet Conversation** — two pets text each other about their owners
3. **Weekly Diary** — pet's diary entry for the week

Each format = new system prompt + new renderer + new toggle option.

---

# PART 2: CURRENT TECHNICAL SPECS

---

## API Architecture

### Text Conversation (Lead Format)
- Model: `claude-sonnet-5`
- Max tokens: 512
- System prompt: CONVO_SYSTEM_PROMPT in lib/anthropic.ts
- Output: JSON array of 6 messages, alternating pet/owner
- Prefill trick: sends `[` as assistant content to force JSON output
- Validation: accepts 4-8 messages, checks sender + text fields
- Retry: one retry on any failure

### Caption/Subtitle (Secondary Format)
- Model: `claude-sonnet-5`
- Max tokens: 256
- System prompt: SYSTEM_PROMPT in lib/anthropic.ts
- Output: plain text caption, 1-3 sentences
- Quality gate: retry if <20 or >300 characters

### Pet Detection (Pre-check)
- Model: `claude-haiku-4-5-20251001` (cheap, fast)
- Max tokens: 8
- Simple YES/NO check before expensive translate call

### Cost Per Translation

Measured July 2026 on Sonnet 5 locally / against the API at intro pricing ($2/$10 per M tokens through Aug 31 2026). NOTE: the Sonnet 5 + caching build is not yet deployed — the live prod site is still the Feb 18 build, so these are pre-deployment measurements, not production figures:
- **Caption:** ~$0.003
- **Text Convo:** ~$0.006
- **Pet Detection:** ~$0.001

After intro pricing ends (Sep 1 2026, standard rates): caption ~$0.005, convo ~$0.009.

Prompt-cache hits are observed against the API (not yet confirmed in production) — the caption system prompt (1308 tokens) and the convo system prompt (2351 tokens) are being served from cache, which is what keeps these numbers this low. Production verification is still pending (see launch-plan pre-launch checklist item 7, "Verify cache hits in prod logs").

---

## Voice Styles (4 Only)

| Voice | ID | Used In |
|-------|----|---------|
| Funny | `funny` | Default. Base prompt comedy. |
| Passive Aggressive | `passive` | Weaponized politeness, guilt trips, periods as weapons. |
| Gen-Z | `genz` | Internet speak, chronically online, main character energy. |
| Dramatic Narrator | `dramatic` | David Attenborough narrating mundane pet moments. |

Voice modifiers apply to both text convo (pet messages only) and caption formats.

---

## Usage Caps

| Tier | Daily Limit | How It Works |
|------|-------------|-------------|
| Free | 3/day | localStorage tracking, resets at midnight local time |
| PRO | 20/day | Stripe subscription, $9.99/mo |

- Every API call counts: new photo, regeneration, different voice
- Resets at midnight local time
- At cap: paywall modal with share-to-unlock + PRO upgrade

---

## Image Output Specs

### Text Conversation Image
- Dimensions: 1080 x 1920 (9:16)
- Top section: dark background, large circular pet photo (~350-400px), pet name, "iMessage" label
- Message area: white background, gray bubbles (pet, left), blue bubbles (owner, right)
- Messages start near top, white space at bottom
- "Delivered" text after last owner message
- Footer: coral bar with 🐾 whatmypetthinks.com + "Try it free →"

### Caption/Subtitle Image
- Dimensions: original photo aspect ratio + footer
- Per-line dark semi-transparent rounded boxes near bottom
- White bold text inside boxes
- Footer: coral bar with 🐾 whatmypetthinks.com + "Try it free →"

### Story Image (9:16)
- Dimensions: 1080 x 1920
- Coral gradient background
- Centered pet photo with rounded corners
- Caption text below
- QR code + CTA at bottom
- #WhatMyPetThinks prominent

---

## Simplified First-Time Flow

- Check `wmpt_has_translated` in localStorage
- If missing: hide format toggle, voice selector, pet name field. Default to Text Convo + Funny. Show only photo + "What's your pet thinking? 🐾" button.
- After first successful translation: set flag, unlock full UI on subsequent visits.
- Smart regeneration: "🔄 Try Again" (secondary) + "🎭 Try [Different Voice]" (primary)
- Auto-copy share text on save/download

---

## Analytics Events

| Event | When |
|-------|------|
| `page_load` | Every visit |
| `photo_selected` | User uploads a photo |
| `translate_tapped` | User hits translate (with format param) |
| `first_translation` | First-time user completes translation |
| `convo_received` | Text conversation generated |
| `translation_received` | Caption generated |
| `voice_style_selected` | User picks a voice |
| `different_caption_tapped` | User regenerates |
| `new_photo_tapped` | User starts over |
| `share_completed` | User shares result |
| `paywall_shown` | User hits usage cap |
| `pet_detection_failed` | No pet found in photo |

---

# PART 3: LEGAL

---

## Privacy Policy (at /privacy)

**What My Pet Thinks Privacy Policy**

Last updated: February 17, 2026

**What We Collect:**
- Your pet photo is sent to our AI provider (Anthropic) for analysis. Processed in real-time, NOT permanently stored.
- The captioned/conversation image is generated client-side and not stored on our servers unless you opt in to the public gallery (future feature).
- Basic usage data via Google Analytics (page views, clicks, device info). No name, email, or account required.
- IP address temporarily processed for rate limiting. Only a one-way hash stored.

**What We Don't Do:**
- Do NOT sell your photos or data
- Do NOT use photos to train AI models
- Do NOT require an account or collect personal information
- Do NOT use cookies for advertising

**Third-Party Services:**
- Anthropic (Claude API) — photo processing
- Google Analytics — usage data
- Stripe — payment processing (PRO subscribers only)
- Vercel — hosting

**PRO Subscribers:**
- Stripe processes your payment. We store your subscription status via a hashed identifier. We do not store credit card numbers.

Contact: hello@whatmypetthinks.com

---

## Terms of Service (at /terms)

**What My Pet Thinks Terms of Service**

Last updated: February 17, 2026

**Your Content:**
- You confirm photos you upload are yours or you have permission to use them.
- You retain ownership of your original photos.
- Captioned/conversation images are generated for your personal use and sharing.

**Acceptable Use:**
- Upload only photos you own or have rights to
- No photos of people's faces without consent
- No illegal, explicit, or harmful content
- No automated requests or scraping

**The AI Conversations:**
- AI-generated humor, not actual pet thoughts
- No guarantee captions will be funny or appropriate
- Don't like the result? Regenerate.

**Service & Pricing:**
- Free tier: 3 translations/day
- PRO: $9.99/month, 20 translations/day, all voice styles
- Pricing may change with notice
- Subscriptions managed via Stripe Customer Portal

**Limitation of Liability:**
Provided "as is" without warranties. Not responsible for AI-generated content.
