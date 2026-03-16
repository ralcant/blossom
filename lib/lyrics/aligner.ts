import { WordTimestamp } from "../ai/speech";

export interface AlignedPhrase {
  phraseIndex: number;
  text: string;
  startTime: number;
  endTime: number;
  confidence: number; // 0-1, how well the phrase matched
}

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching of transcribed text vs user lyrics
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Normalize text for comparison: lowercase, remove punctuation, extra spaces
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Calculate similarity score (0-1) between two strings
 */
function similarityScore(str1: string, str2: string): number {
  const norm1 = normalizeText(str1);
  const norm2 = normalizeText(str2);

  if (norm1 === norm2) return 1;

  const maxLen = Math.max(norm1.length, norm2.length);
  if (maxLen === 0) return 0;

  const distance = levenshteinDistance(norm1, norm2);
  return 1 - distance / maxLen;
}

/**
 * Align user's lyric phrases with transcribed word timestamps
 *
 * Algorithm:
 * 1. Normalize both transcription and user lyrics
 * 2. For each user phrase, find best matching sequence in transcription
 * 3. Assign timestamps based on word-level timings
 * 4. Return aligned phrases with confidence scores
 */
export function alignLyrics(
  transcribedWords: WordTimestamp[],
  userPhrases: string[]
): AlignedPhrase[] {
  const alignedPhrases: AlignedPhrase[] = [];

  // Build full transcription text for context
  const fullTranscription = transcribedWords.map((w) => w.word).join(" ");

  let wordIndex = 0; // Track position in transcribed words

  for (let phraseIndex = 0; phraseIndex < userPhrases.length; phraseIndex++) {
    const userPhrase = userPhrases[phraseIndex];
    const normalizedPhrase = normalizeText(userPhrase);
    const phraseWords = normalizedPhrase.split(" ").filter((w) => w.length > 0);

    if (phraseWords.length === 0) {
      // Empty phrase, skip
      continue;
    }

    // Find best matching window in transcribed words
    let bestMatch = {
      startIndex: wordIndex,
      endIndex: wordIndex,
      score: 0,
    };

    // Search for matching window starting from current position
    const searchRange = Math.min(transcribedWords.length, wordIndex + phraseWords.length * 3);

    for (let i = wordIndex; i < searchRange; i++) {
      // Try different window sizes around the phrase length
      const minWindow = Math.max(1, phraseWords.length - 2);
      const maxWindow = phraseWords.length + 3;

      for (let windowSize = minWindow; windowSize <= maxWindow; windowSize++) {
        if (i + windowSize > transcribedWords.length) break;

        const windowWords = transcribedWords
          .slice(i, i + windowSize)
          .map((w) => w.word)
          .join(" ");

        const score = similarityScore(userPhrase, windowWords);

        if (score > bestMatch.score) {
          bestMatch = {
            startIndex: i,
            endIndex: i + windowSize - 1,
            score,
          };
        }
      }
    }

    // Use the best match if score is reasonable
    if (bestMatch.score > 0.3 && bestMatch.endIndex < transcribedWords.length) {
      const startWord = transcribedWords[bestMatch.startIndex];
      const endWord = transcribedWords[bestMatch.endIndex];

      alignedPhrases.push({
        phraseIndex,
        text: userPhrase,
        startTime: startWord.start,
        endTime: endWord.end,
        confidence: bestMatch.score,
      });

      // Move word index forward to avoid overlap
      wordIndex = bestMatch.endIndex + 1;
    } else {
      // Fallback: estimate based on position in song
      const estimatedStart = phraseIndex > 0
        ? alignedPhrases[phraseIndex - 1].endTime + 0.5
        : 0;
      const estimatedDuration = phraseWords.length * 0.5; // ~0.5s per word

      alignedPhrases.push({
        phraseIndex,
        text: userPhrase,
        startTime: estimatedStart,
        endTime: estimatedStart + estimatedDuration,
        confidence: 0,
      });
    }
  }

  return alignedPhrases;
}

/**
 * Validate alignment quality
 * Returns warnings if alignment seems poor
 */
export function validateAlignment(
  alignedPhrases: AlignedPhrase[]
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // Check for low confidence matches
  const lowConfidence = alignedPhrases.filter((p) => p.confidence < 0.5);
  if (lowConfidence.length > alignedPhrases.length * 0.3) {
    warnings.push(
      `${lowConfidence.length} phrases have low confidence alignment. ` +
      "Consider manually adjusting timestamps."
    );
  }

  // Check for overlapping timestamps
  for (let i = 1; i < alignedPhrases.length; i++) {
    if (alignedPhrases[i].startTime < alignedPhrases[i - 1].endTime) {
      warnings.push(
        `Phrase ${i} overlaps with previous phrase. ` +
        "Timestamps may need adjustment."
      );
    }
  }

  // Check for very short or very long phrases
  alignedPhrases.forEach((phrase, i) => {
    const duration = phrase.endTime - phrase.startTime;
    if (duration < 0.3) {
      warnings.push(`Phrase ${i} is very short (${duration.toFixed(1)}s)`);
    } else if (duration > 10) {
      warnings.push(`Phrase ${i} is very long (${duration.toFixed(1)}s)`);
    }
  });

  return {
    valid: warnings.length < 5, // Valid if fewer than 5 warnings
    warnings,
  };
}
