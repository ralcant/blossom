import React from "react";
import { Composition } from "remotion";
import { KaraokeVideo } from "./KaraokeVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="KaraokeVideo"
        component={KaraokeVideo}
        durationInFrames={300 * 30} // Default 5 minutes at 30fps
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          lyrics: [],
          audioUrl: "",
          audioDuration: 300, // Default 5 minutes
          videoTitle: "",
          videoDescription: "",
          coverImageUrl: "",
        }}
        // Calculate duration based on audioDuration
        calculateMetadata={({ props }) => {
          const duration = Math.ceil(props.audioDuration * 30); // Convert seconds to frames at 30fps

          return {
            durationInFrames: duration,
            props,
          };
        }}
      />
    </>
  );
};

// This is required for Remotion Studio to work
export default RemotionRoot;
