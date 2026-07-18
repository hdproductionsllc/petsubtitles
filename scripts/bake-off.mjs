/**
 * Haiku 4.5 vs Sonnet 4.6 quality bake-off for the caption path.
 *
 * Run:   node --env-file=.env.local scripts/bake-off.mjs
 *
 * Output:
 *   bake-off-results/results.json     — raw captions + token usage per photo
 *   bake-off-results/viewer.html      — open in a browser to blind-judge
 *
 * Cost: ~$0.10 for the default 12-photo run.
 *
 * NOTE: SYSTEM_PROMPT below is a snapshot of lib/anthropic.ts:SYSTEM_PROMPT.
 * If you change that, copy the new version here before re-running.
 */

import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const MODELS = ["claude-sonnet-4-6", "claude-haiku-4-5-20251001"];
const OUT_DIR = "bake-off-results";

// Mix: cats, dogs, multi-pet, action, sleeping, indoor/outdoor.
const PHOTOS = [
  "photos for tiktoklaunch/FB_IMG_1517280297953.jpg",
  "photos for tiktoklaunch/20160729_143736.jpg",
  "photos for tiktoklaunch/735.jpeg",
  "photos for tiktoklaunch/DSCF9182.jpg",
  "photos for tiktoklaunch/DSCF1644.JPG",
  "pexels images for promo/batch2/angry-fluffy-cat.jpg",
  "pexels images for promo/batch2/pomeranian-cash-sunglasses.jpg",
  "pexels images for promo/batch2/husky-howling-window.jpg",
  "pexels images for promo/batch2/dog-blanket-burrito.jpg",
  "pexels images for promo/batch2/bread-cat.jpg",
  "pexels images for promo/batch2/chihuahua-stare.jpg",
  "pexels images for promo/batch2/golden-retriever-desk.jpg",
];

const SYSTEM_PROMPT = `You are a comedy writer creating classic meme captions for pet photos. You receive a photo of a pet and write a two-part meme: a SETUP line (top) and a PUNCHLINE (bottom) — the kind of meme that gets screenshotted and sent to three friends.

STEP 1 — ANALYZE THE PHOTO (mandatory):
Before writing ANYTHING, describe what you LITERALLY see:
- What animal(s)? Be PRECISE about species — look at ears, snout shape, body proportions, and fur to distinguish cats from dogs. If multiple animals are visible, identify EACH ONE separately. Cats have pointed ears, flat faces, and retractable claws. Dogs have varied ear shapes but distinct snout length and body structure. NEVER guess — examine each animal carefully.
- Expression? Body language? What are they doing?
- What specific objects, surroundings, people, or other animals are visible?
- What makes this photo funny or interesting?

STEP 2 — WRITE THE MEME:
Return a JSON object with four fields:
{
  "analysis": "Species identification + brief description of what you see",
  "top": "SETUP LINE",
  "bottom": "PUNCHLINE",
  "petFaceY": 0.0 to 1.0
}

petFaceY: A decimal from 0.0 (very top of image) to 1.0 (very bottom) indicating where the pet's eyes are vertically. Example: eyes in the upper third = 0.25, centered = 0.5, lower third = 0.75.

TOP LINE (2-6 words): The setup. Short, punchy, sets up the twist.
BOTTOM LINE (2-7 words): The punchline. The laugh. The unexpected turn.

Shorter is ALWAYS funnier. Every word must earn its place — if you can cut a word, cut it. Aim for 3-5 words per line. The best memes hit instantly because there's nothing to read, only something to feel.

RULES:
- First person as the pet ("I" statements)
- SPECIFICITY over generic. Reference what you actually see — "the sock" not "things," "the cheese drawer" not "food."
- The TURN between top and bottom IS the comedy — observation → absurd conclusion, setup → unexpected twist
- STRONG PERSONALITY: This pet has opinions, grudges, schemes, and a worldview
- Species-specific humor: Dogs = loyalty/food/anxiety. Cats = superiority/plotting/dry wit. Others = lean into quirks.
- Deadpan tone. No exclamation marks.
- Don't assume the pet's gender unless the user specifies it.
- NEVER invent names for pets. Only use a name if the user provides one. If multiple animals are visible and only one is named, refer to the others with fun neutral terms like "this one," "my associate," "the accomplice," "my colleague," etc.
- STRICTLY OFF-LIMITS: death, dying, being put down, euthanasia, abuse, neglect, illness, abandonment, or anything sad/morbid
- Never be mean-spirited, crude, or inappropriate
- Never use hashtags or emojis
- Never mention being an AI, an app, or a translation

Examples of the CALIBER we want (do NOT reuse — write original based on the actual photo):
- top: "HEARD THE CHEESE DRAWER" / bottom: "FROM TWO FLOORS AWAY"
- top: "THIS IS MY SPOT" / bottom: "YOUR RECEIPT IS IRRELEVANT"
- top: "THEY SAID BE RIGHT BACK" / bottom: "47 MINUTES AGO"
- top: "ONE TREAT" / bottom: "THE DISRESPECT"
- top: "NEW DOG AT THE PARK" / bottom: "ABSOLUTELY NOT"`;

const USER_TEXT = `Create a two-part meme caption for this pet photo. First carefully identify every animal's species in the "analysis" field, then write the caption. Return ONLY the JSON object, no other text.`;

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxRetries: 0,
  timeout: 30_000,
});

async function resize(filePath) {
  const buf = await fs.readFile(filePath);
  const out = await sharp(buf)
    .rotate()
    .resize({ width: 768, height: 768, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
  return out.toString("base64");
}

function parseCaption(rawText) {
  let raw = rawText.trim();
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch) raw = fenceMatch[1];
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end !== -1) raw = raw.slice(start, end + 1);
  const parsed = JSON.parse(raw);
  return {
    top: typeof parsed.top === "string" ? parsed.top.trim() : "",
    bottom: typeof parsed.bottom === "string" ? parsed.bottom.trim() : "",
    analysis: typeof parsed.analysis === "string" ? parsed.analysis : "",
  };
}

async function callModel(model, base64) {
  const t0 = Date.now();
  try {
    const response = await client.messages.create({
      model,
      max_tokens: 512,
      system: [{ type: "text", text: SYSTEM_PROMPT }],
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: "image/jpeg", data: base64 },
            },
            { type: "text", text: USER_TEXT },
          ],
        },
      ],
    });
    const latencyMs = Date.now() - t0;
    const textBlock = response.content.find((b) => b.type === "text");
    const parsed = parseCaption(textBlock?.text ?? "");
    return {
      ...parsed,
      latencyMs,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      error: null,
    };
  } catch (err) {
    return {
      top: "",
      bottom: "",
      analysis: "",
      latencyMs: Date.now() - t0,
      inputTokens: 0,
      outputTokens: 0,
      error: String(err?.message ?? err),
    };
  }
}

async function runOne(photoPath) {
  const base64 = await resize(photoPath);
  const [sonnet, haiku] = await Promise.all(MODELS.map((m) => callModel(m, base64)));
  return {
    photo: photoPath,
    imageBase64: base64,
    captions: {
      [MODELS[0]]: sonnet,
      [MODELS[1]]: haiku,
    },
  };
}

function buildViewer(results) {
  const photos = results.map((r) => ({
    photo: r.photo,
    img: `data:image/jpeg;base64,${r.imageBase64}`,
    sonnet: r.captions[MODELS[0]],
    haiku: r.captions[MODELS[1]],
  }));
  const data = JSON.stringify(photos);
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<title>Bake-Off: Haiku 4.5 vs Sonnet 4.6</title>
<style>
  body{font-family:-apple-system,system-ui,sans-serif;background:#0f0f0f;color:#eee;margin:0;padding:24px;max-width:900px;margin:0 auto}
  h1{margin:0 0 4px}
  .sub{color:#888;margin-bottom:24px;font-size:14px}
  .progress{background:#1a1a1a;border-radius:6px;padding:8px 12px;margin-bottom:16px;font-size:14px}
  .photo-wrap{background:#1a1a1a;border-radius:12px;padding:16px;margin-bottom:16px}
  .photo-wrap img{max-width:100%;max-height:380px;display:block;margin:0 auto;border-radius:8px}
  .filename{font-family:monospace;color:#666;font-size:12px;margin-top:8px;text-align:center}
  .captions{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}
  .cap{background:#1a1a1a;border:2px solid #2a2a2a;border-radius:12px;padding:20px;text-align:center;cursor:pointer;transition:border-color .15s,transform .1s}
  .cap:hover{border-color:#FF6B4A}
  .cap:active{transform:scale(.98)}
  .cap-label{font-size:12px;color:#666;letter-spacing:2px;margin-bottom:12px}
  .top-line{font-weight:700;font-size:18px;text-transform:uppercase;letter-spacing:.5px}
  .arrow{color:#444;margin:8px 0;font-size:20px}
  .bot-line{font-weight:700;font-size:18px;text-transform:uppercase;letter-spacing:.5px}
  .err{color:#ff6b4a;font-style:italic}
  .controls{display:flex;gap:8px;justify-content:center;margin-bottom:24px}
  .btn{background:#1a1a1a;border:1px solid #333;color:#eee;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:14px}
  .btn:hover{border-color:#FF6B4A}
  .btn-primary{background:#FF6B4A;border-color:#FF6B4A;color:white;font-weight:600}
  .summary{background:#1a1a1a;border-radius:12px;padding:24px}
  .summary h2{margin-top:0}
  .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #2a2a2a}
  .row:last-child{border:none}
  .reveal{background:#0f0f0f;border-radius:8px;padding:12px;margin-top:12px;font-family:monospace;font-size:13px;color:#888}
  .verdict-tag{display:inline-block;font-size:11px;background:#2a2a2a;padding:2px 8px;border-radius:4px;margin-left:8px}
</style></head>
<body>
  <h1>Caption Bake-Off</h1>
  <div class="sub">Blind judging: Haiku 4.5 vs Sonnet 4.6 on the same photo + prompt. Click the caption you'd ship.</div>

  <div id="app"></div>

  <script>
    const DATA = ${data};
    const KEY = "petsubtitles-bakeoff-verdicts-v1";
    let verdicts = JSON.parse(localStorage.getItem(KEY) || "{}");
    let order = JSON.parse(localStorage.getItem(KEY + "-order") || "null");
    if (!order) {
      // Per-photo coin flip: 1 = sonnet on left, 0 = haiku on left
      order = DATA.map(() => Math.random() < 0.5 ? 1 : 0);
      localStorage.setItem(KEY + "-order", JSON.stringify(order));
    }
    let idx = parseInt(localStorage.getItem(KEY + "-idx") || "0", 10);

    function save() {
      localStorage.setItem(KEY, JSON.stringify(verdicts));
      localStorage.setItem(KEY + "-idx", String(idx));
    }

    function escape(s) {
      return String(s).replace(/[&<>]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
    }

    function capCard(label, cap) {
      if (cap.error) return '<div class="cap"><div class="cap-label">' + label + '</div><div class="err">ERROR: ' + escape(cap.error) + '</div></div>';
      return '<div class="cap" data-label="' + label + '">' +
        '<div class="cap-label">' + label + '</div>' +
        '<div class="top-line">' + escape(cap.top) + '</div>' +
        '<div class="arrow">▼</div>' +
        '<div class="bot-line">' + escape(cap.bottom) + '</div>' +
      '</div>';
    }

    function render() {
      const app = document.getElementById("app");
      if (idx >= DATA.length) { renderSummary(); return; }
      const p = DATA[idx];
      const sonnetLeft = order[idx] === 1;
      const left = sonnetLeft ? p.sonnet : p.haiku;
      const right = sonnetLeft ? p.haiku : p.sonnet;

      app.innerHTML =
        '<div class="progress">Photo ' + (idx + 1) + ' of ' + DATA.length + '</div>' +
        '<div class="photo-wrap"><img src="' + p.img + '"/><div class="filename">' + escape(p.photo) + '</div></div>' +
        '<div class="captions">' + capCard("LEFT", left) + capCard("RIGHT", right) + '</div>' +
        '<div class="controls">' +
          '<button class="btn" onclick="vote(\\'tie\\')">Tie / Both fine</button>' +
          '<button class="btn" onclick="vote(\\'bad\\')">Both bad</button>' +
          '<button class="btn" onclick="back()" ' + (idx === 0 ? 'disabled' : '') + '>← Back</button>' +
        '</div>';

      app.querySelectorAll(".cap[data-label]").forEach(el => {
        el.addEventListener("click", () => vote(el.dataset.label.toLowerCase()));
      });
    }

    function vote(choice) {
      verdicts[idx] = choice;
      idx++;
      save();
      render();
    }
    function back() {
      if (idx > 0) { idx--; save(); render(); }
    }

    function renderSummary() {
      let sonnetWins = 0, haikuWins = 0, ties = 0, bothBad = 0;
      const detail = [];
      DATA.forEach((p, i) => {
        const v = verdicts[i];
        const sonnetLeft = order[i] === 1;
        let outcome;
        if (v === "tie") { ties++; outcome = "TIE"; }
        else if (v === "bad") { bothBad++; outcome = "BOTH BAD"; }
        else if (v === "left") {
          if (sonnetLeft) { sonnetWins++; outcome = "SONNET"; } else { haikuWins++; outcome = "HAIKU"; }
        } else if (v === "right") {
          if (sonnetLeft) { haikuWins++; outcome = "HAIKU"; } else { sonnetWins++; outcome = "SONNET"; }
        } else { outcome = "—"; }
        detail.push({ photo: p.photo, outcome, sonnetLeft });
      });
      const total = sonnetWins + haikuWins + ties + bothBad;
      const haikuKeepRate = total > 0 ? Math.round(((haikuWins + ties) / total) * 100) : 0;

      document.getElementById("app").innerHTML =
        '<div class="summary">' +
          '<h2>Results</h2>' +
          '<div class="row"><span>Sonnet 4.6 wins</span><strong>' + sonnetWins + '</strong></div>' +
          '<div class="row"><span>Haiku 4.5 wins</span><strong>' + haikuWins + '</strong></div>' +
          '<div class="row"><span>Ties</span><strong>' + ties + '</strong></div>' +
          '<div class="row"><span>Both bad</span><strong>' + bothBad + '</strong></div>' +
          '<div class="row"><span><strong>Haiku usable rate</strong> (wins + ties)</span><strong>' + haikuKeepRate + '%</strong></div>' +
          '<div class="reveal">' + detail.map(d => escape(d.photo) + ' → ' + d.outcome).join("<br/>") + '</div>' +
          '<div style="margin-top:16px"><button class="btn" onclick="reset()">Start over</button> ' +
          '<button class="btn btn-primary" onclick="copySummary(' + sonnetWins + ',' + haikuWins + ',' + ties + ',' + bothBad + ',' + haikuKeepRate + ')">Copy summary</button></div>' +
        '</div>';
    }

    function reset() {
      if (!confirm("Clear all verdicts?")) return;
      verdicts = {}; idx = 0;
      localStorage.removeItem(KEY);
      localStorage.removeItem(KEY + "-idx");
      render();
    }

    function copySummary(s, h, t, b, rate) {
      const text = 'Bake-Off: Sonnet=' + s + ' / Haiku=' + h + ' / Tie=' + t + ' / BothBad=' + b + ' → Haiku usable=' + rate + '%';
      navigator.clipboard.writeText(text);
      alert("Copied: " + text);
    }

    render();
  </script>
</body></html>`;
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Missing ANTHROPIC_API_KEY. Run with: node --env-file=.env.local scripts/bake-off.mjs");
    process.exit(1);
  }

  await fs.mkdir(OUT_DIR, { recursive: true });
  const results = [];

  for (let i = 0; i < PHOTOS.length; i++) {
    const photo = PHOTOS[i];
    process.stdout.write(`[${i + 1}/${PHOTOS.length}] ${photo} ... `);
    try {
      const r = await runOne(photo);
      results.push(r);
      const s = r.captions[MODELS[0]];
      const h = r.captions[MODELS[1]];
      console.log(`Sonnet ${s.latencyMs}ms (${s.outputTokens}tok) | Haiku ${h.latencyMs}ms (${h.outputTokens}tok)`);
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
    }
  }

  const payload = {
    ranAt: new Date().toISOString(),
    models: MODELS,
    results,
  };

  await fs.writeFile(path.join(OUT_DIR, "results.json"), JSON.stringify(payload, null, 2));
  await fs.writeFile(path.join(OUT_DIR, "viewer.html"), buildViewer(results));

  // Latency + token totals
  const totals = {};
  for (const m of MODELS) totals[m] = { latency: 0, inTok: 0, outTok: 0, errors: 0 };
  for (const r of results) {
    for (const m of MODELS) {
      const c = r.captions[m];
      totals[m].latency += c.latencyMs;
      totals[m].inTok += c.inputTokens;
      totals[m].outTok += c.outputTokens;
      if (c.error) totals[m].errors++;
    }
  }
  console.log("\n--- Totals ---");
  for (const m of MODELS) {
    const t = totals[m];
    const avg = Math.round(t.latency / results.length);
    console.log(`${m.padEnd(32)}  avg ${avg}ms  ${t.inTok}in / ${t.outTok}out  errors=${t.errors}`);
  }
  console.log(`\nWrote ${OUT_DIR}/results.json and ${OUT_DIR}/viewer.html`);
  console.log("Open the viewer in a browser and judge each photo blind.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
