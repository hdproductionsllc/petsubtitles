import { NextRequest, NextResponse } from "next/server";
import { translatePetPhoto, generatePetConvo, type VoiceStyle } from "@/lib/anthropic";
import { supabaseAdmin } from "@/lib/supabaseServer";

export const maxDuration = 30;

// Global daily cap for free translations (cost protection)
// 15,000 = ~5,000 free users × 3 each = ~$225 max daily API spend
const FREE_DAILY_CAP = 15_000;

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

function todayDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Increment global free counter and return whether under the cap */
async function checkAndIncrementFreeCap(): Promise<boolean> {
  if (!supabaseAdmin) return true; // fail-open if Supabase not configured

  const date = todayDate();

  try {
    // Upsert: insert or increment
    const { data, error } = await supabaseAdmin.rpc("increment_free_count", {
      p_date: date,
      p_cap: FREE_DAILY_CAP,
    });

    if (error) {
      // If RPC doesn't exist yet, try raw upsert fallback
      const { data: row } = await supabaseAdmin
        .from("daily_stats")
        .select("free_generations")
        .eq("date", date)
        .single();

      const current = row?.free_generations ?? 0;
      if (current >= FREE_DAILY_CAP) return false;

      await supabaseAdmin
        .from("daily_stats")
        .upsert(
          { date, free_generations: current + 1 },
          { onConflict: "date" }
        );

      return true;
    }

    // RPC returns true if under cap, false if over
    return data === true;
  } catch {
    return true; // fail-open on errors
  }
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
    const { imageBase64, mediaType, voiceStyle = "funny", petName, gender, format = "caption", customerId } = body;

    // Validate customerId format (Stripe customer IDs start with "cus_")
    const validCustomerId = typeof customerId === "string" && customerId.startsWith("cus_") ? customerId : null;

    // Free user (no valid customerId) → check global daily cap
    if (!validCustomerId) {
      const underCap = await checkAndIncrementFreeCap();
      if (!underCap) {
        return NextResponse.json(
          {
            error: "We're so popular we hit our daily limit! Go PRO for guaranteed access, or come back tomorrow.",
            atCapacity: true,
          },
          { status: 503 }
        );
      }
    }

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
    const cleanName = typeof petName === "string"
      ? petName.replace(/[^a-zA-Z0-9 .\-']/g, "").slice(0, 20).trim() || undefined
      : undefined;
    const validGenders = ["male", "female"];
    const cleanGender = validGenders.includes(gender) ? gender : undefined;

    if (format === "convo") {
      const messages = await generatePetConvo(
        imageBase64,
        mediaType as MediaType,
        voiceStyle as VoiceStyle,
        cleanName || undefined,
        cleanGender
      );
      return NextResponse.json({ messages });
    }

    const memeCaption = await translatePetPhoto(
      imageBase64,
      mediaType as MediaType,
      voiceStyle as VoiceStyle,
      cleanName || undefined,
      cleanGender
    );

    return NextResponse.json({
      caption: { top: memeCaption.top, bottom: memeCaption.bottom },
      petFaceY: memeCaption.petFaceY,
    });
  } catch (err) {
    console.error("Translation error:", err);
    return NextResponse.json(
      { error: "Our pet translator is taking a nap. Please try again in a moment!" },
      { status: 500 }
    );
  }
}
