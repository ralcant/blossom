"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { STYLE_TEMPLATES } from "@/types/project";
import { ProjectStorage } from "@/lib/storage";
import { parseSrt } from "@/lib/srt";

export default function UploadPage() {
  const router = useRouter();
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [srtFile, setSrtFile] = useState<File | null>(null);
  const [selectedStyle, setSelectedStyle] = useState(STYLE_TEMPLATES[0].id);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("audio/")) {
        setError("Please upload an audio file (MP3, WAV, etc.)");
        return;
      }
      setAudioFile(file);
      setError("");
    }
  };

  const handleSrtFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.name.endsWith('.srt')) {
        setError("Please upload an SRT file (.srt)");
        return;
      }
      setSrtFile(file);
      setError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate inputs
    if (!audioFile) {
      setError("Please upload an audio file");
      return;
    }

    setIsUploading(true);

    try {
      // Upload audio file
      const formData = new FormData();
      formData.append("file", audioFile);

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload audio file");
      }

      const { url: audioUrl, duration } = await uploadResponse.json();

      // Parse SRT file if provided
      let lyrics = [];
      let originalTimestamps: number[] | undefined;

      if (srtFile) {
        const srtContent = await srtFile.text();
        lyrics = parseSrt(srtContent);
        originalTimestamps = lyrics.map(l => l.startTime);
        console.log(`Parsed ${lyrics.length} phrases from SRT file`);
      }

      // Create project with lyrics from SRT (if provided) or empty array
      const project = {
        id: `project-${Date.now()}`,
        title: audioFile.name.replace(/\.[^/.]+$/, ""), // Remove file extension
        audioUrl,
        audioDuration: duration || 0,
        styleTemplate: selectedStyle,
        createdAt: Date.now(),
        lyrics, // From SRT or empty (will be filled by Azure Speech transcription)
        originalTimestamps, // Save SRT timestamps for reset functionality
      };

      // Save to localStorage
      ProjectStorage.save(project);

      // Redirect to editor
      router.push(`/editor/${project.id}`);
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Failed to create project");
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Create Your Video</h1>
          <p className="text-muted-foreground">
            Upload your audio file and optionally an SRT subtitle file - we'll generate a beautiful video
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Audio Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Audio File</CardTitle>
              <CardDescription>Upload your MP3 or audio file (required)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Label htmlFor="audio-upload">
                  Select Audio File
                </Label>
                <input
                  id="audio-upload"
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioFileChange}
                  className="block w-full text-sm text-slate-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary file:text-primary-foreground
                    hover:file:bg-primary/90
                    file:cursor-pointer cursor-pointer"
                />
                {audioFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {audioFile.name} ({(audioFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* SRT Upload (Optional) */}
          <Card>
            <CardHeader>
              <CardTitle>Subtitle File (Optional)</CardTitle>
              <CardDescription>
                Upload an SRT file to skip transcription - or leave empty to auto-transcribe
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Label htmlFor="srt-upload">
                  Select SRT File (Optional)
                </Label>
                <input
                  id="srt-upload"
                  type="file"
                  accept=".srt"
                  onChange={handleSrtFileChange}
                  className="block w-full text-sm text-slate-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-secondary file:text-secondary-foreground
                    hover:file:bg-secondary/90
                    file:cursor-pointer cursor-pointer"
                />
                {srtFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {srtFile.name} ({(srtFile.size / 1024).toFixed(2)} KB)
                  </p>
                )}
                {!srtFile && (
                  <p className="text-xs text-muted-foreground">
                    💡 If you provide an SRT file, we'll use it instead of auto-transcribing
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Style Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Visual Style</CardTitle>
              <CardDescription>Choose the aesthetic for your video</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {STYLE_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setSelectedStyle(template.id)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedStyle === template.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <h3 className="font-semibold mb-1">{template.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {template.description}
                    </p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/")}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isUploading || !audioFile}
              className="flex-1"
            >
              {isUploading ? "Uploading..." : srtFile ? "Upload & Create" : "Upload & Transcribe"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
