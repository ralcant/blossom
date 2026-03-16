import * as sdk from "microsoft-cognitiveservices-speech-sdk";

export interface WordTimestamp {
  word: string;
  start: number;  // in seconds
  end: number;    // in seconds
}

export interface SentenceTimestamp {
  text: string;
  start: number;  // in seconds
  end: number;    // in seconds
}

export interface TranscriptionResult {
  text: string;
  words: WordTimestamp[];
  sentences: SentenceTimestamp[];
}

/**
 * Transcribe audio using Azure OpenAI Whisper API
 * Returns full transcription text with word-level timestamps
 */
export async function transcribeAudio(
  audioUrl: string
): Promise<TranscriptionResult> {
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "whisper";

  if (!apiKey || !endpoint) {
    throw new Error("Azure OpenAI credentials not configured. Set AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT");
  }

  console.log("Downloading audio file...");
  // Download audio file
  const audioResponse = await fetch(audioUrl);
  if (!audioResponse.ok) {
    throw new Error(`Failed to download audio: ${audioResponse.statusText}`);
  }
  const audioBuffer = await audioResponse.arrayBuffer();
  console.log(`Downloaded ${audioBuffer.byteLength} bytes`);

  // Create form data with audio file
  const formData = new FormData();
  const audioBlob = new Blob([audioBuffer], { type: "audio/mpeg" });
  formData.append("file", audioBlob, "audio.mp3");
  formData.append("response_format", "verbose_json");
  formData.append("timestamp_granularities[]", "word");

  // Azure OpenAI Whisper endpoint
  const whisperUrl = `${endpoint}/openai/deployments/${deploymentName}/audio/transcriptions?api-version=2024-02-01`;

  console.log("Sending to Azure OpenAI Whisper API...");
  const response = await fetch(whisperUrl, {
    method: "POST",
    headers: {
      "api-key": apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Azure OpenAI Whisper error:", errorText);
    throw new Error(`Azure OpenAI Whisper failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log("Received Whisper transcription result");

  // Extract text and word-level timestamps
  const text = result.text || "";
  const words: WordTimestamp[] = [];

  // Extract word-level timestamps from Whisper response
  if (result.words && Array.isArray(result.words)) {
    result.words.forEach((wordInfo: any) => {
      words.push({
        word: wordInfo.word,
        start: wordInfo.start,
        end: wordInfo.end,
      });
    });
  }

  console.log(`Transcription complete: ${words.length} words extracted`);

  // Segment words into sentences/phrases
  const sentences = segmentIntoSentences(words);
  console.log(`Segmented into ${sentences.length} sentences`);

  return {
    text,
    words,
    sentences,
  };
}

/**
 * Segment words into sentences based on punctuation or word count
 * Each sentence will be 8-12 words for good visual phrasing
 */
function segmentIntoSentences(words: WordTimestamp[]): SentenceTimestamp[] {
  if (words.length === 0) return [];

  const sentences: SentenceTimestamp[] = [];
  let currentSentence: WordTimestamp[] = [];
  const targetWordsPerSentence = 10; // Aim for ~10 words per phrase

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    currentSentence.push(word);

    // Check if we should end the sentence
    const shouldEndSentence =
      // End on punctuation
      /[.!?;]$/.test(word.word) ||
      // Or if we've reached target word count
      currentSentence.length >= targetWordsPerSentence ||
      // Or if this is the last word
      i === words.length - 1;

    if (shouldEndSentence && currentSentence.length > 0) {
      // Create sentence from accumulated words
      const sentenceText = currentSentence.map(w => w.word).join(' ');
      const sentenceStart = currentSentence[0].start;
      const sentenceEnd = currentSentence[currentSentence.length - 1].end;

      sentences.push({
        text: sentenceText,
        start: sentenceStart,
        end: sentenceEnd,
      });

      currentSentence = [];
    }
  }

  return sentences;
}
