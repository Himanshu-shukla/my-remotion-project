import { randomUUID } from "crypto";
import type { VideoAnalysis } from "../shared/types";
import { detectCaptionStyle } from "./caption-style-detector";
import { ReelTemplate } from "./template-schema";
import {
  makeManualTemplate,
  ManualReelTemplate,
} from "./manual-template-schema";

const defaultSceneTexts = [
  "HOOK",
  "PROBLEM",
  "SHIFT",
  "RESULT",
  "ACTION",
] as const;

export const buildCaptionTimelineFromScenes = ({
  analysis,
  lines = defaultSceneTexts,
  accentColor,
}: {
  analysis: VideoAnalysis;
  lines?: readonly string[];
  accentColor: string;
}) => {
  const scenes =
    analysis.scenes.length > 0
      ? analysis.scenes
      : [
          {
            startMs: 0,
            endMs: Math.round(analysis.durationInSeconds * 1000),
          },
        ];

  return scenes.slice(0, 5).map((scene, index) => ({
    startMs: scene.startMs,
    endMs: scene.endMs,
    position: index % 3 === 2 ? "bottom" : "center",
    align: "center",
    background: index !== 0,
    textTransform: "uppercase",
    lines: [
      {
        text: lines[index] ?? `SCENE ${index + 1}`,
        color: index % 2 === 0 ? "#ffffff" : accentColor,
        fontSize: index === 0 ? 104 : 78,
        fontWeight: 900,
      },
    ],
  }));
};

export const buildTemplate = ({
  analysis,
  name,
  templateHint,
}: {
  analysis: VideoAnalysis;
  name?: string;
  templateHint?: string;
}) => {
  const captionStyle = detectCaptionStyle(templateHint);
  const defaultCaptionTimeline = buildCaptionTimelineFromScenes({
    analysis,
    accentColor: captionStyle.accentColor,
  });

  return ReelTemplate.parse({
    id: randomUUID(),
    name: name ?? "Extracted reel template",
    sourceKey: analysis.sourceKey,
    structure: {
      durationInSeconds: analysis.durationInSeconds,
      width: analysis.width,
      height: analysis.height,
      scenes: analysis.scenes,
    },
    captionStyle,
    defaultCaptionTimeline,
    createdAt: new Date().toISOString(),
  });
};

export const buildManualReelTemplate = ({
  name = "Manual Reel Template",
  sceneCount = 8,
  duration = 30,
  sampleVideo,
}: {
  name?: string;
  sceneCount?: number;
  duration?: number;
  sampleVideo?: string;
}): ManualReelTemplate => {
  return ManualReelTemplate.parse({
    ...makeManualTemplate({
      sceneCount,
      duration,
      sampleVideo,
    }),
    name,
  });
};

const getCaptionForScene = ({
  transcription,
  start,
  end,
  fallback,
}: {
  transcription?: {
    segments: Array<{
      start: number;
      end: number;
      text: string;
    }>;
  };
  start: number;
  end: number;
  fallback: string;
}) => {
  const segment = transcription?.segments.find(
    (item) => item.start < end && item.end > start,
  );

  return segment?.text.trim() || fallback;
};

const captionPositionFromY = (y: number, height: number) => {
  if (y < height * 0.33) {
    return "top" as const;
  }

  if (y < height * 0.58) {
    return "center" as const;
  }

  return "bottom" as const;
};

export const buildDraftManualTemplate = ({
  analysis,
  sampleVideo,
  name = "Extracted reel template",
}: {
  analysis: VideoAnalysis;
  sampleVideo: string;
  name?: string;
}): ManualReelTemplate => {
  const layout = analysis.layout;
  const captionBox = layout?.captionBox ?? {
    x: 80,
    y: 1300,
    width: 920,
    height: 320,
  };
  const avatar = layout?.avatar ?? {
    x: 50,
    y: 480,
    width: 430,
    height: 950,
  };
  const duration = Number(analysis.durationInSeconds.toFixed(2));
  const scenes =
    analysis.scenes.length > 0
      ? analysis.scenes
      : [{ startMs: 0, endMs: Math.round(duration * 1000) }];

  return ManualReelTemplate.parse({
    version: "1.0",
    name,
    source: {
      sampleVideo,
      duration,
      analyzedAt: new Date().toISOString(),
    },
    fps: analysis.fps ?? analysis.metadata?.fps ?? 30,
    width: analysis.width,
    height: analysis.height,
    duration,
    scenes: scenes.map((scene, index) => {
      const start = Number((scene.startMs / 1000).toFixed(2));
      const end = Number((scene.endMs / 1000).toFixed(2));
      const fullBackground = index % 3 === 2;

      return {
        id: `scene_${index + 1}`,
        start,
        end,
        duration: Number(Math.max(0.1, end - start).toFixed(2)),
        layout: fullBackground
          ? "full_bg_caption_bottom"
          : index % 2 === 0
            ? "avatar_left_text_right"
            : "avatar_right_text_left",
        backgroundType: "video",
        backgroundAsset: sampleVideo,
        keyframe: scene.keyframe,
        caption: {
          text: getCaptionForScene({
            transcription: analysis.transcription,
            start,
            end,
            fallback: index === 0 ? "Your hook here" : `Scene ${index + 1}`,
          }),
          position: captionPositionFromY(captionBox.y, analysis.height),
          x: captionBox.x,
          y: captionBox.y,
          width: captionBox.width,
          height: captionBox.height,
          fontSize: index === 0 ? 64 : 56,
          fontWeight: "black",
          color: "#ffffff",
          strokeColor: "#050505",
          strokeWidth: 4,
          animation: "word_pop",
        },
        avatar: fullBackground
          ? undefined
          : {
              ...avatar,
              borderRadius: 36,
              animation: "float",
            },
      };
    }),
  });
};
