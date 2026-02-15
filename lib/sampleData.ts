/** Conversation examples for the landing page carousel */
export interface ConvoExample {
  id: string;
  petName: string;
  petPhoto: string;
  messages: { sender: "pet" | "owner"; text: string }[];
}

export const CONVO_EXAMPLES: ConvoExample[] = [
  {
    id: "mochi",
    petName: "Mochi",
    petPhoto: "/samples/corgi-mochi.jpg",
    messages: [
      { sender: "owner", text: "mochi where are my airpods" },
      { sender: "pet", text: "have you checked under the couch" },
      { sender: "owner", text: "why would they be under the couch" },
      { sender: "pet", text: "no reason" },
      { sender: "pet", text: "unrelated but I was NOT chewing anything earlier" },
      { sender: "owner", text: "MOCHI" },
      { sender: "pet", text: "you have no proof" },
    ],
  },
  {
    id: "chairman",
    petName: "Chairman Meow",
    petPhoto: "/samples/cat-chairman.jpg",
    messages: [
      { sender: "owner", text: "are you sitting on my laptop again" },
      { sender: "pet", text: "no" },
      { sender: "owner", text: "I can literally see you on the camera" },
      { sender: "pet", text: "then why did you ask" },
      { sender: "pet", text: "also I deleted some of your emails" },
      { sender: "pet", text: "you're welcome" },
    ],
  },
  {
    id: "biscuit",
    petName: "Biscuit",
    petPhoto: "/samples/pug-biscuit.jpg",
    messages: [
      { sender: "pet", text: "MOM" },
      { sender: "pet", text: "MOM" },
      { sender: "pet", text: "MOOOOOM" },
      { sender: "owner", text: "biscuit it's 6am what" },
      { sender: "pet", text: "I HEARD A SOUND" },
      { sender: "owner", text: "that was the refrigerator" },
      { sender: "pet", text: "ok but WHAT IF IT WASN'T" },
    ],
  },
  {
    id: "luna",
    petName: "Luna",
    petPhoto: "/samples/cat-luna.jpg",
    messages: [
      { sender: "owner", text: "luna why is there a dead bug on my pillow" },
      { sender: "pet", text: "it's a gift" },
      { sender: "owner", text: "I don't want it" },
      { sender: "pet", text: "the disrespect" },
      { sender: "pet", text: "I hunted that FOR you" },
      { sender: "owner", text: "please stop" },
      { sender: "pet", text: "no" },
    ],
  },
];

/** Pre-made example data for SocialProof */

export interface SampleExample {
  id: string;
  petType: string;
  voiceStyle: string;
  voiceEmoji: string;
  caption: string;
  /** Path to pre-composited image with subtitle + footer (carousel size) */
  image: string;
  /** Path to smaller thumbnail version (social proof cards) */
  thumb: string;
}

/**
 * First 6 entries have real composited photos (from /public/samples/).
 * Additional entries are text-only extras for the social proof scroll.
 */
export const SAMPLE_EXAMPLES: SampleExample[] = [
  {
    id: "dog-guilty",
    petType: "Pug",
    voiceStyle: "Funny",
    voiceEmoji: "😂",
    caption: "I didn't do it. But hypothetically, if I DID eat that shoe, it had it coming.",
    image: "/samples/dog-guilty.jpg",
    thumb: "/samples/dog-guilty-thumb.jpg",
  },
  {
    id: "cat-judging",
    petType: "Tabby Cat",
    voiceStyle: "Passive Agg",
    voiceEmoji: "😒",
    caption: "I've been watching you type for 20 minutes. Not a single email about me.",
    image: "/samples/cat-judging.jpg",
    thumb: "/samples/cat-judging-thumb.jpg",
  },
  {
    id: "puppy-mess",
    petType: "Golden Retriever",
    voiceStyle: "Gen-Z",
    voiceEmoji: "💀",
    caption: "In my defense, that pillow was looking at me weird.",
    image: "/samples/puppy-mess.jpg",
    thumb: "/samples/puppy-mess-thumb.jpg",
  },
  {
    id: "cat-stare",
    petType: "House Cat",
    voiceStyle: "Silly",
    voiceEmoji: "😂",
    caption: "You have 30 seconds to explain why you stopped petting me. Choose your words carefully.",
    image: "/samples/cat-stare.jpg",
    thumb: "/samples/cat-stare-thumb.jpg",
  },
  {
    id: "dog-begging",
    petType: "Husky",
    voiceStyle: "Dramatic Narrator",
    voiceEmoji: "🎬",
    caption: "I can smell that you cut the cheese 4.7 seconds ago. The clock is ticking, Karen.",
    image: "/samples/dog-begging.jpg",
    thumb: "/samples/dog-begging-thumb.jpg",
  },
  {
    id: "kitten-surprised",
    petType: "Scottish Fold",
    voiceStyle: "Dramatic Narrator",
    voiceEmoji: "🎬",
    caption: "SOMETHING MOVED UNDER THE BLANKET AND I AM NOT OKAY.",
    image: "/samples/kitten-surprised.jpg",
    thumb: "/samples/kitten-surprised-thumb.jpg",
  },
];
