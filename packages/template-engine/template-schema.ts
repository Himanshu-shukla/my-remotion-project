import { z } from "zod";
import { CaptionTimeline } from "../../types/constants";
import { VideoAnalysis } from "../shared/types";

export const ReelTemplate = z.object({
  id: z.string(),
  name: z.string(),
  sourceKey: z.string(),
  structure: z.object({
    durationInSeconds: z.number().positive(),
    width: z.number().positive(),
    height: z.number().positive(),
    scenes: VideoAnalysis.shape.scenes,
  }),
  captionStyle: z.object({
    position: z.enum(["top", "center", "bottom"]),
    align: z.enum(["left", "center", "right"]),
    background: z.boolean(),
    textTransform: z.enum(["none", "uppercase"]),
    accentColor: z.string(),
  }),
  defaultCaptionTimeline: CaptionTimeline,
  createdAt: z.string(),
});

export type ReelTemplate = z.infer<typeof ReelTemplate>;
