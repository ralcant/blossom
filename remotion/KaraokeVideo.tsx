import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, Img, Html5Audio } from "remotion";

interface LyricPhrase {
  id: string;
  text: string;
  startTime: number;  // endTime is calculated from next phrase's startTime
  imageUrl: string;
  imagePrompt: string;
  animation: "zoomIn" | "zoomOut" | "panLeft" | "panRight" | "kenBurns" | "static";
}

interface KaraokeVideoProps {
  lyrics: LyricPhrase[];
  audioUrl: string;
  audioDuration: number;  // Total audio duration in seconds
  videoTitle?: string;
  videoDescription?: string;
  coverImageUrl?: string;
}

export const KaraokeVideo: React.FC<KaraokeVideoProps> = ({ lyrics, audioUrl, audioDuration, videoTitle, videoDescription, coverImageUrl }) => {
  const { fps } = useVideoConfig();

  if (!lyrics || lyrics.length === 0) {
    return (
      <AbsoluteFill className="bg-neutral-900 items-center justify-center">
        <div className="text-white text-4xl">
          No lyrics provided
        </div>
      </AbsoluteFill>
    );
  }

  // Find when the first phrase starts (for title scene duration)
  const firstPhraseStartTime = lyrics[0]?.startTime || 0;
  const titleDurationInFrames = Math.floor(firstPhraseStartTime * fps);
  const showTitleScene = videoTitle && titleDurationInFrames > 0;

  // Use cover image if available, otherwise fallback to first lyric image
  const titleBackgroundImage = coverImageUrl || lyrics[0]?.imageUrl;

  return (
    <AbsoluteFill>
      {/* Audio track */}
      {audioUrl && <Html5Audio src={audioUrl}/>}

      {/* Title scene (if videoTitle is provided and first phrase doesn't start at 0) */}
      {showTitleScene && (
        <Sequence from={0} durationInFrames={titleDurationInFrames}>
          <AbsoluteFill>
            {titleBackgroundImage ? (
              <Img
                src={titleBackgroundImage}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div style={{ width: "100%", height: "100%", backgroundColor: "#000" }} />
            )}
          </AbsoluteFill>
        </Sequence>
      )}

      {/* Render each lyric phrase as a sequence */}
      {lyrics.map((phrase, index) => {
        // Calculate endTime from next phrase's startTime (or audioDuration for last phrase)
        const endTime = index < lyrics.length - 1 ? lyrics[index + 1].startTime : audioDuration;

        const startFrame = Math.floor(phrase.startTime * fps);
        const endFrame = Math.floor(endTime * fps);
        const durationInFrames = Math.max(1, endFrame - startFrame);

        return (
          <Sequence
            key={phrase.id}
            from={startFrame}
            durationInFrames={durationInFrames}
          >
            {phrase.imageUrl ? (
              <AnimatedImage
                imageUrl={phrase.imageUrl}
                animation={phrase.animation}
                durationInFrames={durationInFrames}
              />
            ) : (
              <AbsoluteFill style={{ backgroundColor: "#000" }} />
            )}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

interface AnimatedImageProps {
  imageUrl: string;
  animation: "zoomIn" | "zoomOut" | "panLeft" | "panRight" | "kenBurns" | "static";
  durationInFrames: number;
}

const AnimatedImage: React.FC<AnimatedImageProps> = ({
  imageUrl,
  animation,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();

  // Calculate animation transforms
  const getTransform = () => {
    switch (animation) {
      case "zoomIn":
        const scaleIn = interpolate(frame, [0, durationInFrames], [1, 1.2], {
          extrapolateRight: "clamp",
        });
        return `scale(${scaleIn})`;

      case "zoomOut":
        const scaleOut = interpolate(frame, [0, durationInFrames], [1.2, 1], {
          extrapolateRight: "clamp",
        });
        return `scale(${scaleOut})`;

      case "panLeft":
        const translateLeft = interpolate(
          frame,
          [0, durationInFrames],
          [0, -100],
          { extrapolateRight: "clamp" }
        );
        return `translateX(${translateLeft}px) scale(1.1)`;

      case "panRight":
        const translateRight = interpolate(
          frame,
          [0, durationInFrames],
          [0, 100],
          { extrapolateRight: "clamp" }
        );
        return `translateX(${translateRight}px) scale(1.1)`;

      case "kenBurns":
        const kenBurnsScale = interpolate(
          frame,
          [0, durationInFrames],
          [1, 1.15],
          { extrapolateRight: "clamp" }
        );
        const kenBurnsTranslate = interpolate(
          frame,
          [0, durationInFrames],
          [0, -50],
          { extrapolateRight: "clamp" }
        );
        return `scale(${kenBurnsScale}) translateX(${kenBurnsTranslate}px)`;

      default:
        return "scale(1)";
    }
  };

  return (
    <AbsoluteFill>
      <Img
        src={imageUrl}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: getTransform(),
          transformOrigin: "center center",
        }}
      />
    </AbsoluteFill>
  );
};
