import { mkdir, stat } from "fs/promises";
import path from "path";
import { pathToFileURL } from "url";
import { NextResponse } from "next/server";
import {
  ManualReelProps,
  ManualReelScript,
  ManualReelTemplate,
} from "../../../../packages/template-engine/manual-template-schema";
import { updateProject } from "../../../../packages/projects/project-store";
import { MANUAL_REEL_COMP_NAME } from "../../../../types/constants";
import type { ApiResponse } from "../../../helpers/api-response";

export const runtime = "nodejs";
export const maxDuration = 300;

type ManualRenderResponse = {
  url: string;
  size: number;
};

type RemotionServerTools = {
  bundle: (options: {
    entryPoint: string;
    webpackOverride: unknown;
    outDir: string;
    publicDir: string;
    enableCaching: boolean;
    ignoreRegisterRootWarning: boolean;
    onProgress: () => undefined;
  }) => Promise<string>;
  selectComposition: (options: {
    serveUrl: string;
    id: string;
    inputProps: Record<string, unknown>;
    logLevel: "warn";
  }) => Promise<unknown>;
  renderMedia: (options: {
    composition: unknown;
    serveUrl: string;
    codec: "h264";
    inputProps: Record<string, unknown>;
    outputLocation: string;
    overwrite: boolean;
    logLevel: "warn";
    chromiumOptions: {
      gl: "angle";
    };
  }) => Promise<unknown>;
  webpackOverride: unknown;
};

const loadRemotionServerTools = async (): Promise<RemotionServerTools> => {
  const dynamicImport = new Function(
    "specifier",
    "return import(specifier)",
  ) as (specifier: string) => Promise<unknown>;
  const [bundler, renderer, webpackConfig] = await Promise.all([
    dynamicImport("@remotion/bundler"),
    dynamicImport("@remotion/renderer"),
    dynamicImport(
      pathToFileURL(
        path.join(process.cwd(), "src", "remotion", "webpack-override.mjs"),
      ).href,
    ),
  ]);

  return {
    bundle: (bundler as { bundle: RemotionServerTools["bundle"] }).bundle,
    selectComposition: (
      renderer as { selectComposition: RemotionServerTools["selectComposition"] }
    ).selectComposition,
    renderMedia: (renderer as { renderMedia: RemotionServerTools["renderMedia"] })
      .renderMedia,
    webpackOverride: (webpackConfig as { webpackOverride: unknown })
      .webpackOverride,
  };
};

const errorResponse = (message: string, status = 400) => {
  return NextResponse.json<ApiResponse<ManualRenderResponse>>(
    {
      type: "error",
      message,
    },
    { status },
  );
};

export const POST = async (req: Request) => {
  let projectId: string | undefined;

  try {
    const body = (await req.json()) as {
      projectId?: string;
      template?: unknown;
      script?: unknown;
      avatar?: string;
    };
    projectId = body.projectId;

    if (!projectId) {
      return errorResponse("A projectId is required.");
    }

    const template = ManualReelTemplate.parse(body.template);
    const script = body.script ? ManualReelScript.parse(body.script) : undefined;
    const inputProps: ManualReelProps = {
      template,
      script,
      avatar: body.avatar,
      assets: {},
    };

    await updateProject(projectId, {
      status: "rendering",
      templateJson: JSON.stringify(template, null, 2),
      scriptJson: script ? JSON.stringify(script, null, 2) : null,
    });

    const outputDir = path.join(
      process.cwd(),
      "public",
      "storage",
      "renders",
    );
    await mkdir(outputDir, { recursive: true });

    const outputFilename = `manual-${projectId}-${Date.now()}.mp4`;
    const outputLocation = path.join(outputDir, outputFilename);
    const entryPoint = path.join(process.cwd(), "src", "remotion", "index.ts");
    const { bundle, renderMedia, selectComposition, webpackOverride } =
      await loadRemotionServerTools();

    const serveUrl = await bundle({
      entryPoint,
      webpackOverride,
      outDir: path.join(process.cwd(), ".next", "manual-remotion-bundle"),
      publicDir: path.join(process.cwd(), "public"),
      enableCaching: false,
      ignoreRegisterRootWarning: false,
      onProgress: () => undefined,
    });

    const composition = await selectComposition({
      serveUrl,
      id: MANUAL_REEL_COMP_NAME,
      inputProps,
      logLevel: "warn",
    });

    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      inputProps,
      outputLocation,
      overwrite: true,
      logLevel: "warn",
      chromiumOptions: {
        gl: "angle",
      },
    });

    const result = await stat(outputLocation);
    const url = `/storage/renders/${outputFilename}`;

    await updateProject(projectId, {
      outputVideo: url,
      status: "rendered",
    });

    return NextResponse.json<ApiResponse<ManualRenderResponse>>({
      type: "success",
      data: {
        url,
        size: result.size,
      },
    });
  } catch (err) {
    if (projectId) {
      await updateProject(projectId, {
        status: "error",
      });
    }

    return errorResponse((err as Error).message, 500);
  }
};
