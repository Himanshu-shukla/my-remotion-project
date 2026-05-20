import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

type FfprobeStream = {
  codec_name?: string;
  codec_type?: "video" | "audio" | string;
  width?: number;
  height?: number;
  r_frame_rate?: string;
};

type FfprobeFormat = {
  duration?: string;
};

type FfprobeResponse = {
  streams?: FfprobeStream[];
  format?: FfprobeFormat;
};

const parseFrameRate = (value: string | undefined) => {
  if (!value) {
    return undefined;
  }

  const [numerator, denominator] = value.split("/").map(Number);

  if (!denominator) {
    return Number.isFinite(numerator) && numerator > 0 ? numerator : undefined;
  }

  const fps = numerator / denominator;
  return Number.isFinite(fps) && fps > 0 ? fps : undefined;
};

export const getVideoMetadata = async (filePath: string) => {
  const { stdout } = await execFileAsync("npx", [
    "remotion",
    "ffprobe",
    "-v",
    "error",
    "-show_entries",
    "stream=codec_type,codec_name,width,height,r_frame_rate:format=duration",
    "-of",
    "json",
    filePath,
  ]);
  const metadata = JSON.parse(stdout) as FfprobeResponse;
  const videoStream = metadata.streams?.find(
    (stream) => stream.codec_type === "video",
  );
  const audioStream = metadata.streams?.find(
    (stream) => stream.codec_type === "audio",
  );
  const durationInSeconds = Number(metadata.format?.duration ?? 0);

  if (!videoStream?.width || !videoStream.height || durationInSeconds <= 0) {
    throw new TypeError("Could not read video metadata.");
  }

  return {
    duration: durationInSeconds,
    durationInSeconds,
    width: videoStream.width,
    height: videoStream.height,
    fps: parseFrameRate(videoStream.r_frame_rate) ?? 30,
    hasAudio: Boolean(audioStream),
    codec: videoStream.codec_name ?? "unknown",
  };
};
