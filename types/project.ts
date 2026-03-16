export type AnimationType = "zoomIn" | "zoomOut" | "panLeft" | "panRight" | "kenBurns" | "static";

export interface GeneratedImage {
  url: string;
  prompt: string;
  generatedAt: number;
}

export interface LyricPhrase {
  id: string;
  text: string;
  startTime: number;  // in seconds (endTime is calculated at runtime from next phrase's startTime)
  imageUrl: string;
  imagePrompt: string;
  customPrompt?: string;  // User-edited prompt template (with {{lyric}}, {{font}}, etc.)
  animation: AnimationType;
  generatedImages?: GeneratedImage[];  // History of all generated images
}

export interface Project {
  id: string;
  title: string;
  videoTitle?: string;      // Title to display in the video
  videoDescription?: string; // Description to display in the video
  coverImageUrl?: string;   // Cover image for title scene
  coverImages?: GeneratedImage[];  // History of all generated cover images
  coverPrompt?: string;     // Custom prompt for cover image (with {{title}}, {{font}}, etc.)
  font?: string;            // Font style for text in images
  textColor?: string;       // Color of text in images
  audioUrl: string;
  audioDuration: number;  // in seconds
  styleTemplate: string;
  createdAt: number;  // timestamp
  lyrics: LyricPhrase[];
  originalTimestamps?: number[]; // Original startTimes from Whisper (for reset)
  whisperResponse?: any;    // Full Whisper API response for debugging
}

export interface StyleTemplate {
  id: string;
  name: string;
  description: string;
  promptTemplate: string;
}

export const FONT_OPTIONS = [
  { id: "serif", name: "Serif", description: "Classic and elegant" },
  { id: "sans-serif", name: "Sans Serif", description: "Modern and clean" },
  { id: "script", name: "Script", description: "Handwritten style" },
  { id: "bold", name: "Bold", description: "Strong and impactful" },
  { id: "handwritten", name: "Handwritten", description: "Casual and personal" },
];

export const TEXT_COLOR_OPTIONS = [
  { id: "white", name: "White", hex: "#FFFFFF" },
  { id: "neon", name: "Neon", hex: "#00FF00" },
  { id: "gold", name: "Gold", hex: "#FFD700" },
  { id: "pink", name: "Pink", hex: "#FF69B4" },
  { id: "blue", name: "Blue", hex: "#00BFFF" },
];

export const STYLE_TEMPLATES: StyleTemplate[] = [
  {
    id: "dreamy",
    name: "Dreamy Clouds",
    description: "Soft, ethereal landscapes with pastel colors",
    promptTemplate: "dreamy ethereal landscape with elegant {{font}} {{color}} text '{{lyric}}' seamlessly integrated into the scene, text embedded in the image, soft pastel colors, peaceful atmosphere, calm vibes, 16:9",
  },
  {
    id: "bold",
    name: "Bold & Vibrant",
    description: "High contrast with vibrant colors",
    promptTemplate: "vibrant bold abstract art with glowing {{font}} {{color}} text '{{lyric}}' as the main focal point, text embedded in the image, high contrast, energetic colors, dynamic composition, 16:9",
  },
  {
    id: "minimal",
    name: "Minimalist",
    description: "Clean, simple design",
    promptTemplate: "minimalist clean design with elegant {{font}} {{color}} text '{{lyric}}' harmoniously placed, text embedded in the image, simple geometric shapes, monochromatic tones, refined aesthetic, 16:9",
  },
];
