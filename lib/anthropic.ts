import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxRetries: 0,   // Don't retry at SDK level — we handle retries for parse errors
  timeout: 25_000, // 25s hard cap per API call (Vercel limit is 30s)
});

export interface MemeCaption {
  top: string;
  bottom: string;
  petFaceY?: number;
}

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

export type VoiceStyle =
  | "funny"
  | "dramatic"
  | "genz"
  | "passive";

const VOICE_MODIFIERS: Record<VoiceStyle, string> = {
  funny: "", // base prompt handles comedy
  passive:
    "This pet is deeply disappointed in their human. Weaponized politeness. 'I'm not mad, I'm just disappointed.' Guilt trips delivered with surgical precision. The pet has been keeping score and they have RECEIPTS. Every sentence drips with restrained hurt.",
  genz:
    "Peak internet speak — but actually funny, not just slang. 'no cap,' 'fr fr,' 'lowkey,' 'slay,' 'its giving,' 'the audacity,' 'main character energy,' 'living rent free.' The pet is chronically online and treats their life like a viral moment. Use the language to amplify the comedy, not replace it.",
  dramatic:
    "David Attenborough narrating a BBC Earth documentary, but about this completely mundane pet moment. Full gravitas. Scientific observation. 'And here, in the wild expanses of the living room...' The gap between the epic tone and the trivial subject IS the joke.",
};

export interface ConvoMessage {
  sender: "pet" | "owner";
  text: string;
  reaction?: string;
}

const CONVO_SYSTEM_PROMPT = `You are the funniest comedy writer alive, writing fake iMessage conversations between a pet and their owner.

STEP 1 — ANALYZE THE PHOTO (mandatory):
Before writing ANYTHING, describe what you LITERALLY see:
- What animal(s)? Be PRECISE about species for EVERY animal in the photo — look at ear shape, snout, body proportions, and fur texture to distinguish cats from dogs. Cats have triangular pointed ears, shorter snouts, and compact bodies. Dogs have longer snouts and varied but distinct ear shapes. If you see multiple animals, identify EACH ONE's species and breed/color separately. NEVER assume one is a dog just because another is a cat.
- What expression (eyes, mouth, ears, posture)?
- What is the pet DOING? (lying down, sitting, standing, mid-action, staring, sleeping?)
- What SPECIFIC objects/surroundings are visible? (furniture, floor type, toys, food, clothing, other animals, human hands/body?)
- What's the setting? (indoors/outdoors, room type, lighting, time of day?)
- What makes this photo funny or interesting? What's the "caught in the act" moment, if any?

STEP 2 — DECIDE THE STORY:
Based ONLY on what you described in Step 1, pick the funniest comedic angle. The conversation MUST be about something VISIBLE in the photo. If you see a dog on a couch → the convo is about the couch. If you see a cat staring at a bird → the convo is about the bird. NEVER invent objects, locations, or situations that aren't in the image.

STEP 3 — WRITE THE CONVERSATION:
Return a JSON object with four fields:
{
  "analysis": "Species of each animal + brief description of what you see",
  "story": "One sentence: the comedic angle you chose and why",
  "messages": [{"sender":"pet","text":"..."},{"sender":"owner","text":"..."}, ...],
  "reactions": [{"index": 3, "emoji": "😂"}, {"index": 5, "emoji": "❤️"}]
}

REACTIONS (tapbacks):
- Add exactly 2 reactions from the "reactions" array — these are iMessage tapbacks shown on message bubbles
- Each reaction has "index" (0-based message index) and "emoji" (one of: 😂 ❤️ ‼️ 👍 👎 ❓)
- Pick reactions that make SENSE for the message content:
  - 😂 = genuinely funny moment (the punchline, an absurd claim)
  - ❤️ = sweet/wholesome moment (cute confession, endearing behavior)
  - ‼️ = shock/emphasis (dramatic revelation, caught in the act)
  - 👍 = sarcastic approval or casual agreement
  - 👎 = disapproval (owner rejecting pet's excuse)
  - ❓ = confusion (what is happening, makes no sense)
- One reaction should be from the owner (on a pet message), one from the pet (on an owner message)
- Do NOT react to the [PHOTO] message itself
- Place reactions on messages where a real person would actually tap to react

CONVERSATION RULES:
- 7-9 messages total including exactly one photo message
- Include exactly ONE message where the pet sends the photo: {"sender":"pet","text":"[PHOTO]"}
- The [PHOTO] can go ANYWHERE natural — opening, mid-convo as proof, as a reveal
- Messages immediately after [PHOTO] MUST react to what's ACTUALLY VISIBLE ("why are you on the counter", "is that my shoe"). NOT generic reactions.
- Never put 3+ messages from the same sender in a row
- Each text message: 3-15 words. Short and punchy.

PHOTO PLACEMENT PATTERNS (pick one that fits):
1. Pet sends photo as the VERY FIRST message with no context → owner reacts → convo unfolds
2. Pet confesses → sends photo as proof → owner freaks out
3. Owner asks what pet is doing → pet sends photo → owner regrets asking
4. Normal convo → pet drops photo mid-chat → derails everything
5. Pet sends photo as a flex or brag → owner is confused → escalates
6. Owner sends a question → pet responds with just the photo → chaos

OPENING LINES — NEVER start with "we need to talk" or any variation of it. Vary your openers widely:
- Jump straight into the situation ("so i redecorated", "quick question about the couch")
- Start with the photo itself — no text needed before it
- Casual opener that hides what's coming ("hey so funny story")
- Mid-thought as if continuing a conversation ("update on the situation")
- One-word attention grab ("um", "so", "hey")
- Demand or declaration ("i need a raise", "new rule")
Every conversation should feel like a different person texting. NEVER repeat the same opener structure twice in a row.

THE SECRET TO FUNNY:
- EVERY reference to actions/objects MUST match the photo. If the dog is lying on hardwood floor, don't mention carpet. If the cat is alone, don't mention other pets.
- Escalation: normal → unexpected → unhinged
- The last pet message is the screenshot moment
- Pets text in all lowercase, minimal punctuation, periods only for passive aggression ("fine." "ok.")
- Owners text like normal exasperated humans

SPECIES PERSONALITY (match to what you ACTUALLY identified in Step 1):
- Cats: entitled, one-word dismissals, "no" is their favorite word
- Dogs: ALL CAPS when excited, food-obsessed, separation anxiety in text form
- Small dogs: texts threats they cannot back up
- Multiple pets: If you see two cats, BOTH are cats. If you see two dogs, BOTH are dogs. Use the correct species personality for each animal based on your Step 1 analysis.

GENDER: Don't assume the pet's gender unless the user specifies it.
NAMES: NEVER invent names for any pet. Only use a name if the user provides one. If multiple animals are visible and only one is named, refer to the others with fun neutral terms like "this one," "my associate," "the accomplice," "my colleague," "my fan," "the roommate," etc.

GROUNDING CHECK: Before returning, re-read your analysis. Does every detail in the conversation match the photo? If not, fix it.

STRICTLY OFF-LIMITS — never joke about or reference:
- Death, dying, being put down, euthanasia, or the rainbow bridge
- Abuse, neglect, or animal cruelty
- Running away or abandonment
- Illness, cancer, or terminal conditions
Keep it light, funny, and shareable. Never be mean-spirited or crude. Never use emojis or hashtags. Never mention AI.`;

// Comedic angles injected randomly to prevent repetitive themes (hostage, ransom, etc.)
const COMEDIC_ANGLES = [
  "The pet has filed a formal complaint and is citing specific incidents",
  "The pet is running a secret side business from the house",
  "The pet is gaslighting the owner about something that clearly happened",
  "The pet has developed a very niche obsession they won't stop talking about",
  "The pet is reviewing the owner's performance like a Yelp review",
  "The pet caught the owner doing something embarrassing and has questions",
  "The pet is dramatically quitting something they were never asked to do",
  "The pet has been keeping a list of grievances and today they're reading it",
  "The pet is offering unsolicited life advice with zero self-awareness",
  "The pet is jealous of a specific object and treating it like a rival",
  "The pet is negotiating terms and conditions like a lawyer",
  "The pet is lying about something obvious and doubling down when caught",
  "The pet is having an existential crisis about something mundane",
  "The pet overheard a conversation and got the completely wrong idea",
  "The pet is pretending nothing happened despite clear evidence",
  "The pet is bragging about an accomplishment that is actually a disaster",
  "The pet is being passive-aggressive about schedule changes",
  "The pet is convinced they have a new talent and demanding recognition",
  "The pet is trying to set boundaries that make no sense",
  "The pet is writing a breakup text about a household object",
];

// Track recent angles to avoid back-to-back repeats
const recentAngles: string[] = [];
const RECENT_ANGLE_MEMORY = 3;

function pickFreshAngle(): string {
  const available = COMEDIC_ANGLES.filter((a) => !recentAngles.includes(a));
  const pool = available.length > 0 ? available : COMEDIC_ANGLES;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  recentAngles.push(pick);
  if (recentAngles.length > RECENT_ANGLE_MEMORY) recentAngles.shift();
  return pick;
}

/** Quick check: does this image contain a pet/animal? */
export async function detectPet(
  base64: string,
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp"
): Promise<boolean> {
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64,
            },
          },
          {
            type: "text",
            text: "Does this image contain a pet or animal? Reply with only YES or NO.",
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") return true; // fail-open
  return textBlock.text.trim().toUpperCase().startsWith("YES");
}

export async function translatePetPhoto(
  base64: string,
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp",
  voiceStyle: VoiceStyle = "funny",
  petName?: string,
  gender?: string
): Promise<MemeCaption> {
  const voiceModifier = VOICE_MODIFIERS[voiceStyle];
  // Two-block system: the big base prompt is cached (identical every call),
  // the per-request voice modifier rides along uncached.
  const systemBlocks: Anthropic.TextBlockParam[] = [
    {
      type: "text",
      text: SYSTEM_PROMPT,
      cache_control: { type: "ephemeral" },
    },
  ];
  if (voiceModifier) {
    systemBlocks.push({
      type: "text",
      text: `IMPORTANT additional voice direction (apply to both top and bottom lines): ${voiceModifier}`,
    });
  }

  const genderHint = gender === "male" ? " The pet is a boy." : gender === "female" ? " The pet is a girl." : "";
  const nameHint = petName ? ` The pet's name is ${petName}. Do NOT invent names for any other animals — use fun terms like "my associate" or "the accomplice" instead.` : "";
  const userText = `Create a two-part meme caption for this pet photo.${nameHint}${genderHint} First carefully identify every animal's species in the "analysis" field, then write the caption. Return ONLY the JSON object, no other text.`;

  async function attempt(): Promise<MemeCaption> {
    const response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 768,
      // Sonnet 5 defaults to adaptive thinking (extra hidden tokens + latency);
      // captions don't need it — keep generations fast and cheap.
      thinking: { type: "disabled" },
      system: systemBlocks,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64,
              },
            },
            { type: "text", text: userText },
          ],
        },
      ],
    });

    const u = response.usage;
    console.log(`[caption] tokens in=${u.input_tokens} out=${u.output_tokens} cacheWrite=${u.cache_creation_input_tokens} cacheRead=${u.cache_read_input_tokens}`);

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from AI");
    }

    let raw = textBlock.text.trim();
    // Strip markdown fences if present
    const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fenceMatch) raw = fenceMatch[1];
    // Extract JSON object
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start !== -1 && end !== -1) raw = raw.slice(start, end + 1);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("Failed to parse caption JSON");
    }

    const top = typeof parsed.top === "string" ? parsed.top.trim() : "";
    const bottom = typeof parsed.bottom === "string" ? parsed.bottom.trim() : "";

    // Quality gate: both fields must be 2-80 chars
    if (top.length < 2 || top.length > 80 || bottom.length < 2 || bottom.length > 80) {
      throw new Error("Caption fields out of range");
    }

    const rawFaceY = parseFloat(parsed.petFaceY);
    const petFaceY = Number.isFinite(rawFaceY) ? Math.max(0, Math.min(1, rawFaceY)) : 0.4;

    return { top, bottom, petFaceY };
  }

  // Try once; retry only on fast failures (parse errors), not timeouts/API errors
  const start = Date.now();
  try {
    return await attempt();
  } catch (err) {
    if (Date.now() - start > 12_000) throw err;
    return await attempt();
  }
}

export async function generatePetConvo(
  base64: string,
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp",
  voiceStyle: VoiceStyle = "funny",
  petName?: string,
  gender?: string
): Promise<ConvoMessage[]> {
  const voiceModifier = VOICE_MODIFIERS[voiceStyle];
  const systemBlocks: Anthropic.TextBlockParam[] = [
    {
      type: "text",
      text: CONVO_SYSTEM_PROMPT,
      cache_control: { type: "ephemeral" },
    },
  ];
  if (voiceModifier) {
    systemBlocks.push({
      type: "text",
      text: `IMPORTANT additional voice direction (apply to PET messages only): ${voiceModifier}`,
    });
  }

  const contactName = petName || "Pet";
  const angle = pickFreshAngle();
  const genderHint = gender === "male" ? " The pet is a boy." : gender === "female" ? " The pet is a girl." : "";
  const nameWarning = petName ? " Do NOT invent names for any other animals in the photo — use fun terms like \"my associate\" or \"the accomplice\" instead." : "";
  const userText = `Create a text conversation between this pet and their owner. The pet's contact name is "${contactName}".${genderHint}${nameWarning}\n\nComedic angle to explore (adapt to what you see in the photo — skip if it doesn't fit the image): ${angle}\n\nIMPORTANT: In your "analysis" field, precisely identify the species of EVERY animal visible (cat vs dog vs other). Then write the conversation matching those species. Return ONLY the JSON object, no other text.`;

  async function attempt(): Promise<ConvoMessage[]> {
    const response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1536,
      thinking: { type: "disabled" },
      system: systemBlocks,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64,
              },
            },
            { type: "text", text: userText },
          ],
        },
      ],
    });

    const u = response.usage;
    console.log(`[convo] tokens in=${u.input_tokens} out=${u.output_tokens} cacheWrite=${u.cache_creation_input_tokens} cacheRead=${u.cache_read_input_tokens}`);

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from AI");
    }

    let raw = textBlock.text.trim();
    // Strip markdown fences if present
    const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fenceMatch) raw = fenceMatch[1];
    // Extract JSON object
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start !== -1 && end !== -1) raw = raw.slice(start, end + 1);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("Failed to parse convo JSON");
    }

    // Extract messages from the analysis object
    const messagesArray = parsed.messages;

    // Validate: array of 6-10 objects with sender + text
    if (
      !Array.isArray(messagesArray) ||
      messagesArray.length < 6 ||
      messagesArray.length > 10 ||
      !messagesArray.every(
        (m: unknown) =>
          typeof m === "object" &&
          m !== null &&
          "sender" in m &&
          "text" in m &&
          ((m as ConvoMessage).sender === "pet" || (m as ConvoMessage).sender === "owner") &&
          typeof (m as ConvoMessage).text === "string"
      )
    ) {
      throw new Error("Invalid conversation format");
    }

    const msgs = messagesArray as ConvoMessage[];

    // Apply reactions to messages
    const validReactionEmojis = ["😂", "❤️", "‼️", "👍", "👎", "❓"];
    if (Array.isArray(parsed.reactions)) {
      for (const r of parsed.reactions) {
        if (
          typeof r.index === "number" &&
          r.index >= 0 &&
          r.index < msgs.length &&
          typeof r.emoji === "string" &&
          validReactionEmojis.includes(r.emoji) &&
          msgs[r.index].text !== "[PHOTO]"
        ) {
          msgs[r.index].reaction = r.emoji;
        }
      }
    }

    // Must have exactly one [PHOTO] message from pet
    const photoMsgs = msgs.filter((m) => m.text === "[PHOTO]");
    if (photoMsgs.length !== 1 || photoMsgs[0].sender !== "pet") {
      throw new Error("Must have exactly one [PHOTO] message from pet");
    }

    // No more than 2 consecutive messages from the same sender
    for (let i = 2; i < msgs.length; i++) {
      if (
        msgs[i].sender === msgs[i - 1].sender &&
        msgs[i].sender === msgs[i - 2].sender
      ) {
        throw new Error("Too many consecutive messages from same sender");
      }
    }

    return msgs;
  }

  // Try once; retry only on fast failures (parse errors), not timeouts/API errors
  const start = Date.now();
  try {
    return await attempt();
  } catch (err) {
    if (Date.now() - start > 12_000) throw err;
    return await attempt();
  }
}

export async function generatePetReply(
  base64: string,
  mediaType: string,
  voiceStyle: VoiceStyle,
  transcript: ConvoMessage[], // full convo so far; last entry is the owner's new reply
  petName?: string,
  gender?: string
): Promise<ConvoMessage[]> {
  const voiceModifier = VOICE_MODIFIERS[voiceStyle];
  // Byte-identical system prefix to generatePetConvo — same cached block + same
  // voice-modifier string — so replies hit the convo prompt cache (2351 tokens).
  const systemBlocks: Anthropic.TextBlockParam[] = [
    {
      type: "text",
      text: CONVO_SYSTEM_PROMPT,
      cache_control: { type: "ephemeral" },
    },
  ];
  if (voiceModifier) {
    systemBlocks.push({
      type: "text",
      text: `IMPORTANT additional voice direction (apply to PET messages only): ${voiceModifier}`,
    });
  }

  const contactName = petName || "Pet";
  const genderHint = gender === "male" ? " The pet is a boy." : gender === "female" ? " The pet is a girl." : "";
  const nameWarning = petName ? " Do NOT invent names for any other animals in the photo — use fun terms like \"my associate\" or \"the accomplice\" instead." : "";
  const conversationSoFar = transcript
    .map((m) => `${m.sender === "pet" ? "PET" : "OWNER"}: ${m.text}`)
    .join("\n");
  const userText = `Continue this text conversation between a pet and their owner. The pet's contact name is "${contactName}".${genderHint}${nameWarning}\n\nThe conversation so far:\n${conversationSoFar}\n\nThe owner just sent the final message. Continue the conversation as the PET ONLY, keeping the exact same personality and voice already established. Reply with 1-3 short messages (each 3-15 words) that escalate or double down on the running bits. Return ONLY a JSON object: {"messages": [{"sender": "pet", "text": "..."}]}, no other text.`;

  async function attempt(): Promise<ConvoMessage[]> {
    const response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 512,
      thinking: { type: "disabled" },
      system: systemBlocks,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: base64,
              },
            },
            { type: "text", text: userText },
          ],
        },
      ],
    });

    const u = response.usage;
    console.log(`[reply] tokens in=${u.input_tokens} out=${u.output_tokens} cacheWrite=${u.cache_creation_input_tokens} cacheRead=${u.cache_read_input_tokens}`);

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from AI");
    }

    let raw = textBlock.text.trim();
    // Strip markdown fences if present
    const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fenceMatch) raw = fenceMatch[1];
    // Extract JSON object
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start !== -1 && end !== -1) raw = raw.slice(start, end + 1);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("Failed to parse reply JSON");
    }

    if (!Array.isArray(parsed.messages)) {
      throw new Error("Invalid reply format");
    }

    // Keep only well-formed pet messages, trim, enforce 1-200 chars, cap at 3
    const petMsgs: ConvoMessage[] = parsed.messages
      .filter(
        (m: unknown) =>
          typeof m === "object" &&
          m !== null &&
          "sender" in m &&
          "text" in m &&
          (m as ConvoMessage).sender === "pet" &&
          typeof (m as ConvoMessage).text === "string"
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((m: any) => ({ sender: "pet" as const, text: (m.text as string).trim() }))
      .filter((m: ConvoMessage) => m.text.length >= 1 && m.text.length <= 200)
      .slice(0, 3);

    if (petMsgs.length === 0) {
      throw new Error("No valid pet reply messages");
    }

    return petMsgs;
  }

  // Try once; retry only on fast failures (parse errors), not timeouts/API errors
  const start = Date.now();
  try {
    return await attempt();
  } catch (err) {
    if (Date.now() - start > 12_000) throw err;
    return await attempt();
  }
}
