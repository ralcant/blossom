"use client";

import { GeneratedImage } from "@/types/project";
import { Button } from "@/components/ui/button";

interface ImageHistoryModalProps {
  images: GeneratedImage[];
  currentImageUrl: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (url: string) => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
  title?: string;
}

export function ImageHistoryModal({
  images,
  currentImageUrl,
  isOpen,
  onClose,
  onSelectImage,
  onRegenerate,
  isRegenerating,
  title = "Image History",
}: ImageHistoryModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-background rounded-lg shadow-lg max-w-4xl w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center hover:bg-muted rounded-full transition-colors text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-8rem)]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((image, index) => {
              const isCurrent = image.url === currentImageUrl;
              return (
                <div
                  key={index}
                  className={`relative rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                    isCurrent
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => onSelectImage(image.url)}
                >
                  <img
                    src={image.url}
                    alt={`Generated image ${index + 1}`}
                    className="w-full aspect-video object-cover"
                  />
                  {isCurrent && (
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-semibold">
                      Current
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <p className="text-xs text-white">
                      {new Date(image.generatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t">
          <p className="text-sm text-muted-foreground">
            {images.length} image{images.length !== 1 ? "s" : ""} generated
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={onRegenerate} disabled={isRegenerating}>
              {isRegenerating ? "Generating..." : "Generate New"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
