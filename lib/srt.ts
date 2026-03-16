import { LyricPhrase } from "@/types/project";

/**
 * Convert seconds to SRT timestamp format (HH:MM:SS,mmm)
 */
function secondsToSrtTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
}

/**
 * Convert SRT timestamp format (HH:MM:SS,mmm) to seconds
 */
function srtTimestampToSeconds(timestamp: string): number {
  const [time, ms] = timestamp.split(',');
  const [hours, minutes, seconds] = time.split(':').map(Number);
  const milliseconds = Number(ms);

  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
}

/**
 * Convert lyrics array to SRT format string
 */
export function convertToSrt(lyrics: LyricPhrase[], audioDuration: number): string {
  let srt = '';

  lyrics.forEach((phrase, index) => {
    // Calculate endTime from next phrase's startTime (or use audioDuration for last phrase)
    const endTime = index < lyrics.length - 1
      ? lyrics[index + 1].startTime
      : audioDuration;

    const startTimestamp = secondsToSrtTimestamp(phrase.startTime);
    const endTimestamp = secondsToSrtTimestamp(endTime);

    srt += `${index + 1}\n`;
    srt += `${startTimestamp} --> ${endTimestamp}\n`;
    srt += `${phrase.text}\n\n`;
  });

  return srt.trim();
}

/**
 * Parse SRT file content and return lyrics array
 */
export function parseSrt(srtContent: string): LyricPhrase[] {
  const lyrics: LyricPhrase[] = [];

  // Split by double newline to get subtitle blocks
  const blocks = srtContent.trim().split(/\n\s*\n/);

  blocks.forEach((block) => {
    const lines = block.trim().split('\n');

    if (lines.length < 3) return; // Skip invalid blocks

    // Line 0: subtitle number (we'll ignore this)
    // Line 1: timestamps
    // Line 2+: text content

    const timestampLine = lines[1];
    const timestampMatch = timestampLine.match(/^(.+?)\s*-->\s*(.+?)$/);

    if (!timestampMatch) return; // Skip invalid timestamp format

    const startTime = srtTimestampToSeconds(timestampMatch[1].trim());
    const text = lines.slice(2).join('\n'); // Join remaining lines as text

    lyrics.push({
      id: `phrase-${Date.now()}-${Math.random()}`,
      text,
      startTime,
      imageUrl: "",
      imagePrompt: "",
      animation: "zoomIn",
    });
  });

  return lyrics;
}

/**
 * Download SRT file
 */
export function downloadSrt(lyrics: LyricPhrase[], audioDuration: number, filename: string) {
  const srtContent = convertToSrt(lyrics, audioDuration);
  const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.srt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
