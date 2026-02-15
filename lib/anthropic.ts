import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface MemeCaption {
  top: string;
  bottom: string;
}

const SYSTEM_PROMPT = `You are a comedy writer creating classic meme captions for pet photos. You receive a photo of a pet and write a two-part meme: a SETUP line (top) and a PUNCHLINE (bottom) — the kind of meme that gets screenshotted and sent to three friends.

STEP 1 — ANALYZE THE PHOTO (mandatory):
Before writing ANYTHING, describe what you LITERALLY see:
- What animal? Expression? Body language? What are they doing?
- What specific objects, surroundings, people, or other animals are visible?
- What makes this photo funny or interesting?

STEP 2 — WRITE THE MEME:
Return a JSON object with three fields:
{
  "analysis": "Brief description of what you see",
  "top": "SETUP LINE",
  "bottom": "PUNCHLINE"
}

TOP LINE (3-10 words): Establishes the situation. Sets up the joke. What the pet is doing, thinking, or observing.
BOTTOM LINE (3-12 words): The twist, the punchline, the unexpected escalation. This is the laugh line.

RULES:
- First person as the pet ("I" statements)
- SPECIFICITY over generic. Reference what you actually see — "the sock" not "things," "the cheese drawer" not "food."
- The TURN between top and bottom IS the comedy — observation → absurd conclusion, setup → unexpected twist
- STRONG PERSONALITY: This pet has opinions, grudges, schemes, and a worldview
- Species-specific humor: Dogs = loyalty/food/anxiety. Cats = superiority/plotting/dry wit. Others = lean into quirks.
- Deadpan tone. No exclamation marks.
- NEVER assume gender for any pet, animal, or person. Use "they/them" or gender-neutral terms ("sibling" not "brother/sister", "human" not "mom/dad"). Exception: if the user specifies pronouns, use those.
- Never be mean-spirited, crude, or inappropriate
- Never use hashtags or emojis
- Never mention being an AI, an app, or a translation

Examples of the CALIBER we want (do NOT reuse — write original based on the actual photo):
- top: "THEY SAID 'BE RIGHT BACK'" / bottom: "THAT WAS 47 MINUTES AGO"
- top: "I HEARD THE CHEESE DRAWER" / bottom: "FROM TWO FLOORS AWAY"
- top: "THIS IS MY SPOT" / bottom: "THE FACT THAT YOU BOUGHT THE COUCH IS IRRELEVANT"
- top: "THEY PUT ME IN THIS SWEATER" / bottom: "I AM FILING THIS UNDER EVIDENCE"
- top: "THE BABY GETS CARRIED EVERYWHERE" / bottom: "BUT I JUMP ON THE COUNTER AND SUDDENLY IT'S A PROBLEM"`;

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
- What animal? What breed/color? What expression (eyes, mouth, ears, posture)?
- What is the pet DOING? (lying down, sitting, standing, mid-action, staring, sleeping?)
- What SPECIFIC objects/surroundings are visible? (furniture, floor type, toys, food, clothing, other animals, human hands/body?)
- What's the setting? (indoors/outdoors, room type, lighting, time of day?)
- What makes this photo funny or interesting? What's the "caught in the act" moment, if any?

STEP 2 — DECIDE THE STORY:
Based ONLY on what you described in Step 1, pick the funniest comedic angle. The conversation MUST be about something VISIBLE in the photo. If you see a dog on a couch → the convo is about the couch. If you see a cat staring at a bird → the convo is about the bird. NEVER invent objects, locations, or situations that aren't in the image.

STEP 3 — WRITE THE CONVERSATION:
Return a JSON object with four fields:
{
  "analysis": "Brief description of what you see in the photo",
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
1. Pet confesses → sends photo as proof → owner freaks out
2. Owner asks what pet is doing → pet sends photo → owner regrets asking
3. Pet sends photo first as a flex → owner is confused → escalates
4. Normal convo → pet drops photo mid-chat → derails everything
5. Pet says "don't be mad" → sends photo → owner is mad

THE SECRET TO FUNNY:
- EVERY reference to actions/objects MUST match the photo. If the dog is lying on hardwood floor, don't mention carpet. If the cat is alone, don't mention other pets.
- Escalation: normal → unexpected → unhinged
- The last pet message is the screenshot moment
- Pets text in all lowercase, minimal punctuation, periods only for passive aggression ("fine." "ok.")
- Owners text like normal exasperated humans

SPECIES PERSONALITY:
- Cats: entitled, one-word dismissals, "no" is their favorite word
- Dogs: ALL CAPS when excited, food-obsessed, separation anxiety in text form
- Small dogs: texts threats they cannot back up

GENDER: NEVER assume gender for any pet, animal, or person. Use "they/them" or gender-neutral terms ("sibling" not "brother/sister", "human" not "mom/dad"). Exception: if the user specifies pronouns, use those for that pet only.

GROUNDING CHECK: Before returning, re-read your analysis. Does every detail in the conversation match the photo? If not, fix it.

Never be mean-spirited or crude. Never use emojis or hashtags. Never mention AI.`;

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
  pronouns?: string
): Promise<MemeCaption> {
  const voiceModifier = VOICE_MODIFIERS[voiceStyle];
  const systemPrompt = voiceModifier
    ? `${SYSTEM_PROMPT}\n\nIMPORTANT additional voice direction (apply to both top and bottom lines): ${voiceModifier}`
    : SYSTEM_PROMPT;

  const userText = `Create a two-part meme caption for this pet photo.${
    petName ? ` The pet's name is ${petName}.` : ""
  }${pronouns ? ` Use ${pronouns} pronouns.` : ""}`;

  async function attempt(): Promise<MemeCaption> {
    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 512,
      system: systemPrompt,
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
        {
          role: "assistant",
          content: "{",
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from AI");
    }

    let raw = "{" + textBlock.text.trim();
    raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

    const parsed = JSON.parse(raw);

    const top = typeof parsed.top === "string" ? parsed.top.trim() : "";
    const bottom = typeof parsed.bottom === "string" ? parsed.bottom.trim() : "";

    // Quality gate: both fields must be 2-80 chars
    if (top.length < 2 || top.length > 80 || bottom.length < 2 || bottom.length > 80) {
      throw new Error("Caption fields out of range");
    }

    return { top, bottom };
  }

  // Try once, retry on failure
  try {
    return await attempt();
  } catch {
    return await attempt();
  }
}

export async function generatePetConvo(
  base64: string,
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp",
  voiceStyle: VoiceStyle = "funny",
  petName?: string,
  pronouns?: string
): Promise<ConvoMessage[]> {
  const voiceModifier = VOICE_MODIFIERS[voiceStyle];
  const systemPrompt = voiceModifier
    ? `${CONVO_SYSTEM_PROMPT}\n\nIMPORTANT additional voice direction (apply to PET messages only): ${voiceModifier}`
    : CONVO_SYSTEM_PROMPT;

  const contactName = petName || "Pet";
  const userText = `Create a text conversation between this pet and their owner. The pet's contact name is "${contactName}".${
    pronouns ? ` Use ${pronouns} pronouns for the pet.` : ""
  }`;

  async function attempt(): Promise<ConvoMessage[]> {
    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      system: systemPrompt,
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
        {
          role: "assistant",
          content: "{",
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from AI");
    }

    // Reconstruct full JSON (we prefilled the opening brace)
    let raw = "{" + textBlock.text.trim();

    // Strip markdown fences if present
    raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

    const parsed = JSON.parse(raw);

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

  // Try once, retry on failure
  try {
    return await attempt();
  } catch {
    return await attempt();
  }
}
