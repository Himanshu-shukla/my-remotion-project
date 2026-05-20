import { z } from "zod";
export const COMP_NAME = "MyComp";
export const MANUAL_REEL_COMP_NAME = "ManualReel";

export const captionTemplates = [
  {
    id: "show-up",
    label: "Show Up",
    lines: ["SHOW UP", "BE REAL"],
    highlightLineIndex: 1,
    accentColor: "#8b5cf6",
    symbol: "heart",
  },
  {
    id: "one-idea",
    label: "One Idea",
    lines: ["ONE IDEA", "CAN CHANGE IT"],
    highlightLineIndex: 1,
    accentColor: "#facc15",
    symbol: "bulb",
  },
  {
    id: "audience",
    label: "Audience",
    lines: ["AUDIENCE", "OVER ALGORITHM"],
    highlightLineIndex: 0,
    accentColor: "#a855f7",
    symbol: "people",
  },
  {
    id: "systems",
    label: "Systems",
    lines: ["SYSTEMS", "CREATE FREEDOM"],
    highlightLineIndex: 1,
    accentColor: "#38bdf8",
    symbol: "gear",
  },
  {
    id: "keep-learning",
    label: "Keep Learning",
    lines: ["KEEP LEARNING", "KEEP GROWING"],
    highlightLineIndex: 1,
    accentColor: "#a78bfa",
    symbol: "spark",
  },
  {
    id: "your-voice",
    label: "Your Voice",
    lines: ["YOUR VOICE", "MATTERS"],
    highlightLineIndex: 1,
    accentColor: "#fb7185",
    symbol: "chat",
  },
] as const;

export type CaptionTemplateId = (typeof captionTemplates)[number]["id"];

export const defaultCaptionTemplate = captionTemplates[0];

export const videoFrameOptions = [
  {
    id: "instagram-reel",
    label: "Instagram Reel",
    dimensions: "1080 x 1920",
    width: 1080,
    height: 1920,
    aspectRatio: "9:16",
  },
  {
    id: "youtube-full-hd",
    label: "YouTube Full HD",
    dimensions: "1920 x 1080",
    width: 1920,
    height: 1080,
    aspectRatio: "16:9",
  },
  {
    id: "instagram-square",
    label: "Instagram Square",
    dimensions: "1080 x 1080",
    width: 1080,
    height: 1080,
    aspectRatio: "1:1",
  },
  {
    id: "instagram-portrait",
    label: "Instagram Portrait",
    dimensions: "1080 x 1350",
    width: 1080,
    height: 1350,
    aspectRatio: "4:5",
  },
  {
    id: "facebook-landscape",
    label: "Facebook Landscape",
    dimensions: "1280 x 720",
    width: 1280,
    height: 720,
    aspectRatio: "16:9",
  },
] as const;

export const defaultVideoFrameOption = videoFrameOptions[0];

export type VideoFrameOptionId = (typeof videoFrameOptions)[number]["id"];

export const getVideoFrameOption = (
  id: string | undefined,
): (typeof videoFrameOptions)[number] => {
  return (
    videoFrameOptions.find((option) => option.id === id) ??
    defaultVideoFrameOption
  );
};

export const CaptionTimelineLine = z.object({
  text: z.string(),
  color: z.string().optional(),
  fontSize: z.number().min(18).max(180).optional(),
  fontWeight: z.number().min(100).max(1000).optional(),
});

export const CaptionTimelineItem = z
  .object({
    startMs: z.number().min(0),
    endMs: z.number().min(0),
    position: z.enum(["top", "center", "bottom"]).optional(),
    align: z.enum(["left", "center", "right"]).optional(),
    background: z.boolean().optional(),
    textTransform: z.enum(["none", "uppercase"]).optional(),
    lines: z.array(CaptionTimelineLine).min(1),
  })
  .refine((item) => item.endMs > item.startMs, {
    message: "endMs must be greater than startMs",
    path: ["endMs"],
  });

export const CaptionTimeline = z.array(CaptionTimelineItem);

export const DURATION_IN_FRAMES = 200;
export const VIDEO_FPS = 30;

export const CompositionProps = z.object({
  videoSrc: z.string(),
  captionTemplateId: z.string(),
  captionText: z.string(),
  captionTimeline: CaptionTimeline.optional(),
  videoDurationInSeconds: z
    .number()
    .positive()
    .default(DURATION_IN_FRAMES / VIDEO_FPS),
  videoFrameId: z
    .enum([
      "instagram-reel",
      "youtube-full-hd",
      "instagram-square",
      "instagram-portrait",
      "facebook-landscape",
    ])
    .default(defaultVideoFrameOption.id),
});

export const defaultCaptionTimeline: z.infer<typeof CaptionTimeline> = [
  {
    startMs: 0,
    endMs: 1200,
    position: "center",
    background: false,
    lines: [
      {
        text: "Hello",
        fontSize: 118,
      },
    ],
  },
  {
    startMs: 1200,
    endMs: 3200,
    position: "center",
    background: true,
    lines: [
      {
        text: "I am",
        fontSize: 76,
      },
      {
        text: "Himanshu Shukla",
        color: "#38bdf8",
        fontSize: 104,
      },
    ],
  },
  {
    startMs: 3200,
    endMs: 5000,
    position: "bottom",
    background: true,
    lines: [
      {
        text: "Senior software engineer",
        fontSize: 66,
      },
      {
        text: "at Google",
        color: "#38bdf8",
        fontSize: 82,
      },
    ],
  },
  {
    startMs: 5000,
    endMs: 6600,
    position: "center",
    background: true,
    lines: [
      {
        text: "Launching AI for every user",
        color: "#ffffff",
        fontSize: 62,
      },
    ],
  },
];

export const defaultMyCompProps: z.infer<typeof CompositionProps> = {
  videoSrc: "",
  captionTemplateId: defaultCaptionTemplate.id,
  captionText: defaultCaptionTemplate.lines.join("\n"),
  captionTimeline: defaultCaptionTimeline,
  videoDurationInSeconds: DURATION_IN_FRAMES / VIDEO_FPS,
  videoFrameId: defaultVideoFrameOption.id,
};

export const VIDEO_WIDTH = defaultVideoFrameOption.width;
export const VIDEO_HEIGHT = defaultVideoFrameOption.height;
