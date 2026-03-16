import { NextRequest, NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/ai/speech";

export const runtime = "nodejs"; // Azure Speech SDK requires nodejs runtime

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { audioUrl } = body;

    if (!audioUrl) {
      return NextResponse.json(
        { error: "No audio URL provided" },
        { status: 400 }
      );
    }

    console.log("Starting transcription for:", audioUrl);

    // Transcribe audio with Azure Speech Service - returns sentences with timestamps
    const transcription = await transcribeAudio(audioUrl);

    console.log("Transcription complete:", {
      text: transcription.text.substring(0, 100) + "...",
      sentenceCount: transcription.sentences.length,
    });

    // Convert sentences to aligned phrases format
    const alignedPhrases = transcription.sentences.map((sentence, index) => ({
      id: `phrase-${index}-${Date.now()}`,
      text: sentence.text,
      startTime: sentence.start,
      endTime: sentence.end,
      confidence: 1.0, // Azure Speech doesn't provide sentence-level confidence
    }));

    // Calculate total duration from the last sentence's end time
    const duration = transcription.sentences.length > 0
      ? transcription.sentences[transcription.sentences.length - 1].end
      : 0;

    return NextResponse.json({
      transcription: {
        text: transcription.text,
        sentenceCount: transcription.sentences.length,
      },
      alignedPhrases,
      duration, // Add duration from Whisper transcription
      validation: {
        valid: true,
        warnings: [],
      },
    });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      {
        error: "Failed to transcribe audio",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
