import { LyricPhrase } from "@/types/project";

/**
 * Parse plain text lyrics into phrases
 * Splits by line breaks and filters out empty lines
 */
export function parseLyrics(lyricsText: string): Omit<LyricPhrase, "startTime" | "endTime" | "imageUrl" | "imagePrompt" | "animation">[] {
  if (!lyricsText || !lyricsText.trim()) {
    return [];
  }

  // Split by line breaks
  const lines = lyricsText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  // Create phrase objects (timestamps will be added later by alignment)
  return lines.map((text, index) => ({
    id: `phrase-${index}-${Date.now()}`,
    text,
  }));
}

/**
 * Validate lyrics text
 */
export function validateLyrics(lyricsText: string): { valid: boolean; error?: string } {
  if (!lyricsText || !lyricsText.trim()) {
    return {
      valid: false,
      error: "Lyrics cannot be empty",
    };
  }

  const phrases = parseLyrics(lyricsText);

  if (phrases.length === 0) {
    return {
      valid: false,
      error: "No valid lyric phrases found",
    };
  }

  if (phrases.length > 50) {
    return {
      valid: false,
      error: "Too many lyric phrases (maximum 50)",
    };
  }

  return { valid: true };
}
