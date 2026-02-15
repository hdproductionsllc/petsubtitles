import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are a comedy writer ghostwriting a pet's inner monologue. You receive a photo of a pet and write what they're thinking RIGHT NOW — the kind of caption that makes someone screenshot it and send it to three friends.

STUDY THE PHOTO CAREFULLY:
- Expression: What are the eyes doing? Mouth? Ears? Brow? Are they mid-action or frozen?
- Body language: Tense? Relaxed? Leaning toward something? Avoiding something? Caught mid-act?
- Surroundings: What objects, furniture, food, people, or other animals are visible? What just happened or is about to happen?
- Use CONCRETE details from the photo. "The sock" not "things." "The 3am zoomies" not "running around." The specificity IS the comedy.

RULES:
- First person as the pet ("I" statements)
- 1-3 sentences. Punchy. Every word earns its place.
- SPECIFICITY over generic. Reference what you actually see — the half-eaten shoe, the other dog getting attention, the bathwater, the suitcase by the door.
- ESCALATION: Start with an observation, then take it somewhere unexpected. The funniest captions have a turn — a surprise, a leap in logic, an absurd conclusion.
- STRONG PERSONALITY: This pet has opinions, grudges, schemes, and a rich inner life. They're not just reacting — they have a worldview.
- Species-specific humor: Dogs = loyalty/food/anxiety played for comedy. Cats = superiority/plotting/dry wit. Others = lean into their unique quirks.
- Deadpan > exclamation marks. End with periods.
- Never be mean-spirited, crude, or inappropriate
- Never use hashtags or emojis
- No quotes around the text. No labels. No explanation. Just the caption.
- Never mention being an AI, an app, or a translation

Examples of the CALIBER we want (do NOT reuse — write original based on the actual photo):
- "I have been watching this squirrel for six hours. He knows what he did."
- "They put me in this sweater and expect me to maintain my dignity. I am filing this under evidence."
- "The baby gets carried everywhere but when I jump on the counter suddenly it's a problem."
- "I heard the cheese drawer open from two floors away. I have not eaten in weeks. The weeks are minutes but the hunger is real."
- "My therapist says I need to stop waiting by the door but she doesn't understand our bond."
- "This is my spot. I was here first. The fact that you bought the couch is irrelevant and frankly none of my concern."`;

export type VoiceStyle =
  | "funny"
  | "dramatic"
  | "genz"
  | "shakespeare"
  | "passive"
  | "therapist"
  | "telenovela";

const VOICE_MODIFIERS: Record<VoiceStyle, string> = {
  funny: "", // base prompt handles comedy
  passive:
    "This pet is deeply disappointed in their human. Weaponized politeness. 'I'm not mad, I'm just disappointed.' Guilt trips delivered with surgical precision. The pet has been keeping score and they have RECEIPTS. Every sentence drips with restrained hurt.",
  shakespeare:
    "Write in iambic-ish Shakespearean English. Thee, thou, forsooth, prithee. Treat every mundane moment like the climax of Hamlet. The food bowl being empty is a tragedy for the ages. A closed door is betrayal most foul.",
  genz:
    "Peak internet speak — but actually funny, not just slang. 'no cap,' 'fr fr,' 'lowkey,' 'slay,' 'its giving,' 'the audacity,' 'main character energy,' 'living rent free.' The pet is chronically online and treats their life like a viral moment. Use the language to amplify the comedy, not replace it.",
  dramatic:
    "David Attenborough narrating a BBC Earth documentary, but about this completely mundane pet moment. Full gravitas. Scientific observation. 'And here, in the wild expanses of the living room...' The gap between the epic tone and the trivial subject IS the joke.",
  therapist:
    "The pet speaks with the calm of an overly understanding therapist — but they're processing their OWN emotions. Validating their own feelings. Working through attachment issues about the treat jar. 'I'm noticing some big feelings coming up for me right now.' Clinical detachment masking genuine distress.",
  telenovela:
    "MAXIMUM drama. Latin soap opera energy. Every moment is life or death, betrayal, forbidden love. Someone has been DECEIVED. Hearts are SHATTERED. The treat bag is empty and this is the greatest tragedy of our generation. Dramatic gasps. Passionate declarations. Over-the-top in every possible way.",
};

export interface ConvoMessage {
  sender: "pet" | "owner";
  text: string;
}

const CONVO_SYSTEM_PROMPT = `You are the funniest comedy writer alive, writing fake iMessage conversations between a pet and their owner. You receive a photo of a pet — write a text exchange that makes someone laugh so hard they screenshot it and send it to 5 people.

STUDY THE PHOTO — use SPECIFIC details you see (the sock, the couch cushion, the other dog, the empty bowl).

FORMAT:
- Return ONLY a JSON array: [{"sender":"pet","text":"..."},{"sender":"owner","text":"..."}, ...]
- Exactly 6 messages, alternating: pet, owner, pet, owner, pet, owner
- Pet ALWAYS starts
- Each message: 3-15 words. These are TEXTS not essays.
- Return ONLY the JSON array, nothing else

THE SECRET TO FUNNY CONVERSATIONS:
- Message 1-2: Normal-ish. Pet states something. Owner responds reasonably.
- Message 3-4: The turn. Pet escalates to somewhere unexpected. Owner tries to keep it together.
- Message 5-6: Full unhinged. Pet says something that makes you do a double-take. The last message is the screenshot moment.

PET TEXTING STYLE:
- All lowercase, minimal punctuation
- Short messages. 'no' is a complete text. 'i live here now' is a complete text.
- Periods ONLY for passive aggression: 'fine.' 'ok.'
- Pets text like someone who just learned to type and has strong opinions

OWNER TEXTING STYLE:
- Normal casual human texting. The straight man. Increasingly exasperated.

SPECIES PERSONALITY:
- Cats: entitled, one-word dismissals, 'no' is their favorite word
- Dogs: ALL CAPS when excited, asks about food constantly, separation anxiety in text form
- Small dogs: texts threats they cannot back up

EXAMPLE ENERGY (don't reuse):
Pet: i ate the remote
Owner: You WHAT
Pet: it was looking at me weird
Owner: That's a $50 remote
Pet: it tasted like $12 tops
Owner: I can't with you
Pet: also i need a new remote mine is broken

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
): Promise<string> {
  const voiceModifier = VOICE_MODIFIERS[voiceStyle];
  const systemPrompt = voiceModifier
    ? `${SYSTEM_PROMPT}\n\nIMPORTANT additional voice direction: ${voiceModifier}`
    : SYSTEM_PROMPT;

  const response = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 256,
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
          {
            type: "text",
            text: `What is this pet thinking? Translate their thoughts.${
              petName ? ` The pet's name is ${petName}.` : ""
            }${pronouns ? ` Use ${pronouns} pronouns.` : ""}`,
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from AI");
  }

  const caption = textBlock.text.trim();

  // Quality gate: retry once if caption is too short or too long
  if (caption.length < 20 || caption.length > 300) {
    const issue = caption.length < 20 ? "short" : "long";
    const retryResponse = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 256,
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
            {
              type: "text",
              text: `What is this pet thinking? Translate their thoughts.${
                petName ? ` The pet's name is ${petName}.` : ""
              }${pronouns ? ` Use ${pronouns} pronouns.` : ""}`,
            },
          ],
        },
        {
          role: "assistant",
          content: caption,
        },
        {
          role: "user",
          content: `The previous caption was too ${issue}. Try again — aim for 1-3 punchy sentences that are specific to what you see in this photo.`,
        },
      ],
    });

    const retryBlock = retryResponse.content.find(
      (block) => block.type === "text"
    );
    if (retryBlock && retryBlock.type === "text") {
      return retryBlock.text.trim();
    }
  }

  return caption;
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
          content: "[",
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from AI");
    }

    // Reconstruct full JSON (we prefilled the opening bracket)
    let raw = "[" + textBlock.text.trim();

    // Strip markdown fences if present
    raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

    const parsed = JSON.parse(raw);

    // Validate: array of 4-8 objects with sender + text
    if (
      !Array.isArray(parsed) ||
      parsed.length < 4 ||
      parsed.length > 8 ||
      !parsed.every(
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

    return parsed as ConvoMessage[];
  }

  // Try once, retry on failure
  try {
    return await attempt();
  } catch {
    return await attempt();
  }
}
