import { NextRequest, NextResponse } from "next/server";
import { generatePetReply, type ConvoMessage, type VoiceStyle } from "@/lib/anthropic";
import { resizeForClaude } from "@/lib/serverImage";
import { supabaseAdmin } from "@/lib/supabaseServer";

export const maxDuration = 30;

// Global daily cap for free API calls (cost protection) — replies draw from the
// same 15K/day global pool as translations since they cost real money too.
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

// Transcript limits (matches the contract)
const MAX_MESSAGES = 40;
const MAX_MESSAGE_LENGTH = 500;
const MAX_REPLY_LENGTH = 280;

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Whoa, slow down! Your pet is still typing. Try again in a minute." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { imageBase64, mediaType, voiceStyle = "funny", petName, gender, messages, reply, customerId } = body;

    // Validate customerId format (Stripe customer IDs start with "cus_")
    const validCustomerId = typeof customerId === "string" && customerId.startsWith("cus_") ? customerId : null;

    // Free user (no valid customerId) → check global daily cap. Replies cost real
    // API money too, so they draw from the same pool as translations.
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
        { error: "We need the original photo to keep the conversation going!" },
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

    // Validate the conversation transcript so far
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
      return NextResponse.json(
        { error: "This conversation got a little tangled. Start a fresh one and try again!" },
        { status: 400 }
      );
    }

    // Sanitize each transcript message: valid sender + trimmed, capped text
    const cleanMessages: ConvoMessage[] = [];
    for (const m of messages) {
      if (
        typeof m !== "object" ||
        m === null ||
        (m.sender !== "pet" && m.sender !== "owner") ||
        typeof m.text !== "string"
      ) {
        return NextResponse.json(
          { error: "This conversation got a little tangled. Start a fresh one and try again!" },
          { status: 400 }
        );
      }
      cleanMessages.push({ sender: m.sender, text: m.text.slice(0, MAX_MESSAGE_LENGTH) });
    }

    // Validate the owner's new reply
    if (typeof reply !== "string" || reply.trim().length === 0) {
      return NextResponse.json(
        { error: "Type something to send to your pet first!" },
        { status: 400 }
      );
    }
    const cleanReply = reply.trim().slice(0, MAX_REPLY_LENGTH);

    // Validate optional personalization (same rules as /api/translate)
    const cleanName = typeof petName === "string"
      ? petName.replace(/[^a-zA-Z0-9 .\-']/g, "").slice(0, 20).trim() || undefined
      : undefined;
    const validGenders = ["male", "female"];
    const cleanGender = validGenders.includes(gender) ? gender : undefined;

    // Server appends the owner's new reply to the transcript before generating.
    const transcript: ConvoMessage[] = [...cleanMessages, { sender: "owner", text: cleanReply }];

    const resized = await resizeForClaude(imageBase64, mediaType as MediaType);

    const petMessages = await generatePetReply(
      resized.base64,
      resized.mediaType,
      voiceStyle as VoiceStyle,
      transcript,
      cleanName || undefined,
      cleanGender
    );

    return NextResponse.json({ messages: petMessages });
  } catch (err) {
    console.error("Reply error:", err);
    return NextResponse.json(
      { error: "Your pet got distracted mid-text. Please try again in a moment!" },
      { status: 500 }
    );
  }
}
