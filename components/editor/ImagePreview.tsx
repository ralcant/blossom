"use client";

import { LyricPhrase } from "@/types/project";
import { useState } from "react";

interface ImagePreviewProps {
  phrase: LyricPhrase;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

export function ImagePreview({
  phrase,
  onRegenerate,
  isRegenerating,
}: ImagePreviewProps) {
  const [imageError, setImageError] = useState(false);

  if (!phrase.imageUrl) {
    return (
      <div className="w-full aspect-video bg-muted rounded-lg flex items-center justify-center">
        <p className="text-sm text-muted-foreground">No image generated yet</p>
      </div>
    );
  }

  if (imageError) {
    return (
      <div className="w-full aspect-video bg-muted rounded-lg flex items-center justify-center">
        <p className="text-sm text-destructive">Failed to load image</p>
      </div>
    );
  }

  return (
    <div className="relative group">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={phrase.imageUrl}
        alt={phrase.text}
        className="w-full aspect-video object-cover rounded-lg"
        onError={() => setImageError(true)}
      />

      {/* Overlay with phrase text */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent rounded-lg flex items-end p-4">
        <p className="text-white text-sm font-medium truncate">{phrase.text}</p>
      </div>

      {/* Regenerate button on hover */}
      {onRegenerate && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="px-3 py-1 bg-white/90 hover:bg-white text-black text-xs font-medium rounded shadow-lg disabled:opacity-50"
          >
            {isRegenerating ? "Regenerating..." : "Regenerate"}
          </button>
        </div>
      )}
    </div>
  );
}
