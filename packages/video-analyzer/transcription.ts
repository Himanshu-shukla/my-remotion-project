import { execFile } from "child_process";
import { mkdir, readFile } from "fs/promises";
import path from "path";
import { promisify } from "util";
import type { SceneTiming } from "./frame-extract";

const execFileAsync = promisify(execFile);

export type TranscriptWord = {
  word: string;
  start: number;
  end: number;
};

export type TranscriptSegment = {
  start: number;
  end: number;
  text: string;
  words?: TranscriptWord[];
};

export type TranscriptionResult = {
  language: string;
  provider: "whisper-local" | "mock";
  segments: TranscriptSegment[];
};

type WhisperJson = {
  language?: string;
  segments?: Array<{
    start?: number;
    end?: number;
    text?: string;
    words?: Array<{
      word?: string;
      start?: number;
      end?: number;
    }>;
  }>;
};

const makeMockWords = (text: string, start: number, end: number) => {
  const words = text.split(/\s+/).filter(Boolean);
  const duration = Math.max(0.1, end - start);
  const wordDuration = duration / Math.max(1, words.length);

  return words.map((word, index) => ({
    word,
    start: Number((start + index * wordDuration).toFixed(2)),
    end: Number((start + (index + 1) * wordDuration).toFixed(2)),
  }));
};

export const createMockTranscription = (
  scenes: SceneTiming[],
): TranscriptionResult => ({
  language: "en",
  provider: "mock",
  segments: scenes.map((scene, index) => {
    const start = Number((scene.startMs / 1000).toFixed(2));
    const end = Number((scene.endMs / 1000).toFixed(2));
    const text =
      index === 0
        ? "Add your hook caption here."
        : `Add scene ${index + 1} caption here.`;

    return {
      start,
      end,
      text,
      words: makeMockWords(text, start, end),
    };
  }),
});

const parseWhisperJson = (json: WhisperJson): TranscriptionResult => ({
  language: json.language ?? "en",
  provider: "whisper-local",
  segments: (json.segments ?? [])
    .map((segment) => {
      const start = Number(segment.start ?? 0);
      const end = Number(segment.end ?? start);
      const text = (segment.text ?? "").trim();

      return {
        start,
        end,
        text,
        words: segment.words
          ?.map((word) => ({
            word: (word.word ?? "").trim(),
            start: Number(word.start ?? start),
            end: Number(word.end ?? end),
          }))
          .filter((word) => word.word && word.end > word.start),
      };
    })
    .filter((segment) => segment.text && segment.end > segment.start),
});

export const transcribeAudio = async ({
  audioPath,
  outputDir,
  scenes,
}: {
  audioPath: string | null;
  outputDir: string;
  scenes: SceneTiming[];
}): Promise<TranscriptionResult> => {
  if (!audioPath) {
    return createMockTranscription(scenes);
  }

  await mkdir(outputDir, { recursive: true });

  try {
    await execFileAsync(
      process.env.WHISPER_COMMAND ?? "whisper",
      [
        audioPath,
        "--output_format",
        "json",
        "--word_timestamps",
        "True",
        "--output_dir",
        outputDir,
      ],
      {
        maxBuffer: 1024 * 1024 * 32,
      },
    );

    const basename = path.basename(audioPath, path.extname(audioPath));
    const outputPath = path.join(outputDir, `${basename}.json`);
    const parsed = parseWhisperJson(
      JSON.parse(await readFile(outputPath, "utf8")) as WhisperJson,
    );

    return parsed.segments.length > 0
      ? parsed
      : createMockTranscription(scenes);
  } catch {
    return createMockTranscription(scenes);
  }
};
