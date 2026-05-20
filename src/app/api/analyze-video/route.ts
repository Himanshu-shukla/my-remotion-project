import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { ApiResponse } from "../../../helpers/api-response";
import { updateProject } from "../../../../packages/projects/project-store";
import { publicKeyToPath } from "../../../../packages/shared/utils";
import { buildDraftManualTemplate } from "../../../../packages/template-engine/template-builder";
import { VideoAnalysis } from "../../../../packages/shared/types";
import {
  detectApproximateLayout,
  detectScenes,
  extractAudio,
  extractKeyframes,
  getVideoMetadata,
  transcribeAudio,
} from "../../../../packages/video-analyzer/ffmpeg";

export const runtime = "nodejs";
export const maxDuration = 300;

const AnalyzeVideoRequest = z.object({
  projectId: z.string(),
  key: z.string(),
  templateName: z.string().optional(),
});

type AnalyzeVideoResponse = {
  analysis: z.infer<typeof VideoAnalysis>;
  template: ReturnType<typeof buildDraftManualTemplate>;
  templatePath: string;
  analysisPath: string;
};

const errorResponse = (message: string, status = 400) => {
  return NextResponse.json<ApiResponse<AnalyzeVideoResponse>>(
    {
      type: "error",
      message,
    },
    { status },
  );
};

const normalizeScenes = ({
  scenes,
  durationInSeconds,
}: {
  scenes: Array<{ startMs: number; endMs: number }>;
  durationInSeconds: number;
}) => {
  const fallback = [
    {
      startMs: 0,
      endMs: Math.round(durationInSeconds * 1000),
    },
  ];
  const normalized = (scenes.length > 0 ? scenes : fallback)
    .map((scene) => ({
      startMs: Math.max(0, Math.round(scene.startMs)),
      endMs: Math.min(
        Math.round(durationInSeconds * 1000),
        Math.round(scene.endMs),
      ),
    }))
    .filter((scene) => scene.endMs - scene.startMs >= 250)
    .slice(0, 24);

  return normalized.length > 0 ? normalized : fallback;
};

export const POST = async (req: Request) => {
  let projectId: string | undefined;

  try {
    const body = AnalyzeVideoRequest.parse(await req.json());
    projectId = body.projectId;
    const filePath = publicKeyToPath(body.key);
    const metadata = await getVideoMetadata(filePath);
    const rawScenes = await detectScenes({
      filePath,
      durationInSeconds: metadata.durationInSeconds,
    });
    const scenes = normalizeScenes({
      scenes: rawScenes,
      durationInSeconds: metadata.durationInSeconds,
    });
    const projectPublicBase = `/storage/projects/${body.projectId}`;
    const projectDir = path.join(
      process.cwd(),
      "public",
      "storage",
      "projects",
      body.projectId,
    );
    const keyframes = await extractKeyframes({
      filePath,
      scenes,
      outputDir: path.join(projectDir, "keyframes"),
      publicBasePath: `${projectPublicBase}/keyframes`,
    });
    let audioPath: string | null = null;
    let audioUrl: string | null = null;

    if (metadata.hasAudio) {
      try {
        const audio = await extractAudio({
          inputPath: filePath,
          outputDir: path.join(projectDir, "audio"),
          publicBasePath: `${projectPublicBase}/audio`,
        });
        audioPath = audio.path;
        audioUrl = audio.url;
      } catch {
        audioPath = null;
        audioUrl = null;
      }
    }

    const transcription = await transcribeAudio({
      audioPath,
      outputDir: path.join(projectDir, "transcript"),
      scenes: keyframes,
    });
    const layout = detectApproximateLayout({
      width: metadata.width,
      height: metadata.height,
    });
    const analysis = VideoAnalysis.parse({
      sourceKey: body.key,
      projectId: body.projectId,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        fps: metadata.fps,
        duration: metadata.durationInSeconds,
        hasAudio: metadata.hasAudio,
        codec: metadata.codec,
      },
      durationInSeconds: metadata.durationInSeconds,
      width: metadata.width,
      height: metadata.height,
      fps: metadata.fps,
      hasAudio: metadata.hasAudio,
      codec: metadata.codec,
      scenes: keyframes,
      audio: {
        wav: audioUrl,
        extracted: Boolean(audioUrl),
      },
      transcription,
      layout,
    });
    const template = buildDraftManualTemplate({
      analysis,
      sampleVideo: body.key.startsWith("/") ? body.key : `/${body.key}`,
      name: body.templateName,
    });

    await mkdir(projectDir, { recursive: true });
    const templatePath = path.join(projectDir, "draft-template.json");
    const analysisPath = path.join(projectDir, "analysis.json");
    await Promise.all([
      writeFile(templatePath, JSON.stringify(template, null, 2)),
      writeFile(analysisPath, JSON.stringify(analysis, null, 2)),
      updateProject(body.projectId, {
        analysisJson: JSON.stringify(analysis, null, 2),
        templateJson: JSON.stringify(template, null, 2),
        status: "analyzed",
      }),
    ]);

    return NextResponse.json<ApiResponse<AnalyzeVideoResponse>>({
      type: "success",
      data: {
        analysis,
        template,
        templatePath,
        analysisPath,
      },
    });
  } catch (err) {
    if (projectId) {
      await updateProject(projectId, {
        status: "analysis_error",
      });
    }

    return errorResponse((err as Error).message, 500);
  }
};
