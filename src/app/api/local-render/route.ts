import { mkdir, stat } from "fs/promises";
import path from "path";
import { pathToFileURL } from "url";
import { NextResponse } from "next/server";
import { COMP_NAME } from "../../../../types/constants";
import { RenderRequest } from "../../../../types/schema";
import type { ApiResponse } from "../../../helpers/api-response";

export const runtime = "nodejs";
export const maxDuration = 300;

type LocalRenderResponse = {
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
  return NextResponse.json<ApiResponse<LocalRenderResponse>>(
    {
      type: "error",
      message,
    },
    { status },
  );
};

export const POST = async (req: Request) => {
  try {
    const payload = await req.json();
    const body = RenderRequest.parse(payload);

    if (body.id !== COMP_NAME) {
      return errorResponse(`Local rendering only supports ${COMP_NAME}.`);
    }

    if (!body.inputProps.videoSrc.startsWith("/uploads/")) {
      return errorResponse(
        "Local rendering only supports videos uploaded in local mode.",
      );
    }

    const outputDir = path.join(process.cwd(), "public", "renders");
    await mkdir(outputDir, { recursive: true });

    const outputFilename = `captioned-${Date.now()}.mp4`;
    const outputLocation = path.join(outputDir, outputFilename);
    const entryPoint = path.join(process.cwd(), "src", "remotion", "index.ts");
    const { bundle, renderMedia, selectComposition, webpackOverride } =
      await loadRemotionServerTools();

    const serveUrl = await bundle({
      entryPoint,
      webpackOverride,
      outDir: path.join(process.cwd(), ".next", "remotion-bundle"),
      publicDir: path.join(process.cwd(), "public"),
      enableCaching: true,
      ignoreRegisterRootWarning: false,
      onProgress: () => undefined,
    });

    const composition = await selectComposition({
      serveUrl,
      id: body.id,
      inputProps: body.inputProps,
      logLevel: "warn",
    });

    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      inputProps: body.inputProps,
      outputLocation,
      overwrite: true,
      logLevel: "warn",
      chromiumOptions: {
        gl: "angle",
      },
    });

    const result = await stat(outputLocation);

    return NextResponse.json<ApiResponse<LocalRenderResponse>>({
      type: "success",
      data: {
        url: `/renders/${outputFilename}`,
        size: result.size,
      },
    });
  } catch (err) {
    return errorResponse((err as Error).message, 500);
  }
};
