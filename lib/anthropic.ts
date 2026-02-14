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
    model: "claude-sonnet-4-20250514",
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
      model: "claude-sonnet-4-20250514",
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
