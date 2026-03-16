import * as fal from "@fal-ai/serverless-client";

export interface ImageGenerationResult {
  url: string;
  width: number;
  height: number;
}

/**
 * Generate an image with embedded lyrics using fal.ai FLUX Pro v1.1 Ultra (Nano Banana)
 * @param lyric The lyric text to embed in the image
 * @param styleTemplate The prompt template with {lyric} placeholder
 * @returns Generated image URL
 */
export async function generateImage(
  lyric: string,
  styleTemplate: string
): Promise<ImageGenerationResult> {
  const apiKey = process.env.FAL_AI_API_KEY;

  if (!apiKey) {
    throw new Error("FAL_AI_API_KEY not configured");
  }

  // Configure fal.ai client
  fal.config({
    credentials: apiKey,
  });

  // Replace {lyric} placeholder in template
  const prompt = styleTemplate.replace("{lyric}", lyric);

  console.log("Generating image with prompt:", prompt.substring(0, 100) + "...");

  // Call fal.ai FLUX Nano Banana model
  const result = await fal.subscribe("fal-ai/nano-banana", {
    input: {
      prompt,
      aspect_ratio: "16:9",
      num_images: 1,
    },
    logs: false,
  });

  const image = (result as any).images?.[0];

  if (!image?.url) {
    throw new Error("No image returned from fal.ai");
  }

  return {
    url: image.url,
    width: image.width || 1024,
    height: image.height || 576,
  };
}

/**
 * Generate images for multiple lyrics in sequence
 * @param lyrics Array of lyric texts
 * @param styleTemplate The prompt template
 * @param onProgress Callback for progress updates
 */
export async function generateImagesForLyrics(
  lyrics: string[],
  styleTemplate: string,
  onProgress?: (completed: number, total: number) => void
): Promise<ImageGenerationResult[]> {
  const results: ImageGenerationResult[] = [];

  for (let i = 0; i < lyrics.length; i++) {
    const result = await generateImage(lyrics[i], styleTemplate);
    results.push(result);

    if (onProgress) {
      onProgress(i + 1, lyrics.length);
    }
  }

  return results;
}
