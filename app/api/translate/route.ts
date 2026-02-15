import { NextRequest, NextResponse } from "next/server";
import { translatePetPhoto, generatePetConvo, type VoiceStyle } from "@/lib/anthropic";

export const maxDuration = 30;

// In-memory rate limiting (resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT) {
    return false;
  }

  entry.count++;
  return true;
}

const VALID_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

type MediaType = (typeof VALID_MEDIA_TYPES)[number];

const VALID_VOICES: VoiceStyle[] = [
  "funny",
  "dramatic",
  "genz",
  "passive",
];

// ~5MB in base64 is ~6.67MB string
const MAX_BASE64_LENGTH = 7_000_000;

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Whoa, slow down! Your pet needs a break between translations. Try again in a minute." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { imageBase64, mediaType, voiceStyle = "funny", petName, pronouns, format = "caption" } = body;

    if (!imageBase64 || !mediaType) {
      return NextResponse.json(
        { error: "We need a photo to translate! Please upload an image of your pet." },
        { status: 400 }
      );
    }

    if (imageBase64.length > MAX_BASE64_LENGTH) {
      return NextResponse.json(
        { error: "That photo is too large! Please try a smaller image (under 5MB)." },
        { status: 400 }
      );
    }

    if (!VALID_MEDIA_TYPES.includes(mediaType as MediaType)) {
      return NextResponse.json(
        { error: "Unsupported image format. Please use JPEG, PNG, GIF, or WebP." },
        { status: 400 }
      );
    }

    if (!VALID_VOICES.includes(voiceStyle)) {
      return NextResponse.json(
        { error: "Invalid voice style selected." },
        { status: 400 }
      );
    }

    if (format !== "caption" && format !== "convo") {
      return NextResponse.json(
        { error: "Invalid format selected." },
        { status: 400 }
      );
    }

    // Validate optional personalization
    const cleanName = typeof petName === "string" ? petName.slice(0, 20).trim() : undefined;
    const validPronouns = ["he/him", "she/her", "they/them"];
    const cleanPronouns = validPronouns.includes(pronouns) ? pronouns : undefined;

    if (format === "convo") {
      const messages = await generatePetConvo(
        imageBase64,
        mediaType as MediaType,
        voiceStyle as VoiceStyle,
        cleanName || undefined,
        cleanPronouns
      );
      return NextResponse.json({ messages });
    }

    const memeCaption = await translatePetPhoto(
      imageBase64,
      mediaType as MediaType,
      voiceStyle as VoiceStyle,
      cleanName || undefined,
      cleanPronouns
    );

    return NextResponse.json({ caption: memeCaption });
  } catch (err) {
    console.error("Translation error:", err);
    return NextResponse.json(
      { error: "Our pet translator is taking a nap. Please try again in a moment!" },
      { status: 500 }
    );
  }
}
