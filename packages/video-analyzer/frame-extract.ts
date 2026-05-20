import { execFile } from "child_process";
import { mkdir } from "fs/promises";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export type SceneTiming = {
  startMs: number;
  endMs: number;
};

export const getFrameExtractionCommand = (
  inputPath: string,
  outputPattern: string,
) => [
  "remotion",
  "ffmpeg",
  "-i",
  inputPath,
  "-vf",
  "fps=1",
  outputPattern,
];

export const extractKeyframes = async ({
  filePath,
  scenes,
  outputDir,
  publicBasePath,
}: {
  filePath: string;
  scenes: SceneTiming[];
  outputDir: string;
  publicBasePath: string;
}) => {
  await mkdir(outputDir, { recursive: true });

  return Promise.all(
    scenes.map(async (scene, index) => {
      const filename = `scene_${String(index + 1).padStart(3, "0")}.jpg`;
      const outputPath = path.join(outputDir, filename);
      const seekSeconds = Math.max(0, scene.startMs / 1000 + 0.05).toFixed(3);

      await execFileAsync("npx", [
        "remotion",
        "ffmpeg",
        "-y",
        "-ss",
        seekSeconds,
        "-i",
        filePath,
        "-frames:v",
        "1",
        "-q:v",
        "3",
        outputPath,
      ]);

      return {
        ...scene,
        keyframe: `${publicBasePath}/${filename}`,
      };
    }),
  );
};
