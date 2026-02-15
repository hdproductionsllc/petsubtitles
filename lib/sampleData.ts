/** Pre-made example data shared between ExampleCarousel and SocialProof */

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
