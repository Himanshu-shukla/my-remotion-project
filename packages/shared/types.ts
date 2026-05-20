import { z } from "zod";

export const VideoAnalysis = z.object({
  sourceKey: z.string(),
  projectId: z.string().optional(),
  metadata: z
    .object({
      width: z.number().positive(),
      height: z.number().positive(),
      fps: z.number().positive(),
      duration: z.number().positive(),
      hasAudio: z.boolean(),
      codec: z.string(),
    })
    .optional(),
  durationInSeconds: z.number().positive(),
  width: z.number().positive(),
  height: z.number().positive(),
  fps: z.number().positive().optional(),
  hasAudio: z.boolean().optional(),
  codec: z.string().optional(),
  scenes: z.array(
    z.object({
      startMs: z.number().min(0),
      endMs: z.number().min(0),
      score: z.number().min(0).optional(),
      keyframe: z.string().optional(),
    }),
  ),
  audio: z
    .object({
      wav: z.string().nullable(),
      extracted: z.boolean(),
    })
    .optional(),
  transcription: z
    .object({
      language: z.string(),
      provider: z.string(),
      segments: z.array(
        z.object({
          start: z.number().min(0),
          end: z.number().min(0),
          text: z.string(),
          words: z
            .array(
              z.object({
                word: z.string(),
                start: z.number().min(0),
                end: z.number().min(0),
              }),
            )
            .optional(),
        }),
      ),
    })
    .optional(),
  layout: z
    .object({
      captionBox: z.object({
        x: z.number().min(0),
        y: z.number().min(0),
        width: z.number().positive(),
        height: z.number().positive(),
      }),
      captionConfidence: z.number().min(0).max(1),
      avatar: z.object({
        x: z.number().min(0),
        y: z.number().min(0),
        width: z.number().positive(),
        height: z.number().positive(),
      }),
      avatarConfidence: z.number().min(0).max(1),
    })
    .optional(),
});

export type VideoAnalysis = z.infer<typeof VideoAnalysis>;
