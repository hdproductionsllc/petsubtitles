import { NextRequest, NextResponse } from "next/server";
import { detectPet } from "@/lib/anthropic";
import { resizeForClaude } from "@/lib/serverImage";

export const maxDuration = 15;

const VALID_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

type MediaType = (typeof VALID_MEDIA_TYPES)[number];

const MAX_BASE64_LENGTH = 7_000_000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, mediaType } = body;

    if (!imageBase64 || !mediaType) {
      return NextResponse.json(
        { error: "Missing image data", hasPet: true },
        { status: 400 }
      );
    }

    if (imageBase64.length > MAX_BASE64_LENGTH) {
      return NextResponse.json(
        { error: "Image too large", hasPet: true },
        { status: 400 }
      );
    }

    if (!VALID_MEDIA_TYPES.includes(mediaType as MediaType)) {
      return NextResponse.json(
        { error: "Unsupported format", hasPet: true },
        { status: 400 }
      );
    }

    const resized = await resizeForClaude(imageBase64, mediaType as MediaType);
    const hasPet = await detectPet(resized.base64, resized.mediaType);
    return NextResponse.json({ hasPet });
  } catch (err) {
    console.error("Pet detection error:", err);
    // Fail-open: don't block users on detection errors
    return NextResponse.json({ hasPet: true });
  }
}
