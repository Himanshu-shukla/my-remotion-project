import { NextResponse } from "next/server";
import {
  ManualReelScript,
  ManualReelTemplate,
} from "../../../../packages/template-engine/manual-template-schema";
import type { ApiResponse } from "../../../helpers/api-response";

export const runtime = "nodejs";

const baseLines = [
  {
    voiceover:
      "Most people are waiting for the job market to slow down before they upskill.",
    caption: "Waiting is expensive",
  },
  {
    voiceover:
      "But companies are already hiring people who can turn data into decisions.",
    caption: "Data skills win",
  },
  {
    voiceover:
      "With the right analytics workflow, you can understand customers, costs, and growth faster.",
    caption: "Turn data into decisions",
  },
  {
    voiceover:
      "Learn dashboards, SQL, Excel, Python, and AI tools through practical business projects.",
    caption: "Build practical analytics skills",
  },
  {
    voiceover:
      "This is designed for learners who want career clarity, portfolio proof, and interview confidence.",
    caption: "Portfolio. Clarity. Confidence.",
  },
  {
    voiceover:
      "If you want a data analytics career in the UK, start before the next intake fills.",
    caption: "Start before seats fill",
  },
];

const promptToTitle = (prompt: string) => {
  const cleaned = prompt
    .replace(/^create\s+a\s+reel\s+for\s+/i, "")
    .replace(/[.?!]+$/g, "")
    .trim();

  if (!cleaned) {
    return "Manual Reel Script";
  }

  return cleaned
    .split(/\s+/)
    .slice(0, 7)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const POST = async (req: Request) => {
  try {
    const body = (await req.json()) as {
      prompt?: string;
      tone?: string;
      template?: unknown;
    };
    const template = ManualReelTemplate.parse(body.template);
    const prompt = body.prompt?.trim() || "Create a conversion-focused reel";
    const tone = body.tone?.trim() || "urgent, educational, conversion-focused";

    const script: ManualReelScript = {
      title: promptToTitle(prompt),
      script: template.scenes.map((scene, index) => {
        const fallback = baseLines[index % baseLines.length];
        const isFirst = index === 0;
        const isLast = index === template.scenes.length - 1;

        return {
          sceneId: scene.id,
          voiceover: isFirst
            ? `${fallback.voiceover} ${prompt}`
            : isLast
              ? `${fallback.voiceover} The tone is ${tone}.`
              : fallback.voiceover,
          caption: fallback.caption,
        };
      }),
    };

    return NextResponse.json<ApiResponse<ManualReelScript>>({
      type: "success",
      data: script,
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
