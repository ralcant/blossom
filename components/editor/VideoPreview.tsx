"use client";

import { Player, PlayerRef } from "@remotion/player";
import { KaraokeVideo } from "@/remotion/KaraokeVideo";
import { LyricPhrase } from "@/types/project";
import { useRef, useEffect } from "react";

interface VideoPreviewProps {
  lyrics: LyricPhrase[];
  audioUrl: string;
  duration: number; // in seconds
  videoTitle?: string;
  videoDescription?: string;
  coverImageUrl?: string;
  onTimeUpdate?: (time: number) => void;
}

export function VideoPreview({ lyrics, audioUrl, duration, videoTitle, videoDescription, coverImageUrl, onTimeUpdate }: VideoPreviewProps) {
  const fps = 30;
  const durationInFrames = Math.ceil(duration * fps);
  const playerRef = useRef<PlayerRef>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      if (playerRef.current) {
        const frame = playerRef.current.getCurrentFrame();
        const time = frame / fps;
        onTimeUpdate?.(time);
      }
    }, 100); // Update 10 times per second

    return () => clearInterval(interval);
  }, [fps, onTimeUpdate]);

  return (
    <div className="w-full space-y-2">
      <Player
        ref={playerRef}
        component={KaraokeVideo}
        inputProps={{
          lyrics,
          audioUrl,
          audioDuration: duration,
          videoTitle,
          videoDescription,
          coverImageUrl,
        }}
        durationInFrames={durationInFrames}
        fps={fps}
        compositionWidth={1920}
        compositionHeight={1080}
        style={{
          width: "100%",
          aspectRatio: "16/9",
        }}
        controls
        clickToPlay
        doubleClickToFullscreen
        spaceKeyToPlayOrPause
        playbackRate={1}
        allowFullscreen
      />
      <p className="text-xs text-muted-foreground">
        {lyrics.length} phrases • {duration.toFixed(1)}s duration • {fps} fps
      </p>
    </div>
  );
}
