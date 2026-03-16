"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ProjectStorage } from "@/lib/storage";
import { Project } from "@/types/project";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Timeline } from "@/components/editor/Timeline";
import { ImagePreview } from "@/components/editor/ImagePreview";
import { VideoPreview } from "@/components/editor/VideoPreview";
import { STYLE_TEMPLATES, FONT_OPTIONS, TEXT_COLOR_OPTIONS } from "@/types/project";
import { downloadSrt } from "@/lib/srt";
import { ImageHistoryModal } from "@/components/editor/ImageHistoryModal";
import { PromptEditorModal } from "@/components/editor/PromptEditorModal";

export default function EditorPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [project, setProject] = useState<Project | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState("");
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
  const [regeneratingPhraseId, setRegeneratingPhraseId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [imageHistoryModal, setImageHistoryModal] = useState<{
    isOpen: boolean;
    type: "cover" | "lyric";
    phraseId?: string;
  }>({ isOpen: false, type: "cover" });
  const [isRendering, setIsRendering] = useState(false);
  const [renderError, setRenderError] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [promptEditor, setPromptEditor] = useState<{
    isOpen: boolean;
    type: "cover" | "lyric";
    phraseId?: string;
  }>({ isOpen: false, type: "cover" });
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");

  useEffect(() => {
    const loadedProject = ProjectStorage.load(projectId);
    setProject(loadedProject);

    // Auto-trigger transcription if not done yet
    if (loadedProject && !hasTimestamps(loadedProject)) {
      transcribeAudio(loadedProject);
    }
  }, [projectId]);

  const hasTimestamps = (proj: Project): boolean => {
    // Project has timestamps if it has any lyrics (they come from transcription)
    return proj.lyrics.length > 0;
  };

  const hasImages = (proj: Project): boolean => {
    return proj.lyrics.length > 0 && proj.lyrics.some((l) => l.imageUrl.length > 0);
  };

  const generateAllImages = async (proj: Project) => {
    setIsGeneratingImages(true);
    setGenerationProgress({ current: 0, total: proj.lyrics.length });

    try {
      // Get default template
      const defaultTemplate =
        STYLE_TEMPLATES.find((t) => t.id === proj.styleTemplate)?.promptTemplate ||
        STYLE_TEMPLATES[0].promptTemplate;

      // Get font and color settings
      const font = proj.font || "elegant";
      const colorName = proj.textColor || "white";
      const color = TEXT_COLOR_OPTIONS.find(c => c.id === colorName)?.name.toLowerCase() || "white";

      const updatedLyrics = [...proj.lyrics];

      // Generate images sequentially
      for (let i = 0; i < proj.lyrics.length; i++) {
        const phrase = proj.lyrics[i];

        // Get the prompt template (custom or default)
        const promptTemplate = phrase.customPrompt || defaultTemplate;

        // Replace placeholders in template
        const finalPrompt = promptTemplate
          .replace(/\{\{lyric\}\}/g, phrase.text)
          .replace(/\{\{font\}\}/g, font)
          .replace(/\{\{color\}\}/g, color);

        const response = await fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lyric: phrase.text,
            styleTemplate: finalPrompt,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error(`Failed to generate image for phrase ${i}:`, error);
          continue;
        }

        const { url } = await response.json();

        // Add to generated images history
        const newImage = {
          url,
          prompt: finalPrompt,
          generatedAt: Date.now(),
        };

        const existingImages = updatedLyrics[i].generatedImages || [];

        updatedLyrics[i] = {
          ...updatedLyrics[i],
          imageUrl: url,
          imagePrompt: finalPrompt,
          generatedImages: [...existingImages, newImage],
        };

        setGenerationProgress({ current: i + 1, total: proj.lyrics.length });

        // Update project in real-time as images are generated
        const updatedProject = { ...proj, lyrics: updatedLyrics };
        ProjectStorage.save(updatedProject);
        setProject(updatedProject);
      }
    } catch (error) {
      console.error("Image generation error:", error);
    } finally {
      setIsGeneratingImages(false);
    }
  };

  const regenerateImage = async (phraseId: string) => {
    if (!project) return;

    setRegeneratingPhraseId(phraseId);

    try {
      const phraseIndex = project.lyrics.findIndex((l) => l.id === phraseId);
      if (phraseIndex === -1) return;

      const phrase = project.lyrics[phraseIndex];

      // Get the prompt template (custom or default)
      const promptTemplate = phrase.customPrompt || (
        STYLE_TEMPLATES.find((t) => t.id === project.styleTemplate)?.promptTemplate ||
        STYLE_TEMPLATES[0].promptTemplate
      );

      // Get font and color settings
      const font = project.font || "elegant";
      const colorName = project.textColor || "white";
      const color = TEXT_COLOR_OPTIONS.find(c => c.id === colorName)?.name.toLowerCase() || "white";

      // Replace placeholders in template
      const finalPrompt = promptTemplate
        .replace(/\{\{lyric\}\}/g, phrase.text)
        .replace(/\{\{font\}\}/g, font)
        .replace(/\{\{color\}\}/g, color);

      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lyric: phrase.text,
          styleTemplate: finalPrompt,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to regenerate image");
      }

      const { url } = await response.json();

      const updatedLyrics = [...project.lyrics];

      // Add to generated images history
      const newImage = {
        url,
        prompt: finalPrompt,
        generatedAt: Date.now(),
      };

      const existingImages = updatedLyrics[phraseIndex].generatedImages || [];

      updatedLyrics[phraseIndex] = {
        ...updatedLyrics[phraseIndex],
        imageUrl: url,
        imagePrompt: finalPrompt,
        generatedImages: [...existingImages, newImage],
      };

      const updatedProject = { ...project, lyrics: updatedLyrics };
      ProjectStorage.save(updatedProject);
      setProject(updatedProject);
    } catch (error) {
      console.error("Image regeneration error:", error);
    } finally {
      setRegeneratingPhraseId(null);
    }
  };

  const resetTimings = () => {
    if (!project || !project.originalTimestamps) return;

    // Only reset startTime - endTime is calculated automatically in sequential timeline
    const updatedLyrics = project.lyrics.map((lyric, index) => ({
      ...lyric,
      startTime: project.originalTimestamps![index] || lyric.startTime,
    }));

    const updatedProject = { ...project, lyrics: updatedLyrics };
    ProjectStorage.save(updatedProject);
    setProject(updatedProject);
  };

  const generateCoverImage = async (proj: Project) => {
    setIsGeneratingCover(true);

    try {
      // Get the prompt template (custom or default)
      let promptTemplate = proj.coverPrompt;
      if (!promptTemplate) {
        const styleTemplate = STYLE_TEMPLATES.find((t) => t.id === proj.styleTemplate)?.promptTemplate ||
          STYLE_TEMPLATES[0].promptTemplate;
        // Convert {{lyric}} to {{title}} for cover
        promptTemplate = styleTemplate.replace(/\{\{lyric\}\}/g, "{{title}}");
      }

      // Get font and color settings
      const font = proj.font || "elegant";
      const colorName = proj.textColor || "white";
      const color = TEXT_COLOR_OPTIONS.find(c => c.id === colorName)?.name.toLowerCase() || "white";

      // Create text for cover image - include both title and description if available
      const titleText = proj.videoTitle || proj.title || "Music Video";
      const coverText = proj.videoDescription
        ? `${titleText} - ${proj.videoDescription}`
        : titleText;

      // Replace placeholders in template
      const finalPrompt = promptTemplate
        .replace(/\{\{title\}\}/g, coverText)
        .replace(/\{\{font\}\}/g, font)
        .replace(/\{\{color\}\}/g, color);

      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lyric: coverText,
          styleTemplate: finalPrompt,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate cover image");
      }

      const { url } = await response.json();

      // Add to cover images history
      const newImage = {
        url,
        prompt: finalPrompt,
        generatedAt: Date.now(),
      };

      const existingImages = proj.coverImages || [];

      const updatedProject = {
        ...proj,
        coverImageUrl: url,
        coverImages: [...existingImages, newImage],
      };
      ProjectStorage.save(updatedProject);
      setProject(updatedProject);
    } catch (error) {
      console.error("Cover image generation error:", error);
    } finally {
      setIsGeneratingCover(false);
    }
  };

  const transcribeAudio = async (proj: Project) => {
    setIsTranscribing(true);
    setTranscriptionError("");

    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioUrl: proj.audioUrl,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || "Transcription failed");
      }

      const whisperData = await response.json();
      const { alignedPhrases, validation, duration } = whisperData;

      // Create lyrics from Azure Speech transcription sentences (only startTime, endTime calculated at runtime)
      const updatedLyrics = alignedPhrases.map((phrase: any) => ({
        id: phrase.id || `phrase-${Date.now()}-${Math.random()}`,
        text: phrase.text,
        startTime: phrase.startTime,
        imageUrl: "",
        imagePrompt: "",
        animation: "zoomIn" as const,
      }));

      // Save original timestamps for reset functionality
      const originalTimestamps = updatedLyrics.map((l: any) => l.startTime);

      const updatedProject = {
        ...proj,
        lyrics: updatedLyrics,
        originalTimestamps,
        audioDuration: duration || proj.audioDuration, // Update duration from transcription
        whisperResponse: whisperData, // Store full Azure Speech response for debugging
      };

      ProjectStorage.save(updatedProject);
      setProject(updatedProject);

      if (validation.warnings.length > 0) {
        console.warn("Alignment warnings:", validation.warnings);
      }
    } catch (error) {
      console.error("Transcription error:", error);
      setTranscriptionError(
        error instanceof Error ? error.message : "Failed to transcribe audio"
      );
    } finally {
      setIsTranscribing(false);
    }
  };

  const insertPhraseAfter = (afterIndex: number) => {
    if (!project) return;

    // Calculate the middle timestamp between this phrase and the next one
    const currentPhrase = project.lyrics[afterIndex];
    const nextPhrase = project.lyrics[afterIndex + 1];

    if (!nextPhrase) return; // Can't insert after the last phrase

    const middleTimestamp = (currentPhrase.startTime + nextPhrase.startTime) / 2;

    // Create new phrase
    const newPhrase = {
      id: `phrase-${Date.now()}-${Math.random()}`,
      text: "", // Empty text for user to fill in
      startTime: middleTimestamp,
      imageUrl: "",
      imagePrompt: "",
      animation: "zoomIn" as const,
    };

    // Insert into lyrics array
    const updatedLyrics = [
      ...project.lyrics.slice(0, afterIndex + 1),
      newPhrase,
      ...project.lyrics.slice(afterIndex + 1),
    ];

    const updatedProject = { ...project, lyrics: updatedLyrics };
    ProjectStorage.save(updatedProject);
    setProject(updatedProject);
  };

  const deletePhraseAtIndex = (index: number) => {
    if (!project) return;

    // Remove phrase from lyrics array
    const updatedLyrics = project.lyrics.filter((_, i) => i !== index);

    const updatedProject = { ...project, lyrics: updatedLyrics };
    ProjectStorage.save(updatedProject);
    setProject(updatedProject);
  };

  const selectCoverImageFromHistory = (url: string) => {
    if (!project) return;

    const updatedProject = { ...project, coverImageUrl: url };
    ProjectStorage.save(updatedProject);
    setProject(updatedProject);
  };

  const selectLyricImageFromHistory = (phraseId: string, url: string) => {
    if (!project) return;

    const phraseIndex = project.lyrics.findIndex((l) => l.id === phraseId);
    if (phraseIndex === -1) return;

    const updatedLyrics = [...project.lyrics];
    updatedLyrics[phraseIndex] = {
      ...updatedLyrics[phraseIndex],
      imageUrl: url,
    };

    const updatedProject = { ...project, lyrics: updatedLyrics };
    ProjectStorage.save(updatedProject);
    setProject(updatedProject);
  };

  const renderVideo = async () => {
    if (!project) return;

    setIsRendering(true);
    setRenderError("");
    setVideoUrl("");

    try {
      const response = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          lyrics: project.lyrics,
          audioUrl: project.audioUrl,
          audioDuration: project.audioDuration,
          videoTitle: project.videoTitle,
          videoDescription: project.videoDescription,
          coverImageUrl: project.coverImageUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to render video");
      }

      setVideoUrl(data.downloadUrl || data.videoUrl);
    } catch (error: any) {
      console.error("Render error:", error);
      setRenderError(error.message || "Failed to render video");
    } finally {
      setIsRendering(false);
    }
  };

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Project Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              The project you're looking for doesn't exist.
            </p>
            <Link href="/">
              <Button>Go Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex-1 max-w-2xl">
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const updatedProject = { ...project, title: editedTitle };
                      ProjectStorage.save(updatedProject);
                      setProject(updatedProject);
                      setIsEditingTitle(false);
                    } else if (e.key === "Escape") {
                      setIsEditingTitle(false);
                      setEditedTitle(project.title);
                    }
                  }}
                  onBlur={() => {
                    const updatedProject = { ...project, title: editedTitle };
                    ProjectStorage.save(updatedProject);
                    setProject(updatedProject);
                    setIsEditingTitle(false);
                  }}
                  className="text-3xl font-bold px-2 py-1 bg-background border border-border rounded w-full"
                  autoFocus
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h1 className="text-3xl font-bold">{project.title}</h1>
                <button
                  onClick={() => {
                    setEditedTitle(project.title);
                    setIsEditingTitle(true);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 hover:bg-muted rounded text-sm"
                  title="Edit project name"
                >
                  ✎
                </button>
              </div>
            )}
            <p className="text-muted-foreground">
              {project.lyrics.length} lyric phrases • {project.styleTemplate} style
            </p>
          </div>
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </div>

        {/* Transcription Status */}
        {isTranscribing && (
          <Card className="border-primary">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                <div>
                  <p className="font-medium">Transcribing audio...</p>
                  <p className="text-sm text-muted-foreground">
                    Extracting timestamps from your audio file
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {transcriptionError && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="font-medium text-destructive">Transcription failed</p>
                <p className="text-sm text-muted-foreground">{transcriptionError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => transcribeAudio(project)}
                >
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Image Generation Progress */}
        {isGeneratingImages && (
          <Card className="border-primary">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                  <div>
                    <p className="font-medium">Generating images...</p>
                    <p className="text-sm text-muted-foreground">
                      {generationProgress.current} / {generationProgress.total} complete
                    </p>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{
                      width: `${(generationProgress.current / generationProgress.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}


        {/* Video Settings */}
        {hasTimestamps(project) && (
          <Card>
            <CardHeader>
              <CardTitle>Video Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Font and Text Color Settings */}
              <div>
                <h3 className="font-semibold mb-3 text-sm">Text Style (for all images)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Font Style</label>
                    <select
                      className="mt-1 w-full px-3 py-2 border border-border rounded-md bg-background"
                      value={project.font || "serif"}
                      onChange={(e) => {
                        const updatedProject = { ...project, font: e.target.value };
                        ProjectStorage.save(updatedProject);
                        setProject(updatedProject);
                      }}
                    >
                      {FONT_OPTIONS.map((font) => (
                        <option key={font.id} value={font.id}>
                          {font.name} - {font.description}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Applied to all generated images
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Text Color</label>
                    <select
                      className="mt-1 w-full px-3 py-2 border border-border rounded-md bg-background"
                      value={project.textColor || "white"}
                      onChange={(e) => {
                        const updatedProject = { ...project, textColor: e.target.value };
                        ProjectStorage.save(updatedProject);
                        setProject(updatedProject);
                      }}
                    >
                      {TEXT_COLOR_OPTIONS.map((color) => (
                        <option key={color.id} value={color.id}>
                          {color.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Color of embedded text
                    </p>
                  </div>
                </div>
                <div className="mt-2 text-xs text-yellow-600 dark:text-yellow-500">
                  ⚠️ Changing font or color requires regenerating images
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transcription Controls - Always show */}
        <Card>
          <CardHeader>
            <CardTitle>Transcription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Audio Player */}
            <div className="bg-muted/50 rounded-lg p-4">
              <label className="text-xs font-semibold text-muted-foreground mb-2 block">Audio</label>
              <audio
                controls
                className="w-full"
                src={project.audioUrl}
                onLoadedMetadata={(e) => {
                  // Extract duration from audio element if missing
                  const audioElement = e.currentTarget;
                  const duration = audioElement.duration;
                  if (duration && duration > 0 && (!project.audioDuration || project.audioDuration === 0)) {
                    const updatedProject = { ...project, audioDuration: duration };
                    ProjectStorage.save(updatedProject);
                    setProject(updatedProject);
                    console.log("Fixed missing audio duration:", duration);
                  }
                }}
              >
                Your browser does not support the audio element.
              </audio>
            </div>

            {/* Transcription Status & Controls */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {hasTimestamps(project)
                  ? `${project.lyrics.length} phrases transcribed`
                  : "No transcription yet"}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => transcribeAudio(project)}
                  disabled={isTranscribing}
                >
                  {isTranscribing ? "Transcribing..." : hasTimestamps(project) ? "Re-transcribe Audio" : "Transcribe Audio"}
                </Button>
                {project.originalTimestamps && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetTimings}
                  >
                    Reset to Original
                  </Button>
                )}
              </div>
            </div>

            {/* DEBUG Section */}
            <div className="border-t pt-4">
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-2"
              >
                <span>{showDebug ? "▼" : "▶"}</span>
                DEBUG: Project JSON
              </button>
              {showDebug && (
                <div className="mt-3 bg-muted/50 rounded-lg p-4 overflow-auto max-h-96">
                  <pre className="text-xs font-mono">
                    {JSON.stringify(project, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Video Preview & Timeline */}
        {hasTimestamps(project) && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Video Preview & Editable Timeline</CardTitle>
                <Button
                  onClick={renderVideo}
                  disabled={isRendering || !project.audioDuration}
                  size="sm"
                >
                  {isRendering ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                      Rendering... (this may take a few minutes)
                    </span>
                  ) : (
                    "Download Video"
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Render Error */}
              {renderError && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive">{renderError}</p>
                </div>
              )}

              {/* Download Link */}
              {videoUrl && !isRendering && (
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                    ✓ Video rendered successfully!
                  </p>
                  <a
                    href={videoUrl}
                    download={`${project.title}.mp4`}
                    className="text-sm text-green-600 dark:text-green-400 underline hover:no-underline"
                  >
                    Click here to download your video
                  </a>
                </div>
              )}

              {/* Video Preview */}
              {project.audioDuration > 0 ? (
                <VideoPreview
                  lyrics={project.lyrics}
                  audioUrl={project.audioUrl}
                  duration={project.audioDuration}
                  onTimeUpdate={setCurrentTime}
                  videoTitle={project.videoTitle}
                  videoDescription={project.videoDescription}
                  coverImageUrl={project.coverImageUrl}
                />
              ) : (
                <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    ⚠️ Audio duration is not available. The video preview cannot be displayed.
                    Please re-upload your audio file.
                  </p>
                </div>
              )}

              {/* Timeline Editor */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">Timeline Editor</h3>
                </div>
                <Timeline
                  lyrics={project.lyrics}
                  duration={project.audioDuration}
                  currentTime={currentTime}
                  hasCover={!!project.videoTitle}
                  coverDuration={project.lyrics[0]?.startTime || 0}
                  onPhraseClick={(phrase) => console.log("Selected phrase:", phrase)}
                  onPhraseUpdate={(phraseId, newStartTime) => {
                    const phraseIndex = project.lyrics.findIndex((l) => l.id === phraseId);
                    if (phraseIndex === -1) return;

                    // Only update startTime - endTime is calculated at runtime
                    const updatedLyrics = project.lyrics.map((lyric, index) => {
                      if (index === phraseIndex) {
                        return { ...lyric, startTime: newStartTime };
                      }
                      return lyric;
                    });

                    // Sort by startTime to maintain sequential order
                    const sortedLyrics = updatedLyrics.sort((a, b) => a.startTime - b.startTime);

                    const updatedProject = { ...project, lyrics: sortedLyrics };
                    ProjectStorage.save(updatedProject);
                    setProject(updatedProject);
                  }}
                  onReorder={(fromIndex, toIndex) => {
                    // Swap the startTime values instead of reordering the array
                    const updatedLyrics = [...project.lyrics];
                    const fromStartTime = updatedLyrics[fromIndex].startTime;
                    const toStartTime = updatedLyrics[toIndex].startTime;

                    updatedLyrics[fromIndex] = { ...updatedLyrics[fromIndex], startTime: toStartTime };
                    updatedLyrics[toIndex] = { ...updatedLyrics[toIndex], startTime: fromStartTime };

                    // Sort by startTime to maintain sequential order
                    const sortedLyrics = updatedLyrics.sort((a, b) => a.startTime - b.startTime);

                    const updatedProject = { ...project, lyrics: sortedLyrics };
                    ProjectStorage.save(updatedProject);
                    setProject(updatedProject);
                  }}
                />
                <div className="mt-2 text-xs text-muted-foreground">
                  💡 <strong>Drag boxes</strong> to reorder them • Timeline is fully sequential with no gaps • Changes update the video preview automatically
                </div>

                {/* DEBUG Section */}
                <div className="mt-6 border-t pt-4">
                  <button
                    onClick={() => setShowDebug(!showDebug)}
                    className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-2"
                  >
                    <span>{showDebug ? "▼" : "▶"}</span>
                    DEBUG: Project JSON
                  </button>
                  {showDebug && (
                    <div className="mt-3 bg-muted/50 rounded-lg p-4 overflow-auto max-h-96">
                      <pre className="text-xs font-mono">
                        {JSON.stringify(project, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Export Instructions */}
        {hasImages(project) && (
          <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>🎬</span>
                Video Export
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">
                Your video is ready! You can preview it above and adjust timing using the editable timeline.
              </p>
              <div className="text-sm space-y-2 text-muted-foreground">
                <p><strong>Timeline editing features:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Drag phrase boundaries to adjust timing in real-time</li>
                  <li>Changes update the video preview automatically</li>
                  <li>All edits are saved to localStorage instantly</li>
                </ul>
              </div>
              <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm font-semibold mb-2">To export final video, open Remotion Studio:</p>
                <code className="block bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm font-mono">
                  npm run remotion
                </code>
                <p className="text-xs text-muted-foreground mt-2">
                  Then use the Remotion Studio interface to render and export your MP4 video.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Title Scene (Section 0) */}
        {hasTimestamps(project) && (
          <Card>
            <CardHeader>
              <CardTitle>Section 0: Title Scene</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                <div className="md:col-span-2 space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                      0
                    </div>
                    <div className="flex-1 space-y-2">
                      {/* Title Input */}
                      <input
                        type="text"
                        placeholder="Enter video title..."
                        value={project.videoTitle || ""}
                        onChange={(e) => {
                          const updatedProject = { ...project, videoTitle: e.target.value };
                          ProjectStorage.save(updatedProject);
                          setProject(updatedProject);
                        }}
                        className="w-full px-2 py-1 text-sm font-medium bg-background border border-border rounded"
                      />
                      {/* Description Input */}
                      <input
                        type="text"
                        placeholder="Enter description..."
                        value={project.videoDescription || ""}
                        onChange={(e) => {
                          const updatedProject = { ...project, videoDescription: e.target.value };
                          ProjectStorage.save(updatedProject);
                          setProject(updatedProject);
                        }}
                        className="w-full px-2 py-1 text-sm bg-background border border-border rounded"
                      />
                      {/* Edit Prompt Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPromptEditor({ isOpen: true, type: "cover" })}
                        className="w-full text-xs"
                      >
                        Edit Image Prompt
                      </Button>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {formatTime(0)} - {formatTime(project.lyrics[0]?.startTime || 0)}
                          {" • "}
                          {(project.lyrics[0]?.startTime || 0).toFixed(1)}s
                        </p>
                        {!project.coverImageUrl && (project.videoTitle || project.videoDescription) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateCoverImage(project)}
                            disabled={isGeneratingCover}
                            className="text-xs"
                          >
                            {isGeneratingCover ? "Generating..." : "Generate Image"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  {project.coverImageUrl ? (
                    <div className="space-y-2">
                      <div className="relative group w-full aspect-video rounded-lg overflow-hidden border border-border">
                        <img
                          src={project.coverImageUrl}
                          alt="Cover"
                          className="w-full h-full object-cover"
                        />
                        {/* Regenerate button on hover */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => generateCoverImage(project)}
                            disabled={isGeneratingCover}
                            className="px-3 py-1 bg-white/90 hover:bg-white text-black text-xs font-medium rounded shadow-lg disabled:opacity-50"
                          >
                            {isGeneratingCover ? "Regenerating..." : "Regenerate"}
                          </button>
                        </div>
                      </div>
                      {project.coverImages && project.coverImages.length > 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => setImageHistoryModal({ isOpen: true, type: "cover" })}
                        >
                          See All ({project.coverImages.length})
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="w-full aspect-video rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground text-sm">
                      No image
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Lyrics & Images</CardTitle>
              <div className="flex items-center gap-2">
                {!isGeneratingImages && hasTimestamps(project) && (
                  <Button
                    onClick={() => generateAllImages(project)}
                    disabled={!hasTimestamps(project)}
                    size="sm"
                  >
                    Generate All Images
                  </Button>
                )}
                {project.lyrics.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadSrt(project.lyrics, project.audioDuration, project.title)}
                  >
                    Download Captions
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {project.lyrics.map((phrase, i) => {
                // Calculate endTime at runtime from next phrase's startTime
                const endTime = i < project.lyrics.length - 1
                  ? project.lyrics[i + 1].startTime
                  : project.audioDuration;

                return (
                  <div key={phrase.id}>
                    {/* Lyric Phrase */}
                    <div className="relative grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                      {/* Delete Button - Top Right */}
                      <button
                        onClick={() => deletePhraseAtIndex(i)}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-destructive/10 hover:bg-destructive/20 text-destructive flex items-center justify-center text-sm font-bold transition-colors"
                        title="Delete this phrase"
                      >
                        ×
                      </button>

                      <div className="md:col-span-2 space-y-2">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                            {i + 1}
                          </div>
                          <div className="flex-1 space-y-2">
                            {/* Editable text input */}
                            <input
                              type="text"
                              value={phrase.text}
                              onChange={(e) => {
                                const updatedLyrics = project.lyrics.map((l, idx) =>
                                  idx === i ? { ...l, text: e.target.value } : l
                                );
                                const updatedProject = { ...project, lyrics: updatedLyrics };
                                ProjectStorage.save(updatedProject);
                                setProject(updatedProject);
                              }}
                              className="w-full px-2 py-1 text-sm font-medium bg-background border border-border rounded"
                              placeholder="Enter lyric text..."
                            />
                            {/* Edit Prompt Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPromptEditor({ isOpen: true, type: "lyric", phraseId: phrase.id })}
                              className="w-full text-xs"
                            >
                              Edit Image Prompt
                            </Button>
                            <div className="flex items-center justify-between">
                              {phrase.startTime >= 0 && (
                                <p className="text-xs text-muted-foreground">
                                  {formatTime(phrase.startTime)} - {formatTime(endTime)}
                                  {" • "}
                                  {(endTime - phrase.startTime).toFixed(1)}s
                                </p>
                              )}
                              {!phrase.imageUrl && phrase.text && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => regenerateImage(phrase.id)}
                                  disabled={regeneratingPhraseId === phrase.id}
                                  className="text-xs"
                                >
                                  {regeneratingPhraseId === phrase.id ? "Generating..." : "Generate Image"}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <ImagePreview
                          phrase={phrase}
                          onRegenerate={() => regenerateImage(phrase.id)}
                          isRegenerating={regeneratingPhraseId === phrase.id}
                        />
                        {phrase.generatedImages && phrase.generatedImages.length > 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-xs"
                            onClick={() => setImageHistoryModal({ isOpen: true, type: "lyric", phraseId: phrase.id })}
                          >
                            See All ({phrase.generatedImages.length})
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Insert Button (show between phrases, not after the last one) */}
                    {i < project.lyrics.length - 1 && (
                      <div className="flex items-center justify-center py-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => insertPhraseAfter(i)}
                          className="text-xs"
                        >
                          + Insert Phrase
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className={hasTimestamps(project) ? "text-green-500" : ""}>
                  {hasTimestamps(project) ? "✓" : "○"}
                </div>
                <span>Extract timestamps from audio</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={hasImages(project) ? "text-green-500" : ""}>
                  {hasImages(project) ? "✓" : "○"}
                </div>
                <span>Generate AI images for each phrase</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={hasImages(project) ? "text-green-500" : ""}>
                  {hasImages(project) ? "✓" : "○"}
                </div>
                <span>Preview video with Remotion</span>
              </div>
              <div className="flex items-center gap-2">
                <div>○</div>
                <span>Export final video</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Image History Modal */}
      {project && imageHistoryModal.isOpen && (
        <>
          {imageHistoryModal.type === "cover" && project.coverImages && (
            <ImageHistoryModal
              images={project.coverImages}
              currentImageUrl={project.coverImageUrl || ""}
              isOpen={imageHistoryModal.isOpen}
              onClose={() => setImageHistoryModal({ isOpen: false, type: "cover" })}
              onSelectImage={selectCoverImageFromHistory}
              onRegenerate={() => {
                setImageHistoryModal({ isOpen: false, type: "cover" });
                generateCoverImage(project);
              }}
              isRegenerating={isGeneratingCover}
              title="Cover Image History"
            />
          )}
          {imageHistoryModal.type === "lyric" && imageHistoryModal.phraseId && (() => {
            const phrase = project.lyrics.find((l) => l.id === imageHistoryModal.phraseId);
            if (!phrase || !phrase.generatedImages) return null;
            return (
              <ImageHistoryModal
                images={phrase.generatedImages}
                currentImageUrl={phrase.imageUrl}
                isOpen={imageHistoryModal.isOpen}
                onClose={() => setImageHistoryModal({ isOpen: false, type: "lyric" })}
                onSelectImage={(url) => selectLyricImageFromHistory(imageHistoryModal.phraseId!, url)}
                onRegenerate={() => {
                  setImageHistoryModal({ isOpen: false, type: "lyric" });
                  regenerateImage(imageHistoryModal.phraseId!);
                }}
                isRegenerating={regeneratingPhraseId === imageHistoryModal.phraseId}
                title="Lyric Image History"
              />
            );
          })()}
        </>
      )}

      {/* Prompt Editor Modal */}
      {project && promptEditor.isOpen && (
        <>
          {promptEditor.type === "cover" && (
            <PromptEditorModal
              isOpen={promptEditor.isOpen}
              onClose={() => setPromptEditor({ isOpen: false, type: "cover" })}
              onSave={(newPrompt) => {
                const updatedProject = { ...project, coverPrompt: newPrompt };
                ProjectStorage.save(updatedProject);
                setProject(updatedProject);
              }}
              initialPrompt={
                project.coverPrompt || (() => {
                  const styleTemplate = STYLE_TEMPLATES.find((t) => t.id === project.styleTemplate);
                  return (styleTemplate?.promptTemplate || "").replace(/\{\{lyric\}\}/g, "{{title}}");
                })()
              }
              variables={{
                title: project.videoDescription
                  ? `${project.videoTitle || project.title} - ${project.videoDescription}`
                  : (project.videoTitle || project.title || "Music Video"),
                font: project.font || "elegant",
                color: TEXT_COLOR_OPTIONS.find(c => c.id === (project.textColor || "white"))?.name.toLowerCase() || "white",
              }}
              title="Edit Cover Image Prompt"
            />
          )}
          {promptEditor.type === "lyric" && promptEditor.phraseId && (() => {
            const phrase = project.lyrics.find((l) => l.id === promptEditor.phraseId);
            if (!phrase) return null;
            return (
              <PromptEditorModal
                isOpen={promptEditor.isOpen}
                onClose={() => setPromptEditor({ isOpen: false, type: "lyric" })}
                onSave={(newPrompt) => {
                  const updatedLyrics = project.lyrics.map((l) =>
                    l.id === promptEditor.phraseId ? { ...l, customPrompt: newPrompt } : l
                  );
                  const updatedProject = { ...project, lyrics: updatedLyrics };
                  ProjectStorage.save(updatedProject);
                  setProject(updatedProject);
                }}
                initialPrompt={
                  phrase.customPrompt || (
                    STYLE_TEMPLATES.find((t) => t.id === project.styleTemplate)?.promptTemplate ||
                    STYLE_TEMPLATES[0].promptTemplate
                  )
                }
                variables={{
                  lyric: phrase.text,
                  font: project.font || "elegant",
                  color: TEXT_COLOR_OPTIONS.find(c => c.id === (project.textColor || "white"))?.name.toLowerCase() || "white",
                }}
                title={`Edit Prompt for "${phrase.text.substring(0, 30)}${phrase.text.length > 30 ? '...' : ''}"`}
              />
            );
          })()}
        </>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
