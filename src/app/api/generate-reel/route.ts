import { NextResponse } from "next/server";
import { z } from "zod";
import type { ApiResponse } from "../../../helpers/api-response";
import { generateCaptionLines } from "../../../../packages/ai/script-generator";
import { ReelTemplate } from "../../../../packages/template-engine/template-schema";
import { CaptionTimeline } from "../../../../types/constants";

export const runtime = "nodejs";

const GenerateReelRequest = z.object({
  template: ReelTemplate,
  prompt: z.string().min(1),
  brandName: z.string().optional(),
});

type GenerateReelResponse = {
  captionTimeline: z.infer<typeof CaptionTimeline>;
};

const errorResponse = (message: string, status = 400) => {
  return NextResponse.json<ApiResponse<GenerateReelResponse>>(
    {
      type: "error",
      message,
    },
    { status },
  );
};

export const POST = async (req: Request) => {
  try {
    const body = GenerateReelRequest.parse(await req.json());
    const lines = generateCaptionLines({
      prompt: body.prompt,
      brandName: body.brandName,
      template: body.template,
    });
    const captionTimeline = body.template.defaultCaptionTimeline.map(
      (caption, index) => ({
        ...caption,
        lines: caption.lines.map((line, lineIndex) => ({
          ...line,
          text:
            lineIndex === 0
              ? (lines[index] ?? line.text)
              : body.brandName || line.text,
          color:
            line.color === "#ffffff"
              ? line.color
              : body.template.captionStyle.accentColor,
        })),
      }),
    );

    return NextResponse.json<ApiResponse<GenerateReelResponse>>({
      type: "success",
      data: {
        captionTimeline,
      },
    });
  } catch (err) {
    return errorResponse((err as Error).message, 500);
  }
};
