import { execFile } from "child_process";
import { mkdir } from "fs/promises";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export const getAudioExtractionCommand = (
  inputPath: string,
  outputPath: string,
) => [
  "remotion",
  "ffmpeg",
  "-i",
  inputPath,
  "-vn",
  "-acodec",
  "pcm_s16le",
  "-ar",
  "16000",
  "-ac",
  "1",
  outputPath,
];

export const extractAudio = async ({
  inputPath,
  outputDir,
  publicBasePath,
}: {
  inputPath: string;
  outputDir: string;
  publicBasePath: string;
}) => {
  await mkdir(outputDir, { recursive: true });

  const filename = "source.wav";
  const outputPath = path.join(outputDir, filename);

  await execFileAsync("npx", [
    "remotion",
    "ffmpeg",
    "-y",
    "-i",
    inputPath,
    "-vn",
    "-acodec",
    "pcm_s16le",
    "-ar",
    "16000",
    "-ac",
    "1",
    outputPath,
  ]);

  return {
    path: outputPath,
    url: `${publicBasePath}/${filename}`,
  };
};
