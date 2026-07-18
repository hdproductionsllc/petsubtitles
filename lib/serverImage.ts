import sharp from "sharp";

/** Sweet spot for Claude vision tiles — anything larger costs tokens we can't use. */
const MAX_EDGE = 768;
const JPEG_QUALITY = 85;

export type SupportedMediaType =
  | "image/jpeg"
  | "image/png"
  | "image/gif"
  | "image/webp";

export interface ResizedImage {
  base64: string;
  mediaType: SupportedMediaType;
}

/**
 * Resize an inbound base64 image down to MAX_EDGE on its longest side and
 * recompress as JPEG. GIFs are passed through (animation matters for some
 * meme inputs and Claude handles them natively).
 *
 * Failures fall back to the original buffer — never block a user on a resize bug.
 */
export async function resizeForClaude(
  base64: string,
  mediaType: SupportedMediaType
): Promise<ResizedImage> {
  if (mediaType === "image/gif") {
    return { base64, mediaType };
  }

  try {
    const input = Buffer.from(base64, "base64");
    const meta = await sharp(input).metadata();
    const longest = Math.max(meta.width ?? 0, meta.height ?? 0);

    // Already small enough — re-encode would cost CPU for no token savings.
    if (longest && longest <= MAX_EDGE && mediaType === "image/jpeg") {
      return { base64, mediaType };
    }

    const out = await sharp(input)
      .rotate() // honor EXIF orientation
      .resize({
        width: MAX_EDGE,
        height: MAX_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer();

    return { base64: out.toString("base64"), mediaType: "image/jpeg" };
  } catch {
    return { base64, mediaType };
  }
}
