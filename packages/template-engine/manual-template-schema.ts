import { z } from "zod";

export const CaptionStyle = z.object({
  text: z.string(),
  position: z.enum(["top", "center", "bottom"]),
  x: z.number().min(0),
  y: z.number().min(0),
  width: z.number().positive(),
  height: z.number().positive().optional(),
  fontSize: z.number().min(18).max(180),
  fontWeight: z.enum(["normal", "bold", "black"]),
  color: z.string(),
  strokeColor: z.string().optional(),
  strokeWidth: z.number().min(0).optional(),
  animation: z.enum(["none", "word_pop", "slide_up", "fade_in"]),
});

export type CaptionStyle = z.infer<typeof CaptionStyle>;

export const AvatarPlacement = z.object({
  x: z.number().min(0),
  y: z.number().min(0),
  width: z.number().positive(),
  height: z.number().positive(),
  borderRadius: z.number().min(0).optional(),
  animation: z.enum(["none", "float", "zoom_in", "slide_in"]).optional(),
});

export type AvatarPlacement = z.infer<typeof AvatarPlacement>;

export const ReelScene = z
  .object({
    id: z.string(),
    start: z.number().min(0),
    end: z.number().min(0),
    duration: z.number().positive(),
    layout: z.enum([
      "avatar_left_text_right",
      "avatar_right_text_left",
      "full_bg_caption_bottom",
      "split_screen",
    ]),
    backgroundType: z.enum(["solid", "gradient", "image", "video"]),
    backgroundAsset: z.string().optional(),
    keyframe: z.string().optional(),
    caption: CaptionStyle,
    avatar: AvatarPlacement.optional(),
  })
  .refine((scene) => scene.end > scene.start, {
    message: "end must be greater than start",
    path: ["end"],
  });

export type ReelScene = z.infer<typeof ReelScene>;

export const ManualReelTemplate = z.object({
  version: z.literal("1.0"),
  name: z.string(),
  source: z
    .object({
      sampleVideo: z.string().optional(),
      duration: z.number().positive().optional(),
      analyzedAt: z.string().optional(),
    })
    .optional(),
  fps: z.number().positive(),
  width: z.number().positive(),
  height: z.number().positive(),
  duration: z.number().positive(),
  scenes: z.array(ReelScene).min(1),
});

export type ManualReelTemplate = z.infer<typeof ManualReelTemplate>;

export const ScriptScene = z.object({
  sceneId: z.string(),
  voiceover: z.string(),
  caption: z.string(),
});

export type ScriptScene = z.infer<typeof ScriptScene>;

export const ManualReelScript = z.object({
  title: z.string(),
  script: z.array(ScriptScene),
});

export type ManualReelScript = z.infer<typeof ManualReelScript>;

export const ManualReelProps = z.object({
  template: ManualReelTemplate,
  script: ManualReelScript.optional(),
  avatar: z.string().optional(),
  assets: z.record(z.string(), z.string()).default({}),
});

export type ManualReelProps = z.infer<typeof ManualReelProps>;

export const defaultManualTemplate: ManualReelTemplate = {
  version: "1.0",
  name: "Manual Reel Template",
  fps: 30,
  width: 1080,
  height: 1920,
  duration: 30,
  scenes: [
    {
      id: "scene_1",
      start: 0,
      end: 3,
      duration: 3,
      layout: "avatar_left_text_right",
      backgroundType: "gradient",
      caption: {
        text: "Your hook here",
        position: "bottom",
        x: 80,
        y: 1450,
        width: 920,
        height: 320,
        fontSize: 64,
        fontWeight: "black",
        color: "#ffffff",
        strokeColor: "#000000",
        strokeWidth: 4,
        animation: "word_pop",
      },
      avatar: {
        x: 70,
        y: 550,
        width: 420,
        height: 900,
        animation: "float",
      },
    },
  ],
};

const layouts: ReelScene["layout"][] = [
  "avatar_left_text_right",
  "avatar_right_text_left",
  "full_bg_caption_bottom",
  "split_screen",
];

const captionPositions: CaptionStyle["position"][] = ["bottom", "center", "top"];

export const makeManualTemplate = ({
  sceneCount,
  duration,
  sampleVideo,
}: {
  sceneCount: number;
  duration: number;
  sampleVideo?: string;
}): ManualReelTemplate => {
  const safeSceneCount = Math.max(1, Math.min(12, Math.round(sceneCount)));
  const safeDuration = Math.max(3, duration);
  const sceneDuration = safeDuration / safeSceneCount;

  return {
    ...defaultManualTemplate,
    duration: safeDuration,
    scenes: Array.from({ length: safeSceneCount }, (_, index) => {
      const start = Number((index * sceneDuration).toFixed(2));
      const end =
        index === safeSceneCount - 1
          ? safeDuration
          : Number(((index + 1) * sceneDuration).toFixed(2));
      const layout = layouts[index % layouts.length];
      const fullBg = layout === "full_bg_caption_bottom";
      const avatarLeft = layout !== "avatar_right_text_left";

      return {
        id: `scene_${index + 1}`,
        start,
        end,
        duration: Number((end - start).toFixed(2)),
        layout,
        backgroundType: sampleVideo ? "video" : index % 2 === 0 ? "gradient" : "solid",
        backgroundAsset: sampleVideo,
        caption: {
          text: index === 0 ? "Your hook here" : `Scene ${index + 1} caption`,
          position: captionPositions[index % captionPositions.length],
          x: fullBg ? 80 : avatarLeft ? 540 : 80,
          y: fullBg ? 1450 : 1040,
          width: fullBg ? 920 : 460,
          height: fullBg ? 320 : 300,
          fontSize: index === 0 ? 64 : 56,
          fontWeight: "black",
          color: "#ffffff",
          strokeColor: "#050505",
          strokeWidth: 4,
          animation: index % 2 === 0 ? "word_pop" : "slide_up",
        },
        avatar: fullBg
          ? undefined
          : {
              x: avatarLeft ? 70 : 590,
              y: 560,
              width: 420,
              height: 780,
              borderRadius: 36,
              animation: index % 2 === 0 ? "float" : "zoom_in",
            },
      };
    }),
  };
};
