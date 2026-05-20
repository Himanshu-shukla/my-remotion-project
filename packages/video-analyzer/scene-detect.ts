import { execFile } from "child_process";
import { promisify } from "util";
import { DEFAULT_SCENE_THRESHOLD } from "../shared/constants";

const execFileAsync = promisify(execFile);

const parseSceneTimes = (stderr: string) => {
  const times: number[] = [];
  const matcher = /pts_time:([0-9.]+)/g;
  let match = matcher.exec(stderr);

  while (match) {
    const value = Number(match[1]);
    if (Number.isFinite(value) && value > 0) {
      times.push(value);
    }
    match = matcher.exec(stderr);
  }

  return times;
};

export const detectScenes = async ({
  filePath,
  durationInSeconds,
  threshold = DEFAULT_SCENE_THRESHOLD,
}: {
  filePath: string;
  durationInSeconds: number;
  threshold?: number;
}) => {
  const { stderr } = await execFileAsync(
    "npx",
    [
      "remotion",
      "ffmpeg",
      "-hide_banner",
      "-i",
      filePath,
      "-vf",
      `select=gt(scene\\,${threshold}),showinfo`,
      "-an",
      "-f",
      "null",
      "-",
    ],
    {
      maxBuffer: 1024 * 1024 * 8,
    },
  );
  const sceneTimes = parseSceneTimes(stderr);
  const boundaries = [0, ...sceneTimes, durationInSeconds]
    .filter((value, index, list) => index === 0 || value - list[index - 1] > 0.25)
    .sort((left, right) => left - right);

  return boundaries.slice(0, -1).map((start, index) => ({
    startMs: Math.round(start * 1000),
    endMs: Math.round(boundaries[index + 1] * 1000),
  }));
};
