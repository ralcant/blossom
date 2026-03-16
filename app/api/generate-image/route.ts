import { NextRequest, NextResponse } from "next/server";
import { generateImage } from "@/lib/ai/fal";

export const runtime = "nodejs"; // fal.ai SDK requires nodejs runtime

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lyric, styleTemplate } = body;

    if (!lyric) {
      return NextResponse.json(
        { error: "No lyric text provided" },
        { status: 400 }
      );
    }

    if (!styleTemplate) {
      return NextResponse.json(
        { error: "No style template provided" },
        { status: 400 }
      );
    }

    console.log("Generating image for lyric:", lyric);

    // Generate image with fal.ai
    const result = await generateImage(lyric, styleTemplate);

    console.log("Image generated successfully:", result.url);

    return NextResponse.json({
      url: result.url,
      width: result.width,
      height: result.height,
    });
  } catch (error) {
    console.error("Image generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate image",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
