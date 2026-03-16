"use client";

import { LyricPhrase } from "@/types/project";
import { useState, useRef, useEffect } from "react";

interface TimelineProps {
  lyrics: LyricPhrase[];
  duration: number;
  currentTime?: number;
  hasCover?: boolean; // Whether there's a cover/title scene
  coverDuration?: number; // Duration of cover (first lyric startTime)
  onPhraseClick?: (phrase: LyricPhrase) => void;
  onPhraseUpdate?: (phraseId: string, newStartTime: number) => void;
  onCoverUpdate?: (newDuration: number) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
}

export function Timeline({
  lyrics,
  duration,
  currentTime = 0,
  hasCover = false,
  coverDuration = 0,
  onPhraseClick,
  onPhraseUpdate,
  onCoverUpdate,
  onReorder,
}: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{
    type: 'cover' | 'phrase';
    phraseId?: string;
    phraseIndex?: number;
  } | null>(null);
  const [zoom, setZoom] = useState(100);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Build sequential boxes with calculated end times
  const boxes = [];

  // Add cover box if exists
  if (hasCover && coverDuration > 0) {
    boxes.push({
      id: 'cover',
      type: 'cover' as const,
      text: '📽️ Cover',
      startTime: 0,
      endTime: coverDuration,
    });
  }

  // Add lyric boxes
  lyrics.forEach((phrase, index) => {
    const nextStartTime = index < lyrics.length - 1 ? lyrics[index + 1].startTime : duration;
    boxes.push({
      id: phrase.id,
      type: 'phrase' as const,
      text: phrase.text,
      startTime: phrase.startTime,
      endTime: nextStartTime,
      phraseIndex: index,
    });
  });

  const pixelsPerSecond = (zoom / 100) * 50;
  const timelineWidth = duration * pixelsPerSecond;

  const handleDragStart = (e: React.DragEvent, box: typeof boxes[0]) => {
    e.dataTransfer.effectAllowed = 'move';
    if (box.type === 'cover') {
      setDragging({ type: 'cover' });
    } else {
      setDragging({ type: 'phrase', phraseId: box.id, phraseIndex: box.phraseIndex });
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);

    if (!dragging) return;

    if (dragging.type === 'phrase' && dragging.phraseIndex !== undefined) {
      const fromIndex = dragging.phraseIndex;
      const toIndex = dropIndex - (hasCover ? 1 : 0); // Adjust for cover box

      if (fromIndex !== toIndex && toIndex >= 0) {
        onReorder?.(fromIndex, toIndex);
      }
    }

    setDragging(null);
  };

  return (
    <div className="w-full bg-muted rounded-lg p-4">
      {/* Zoom Control */}
      <div className="mb-3 flex items-center gap-3">
        <label className="text-xs text-muted-foreground whitespace-nowrap">Zoom:</label>
        <input
          type="range"
          min="50"
          max="400"
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="flex-1 max-w-xs h-1 bg-muted-foreground/20 rounded-lg appearance-none cursor-pointer"
        />
        <span className="text-xs text-muted-foreground w-12">{zoom}%</span>
      </div>

      <div className="mb-2 flex justify-between text-sm text-muted-foreground">
        <span>0:00</span>
        <span>{formatTime(duration)}</span>
      </div>

      <div
        ref={timelineRef}
        className="relative bg-background rounded border border-border overflow-x-auto"
        style={{ height: "56px", minHeight: "56px" }}
      >
        <div className="relative h-full" style={{ width: `${timelineWidth}px`, minWidth: "100%" }}>
          {/* Playback indicator */}
          {currentTime > 0 && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
              style={{
                left: `${(currentTime / duration) * timelineWidth}px`,
              }}
            >
              <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-500 rounded-full" />
            </div>
          )}

          {/* Sequential boxes */}
          {boxes.map((box, index) => {
            const leftPos = (box.startTime / duration) * timelineWidth;
            const boxDuration = box.endTime - box.startTime;
            const boxWidth = (boxDuration / duration) * timelineWidth;

            const isCover = box.type === 'cover';
            const isDraggingOver = dragOverIndex === index;

            return (
              <div
                key={box.id}
                draggable
                onDragStart={(e) => handleDragStart(e, box)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={() => {
                  setDragging(null);
                  setDragOverIndex(null);
                }}
                className={`absolute top-2 h-12 rounded transition-all flex items-center justify-center px-2 text-xs font-medium overflow-hidden cursor-move
                  ${isCover ? 'bg-blue-500/70 hover:bg-blue-500/90 text-white' : 'bg-primary/70 hover:bg-primary/90 text-primary-foreground'}
                  ${isDraggingOver ? 'ring-2 ring-yellow-400' : ''}
                `}
                style={{
                  left: `${leftPos}px`,
                  width: `${Math.max(boxWidth, 60)}px`,
                }}
                onClick={() => !isCover && onPhraseClick?.(lyrics[box.phraseIndex!])}
                title={`${formatTime(box.startTime)} - ${formatTime(box.endTime)}: ${box.text}`}
              >
                <div className="text-center pointer-events-none flex-1 px-1">
                  <div className="text-[9px] opacity-70">
                    {formatTime(box.startTime)}
                  </div>
                  <div className="text-[10px] whitespace-nowrap overflow-hidden text-ellipsis font-semibold">
                    {box.text}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-2 text-xs text-muted-foreground">
        {lyrics.length} phrases • Sequential timeline (no gaps or overlaps) • Drag to reorder
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
