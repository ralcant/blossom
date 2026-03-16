import { Config } from "@remotion/cli/config";

// Set the entry point for Remotion Studio
Config.setEntryPoint("./remotion/index.tsx");

// Video settings
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setCodec("h264");

// Enable webpack caching for faster rebuilds
Config.setCachingEnabled(true);
