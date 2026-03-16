import { NextRequest, NextResponse } from "next/server";
import { bundle } from "@remotion/bundler";
import { getCompositions, renderMedia } from "@remotion/renderer";
import { put } from "@vercel/blob";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";

export const maxDuration = 300; // 5 minutes for rendering

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, lyrics, audioUrl, audioDuration, videoTitle, videoDescription, coverImageUrl } = body;

    if (!lyrics || !audioUrl || !audioDuration) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    console.log("Starting render for project:", projectId);

    // 1. Bundle the Remotion project
    console.log("Bundling Remotion project...");
    const bundleLocation = await bundle({
      entryPoint: join(process.cwd(), "remotion/index.ts"),
      webpackOverride: (config) => config,
    });

    console.log("Bundle created at:", bundleLocation);

    // 2. Get compositions
    console.log("Getting compositions...");
    const inputProps = {
      lyrics,
      audioUrl,
      audioDuration,
      videoTitle,
      videoDescription,
      coverImageUrl,
    };

    const compositions = await getCompositions(bundleLocation, {
      inputProps,
    });

    const composition = compositions.find((c) => c.id === "KaraokeVideo");

    if (!composition) {
      throw new Error("KaraokeVideo composition not found");
    }

    console.log("Composition found:", composition.id);

    // 3. Render the video
    const outputLocation = join(tmpdir(), `${projectId}-${Date.now()}.mp4`);

    console.log("Rendering video to:", outputLocation);
    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: "h264",
      outputLocation,
      inputProps,
    });

    console.log("Video rendered successfully");

    // 4. Upload to Vercel Blob
    console.log("Uploading to Vercel Blob...");
    const videoBuffer = await fs.readFile(outputLocation);
    const blob = await put(`videos/${projectId}-${Date.now()}.mp4`, videoBuffer, {
      access: "public",
      contentType: "video/mp4",
    });

    console.log("Video uploaded to:", blob.url);

    // 5. Clean up temp file
    await fs.unlink(outputLocation).catch(() => {});

    return NextResponse.json({
      success: true,
      videoUrl: blob.url,
      downloadUrl: blob.downloadUrl,
    });
  } catch (error: any) {
    console.error("Render error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to render video" },
      { status: 500 }
    );
  }
}
