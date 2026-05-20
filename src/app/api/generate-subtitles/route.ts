import { NextResponse } from "next/server";
import {
  ManualReelScript,
  ManualReelTemplate,
} from "../../../../packages/template-engine/manual-template-schema";
import type { ApiResponse } from "../../../helpers/api-response";

export const runtime = "nodejs";

type Subtitle = {
  sceneId: string;
  start: number;
  end: number;
  text: string;
};

export const POST = async (req: Request) => {
  try {
    const body = (await req.json()) as {
      template?: unknown;
      script?: unknown;
    };
    const template = ManualReelTemplate.parse(body.template);
    const script = ManualReelScript.parse(body.script);
    const subtitles: Subtitle[] = template.scenes.map((scene) => {
      const line = script.script.find((item) => item.sceneId === scene.id);

      return {
        sceneId: scene.id,
        start: scene.start,
        end: scene.end,
        text: line?.caption ?? scene.caption.text,
      };
    });

    return NextResponse.json<ApiResponse<Subtitle[]>>({
      type: "success",
      data: subtitles,
    });
  } catch (err) {
    return NextResponse.json<ApiResponse<never>>(
      {
        type: "error",
        message: (err as Error).message,
      },
      { status: 400 },
    );
  }
};
