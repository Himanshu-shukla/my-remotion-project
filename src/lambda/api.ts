import type { RenderMediaOnLambdaOutput } from "@remotion/lambda/client";
import { z } from "zod";
import { CaptionTimeline, CompositionProps } from "../../types/constants";
import {
  ProgressRequest,
  ProgressResponse,
  RenderRequest,
} from "../../types/schema";
import { ApiResponse } from "../helpers/api-response";
import type { VideoAnalysis } from "../../packages/shared/types";
import type { ReelTemplate } from "../../packages/template-engine/template-schema";

const makeRequest = async <Res>(
  endpoint: string,
  body: unknown,
): Promise<Res> => {
  const result = await fetch(endpoint, {
    method: "post",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
    },
  });
  const json = (await result.json()) as ApiResponse<Res>;
  if (json.type === "error") {
    throw new Error(json.message);
  }

  return json.data;
};

const parseApiResponse = async <Res>(result: Response) => {
  const text = await result.text();
  let json: ApiResponse<Res>;

  try {
    json = JSON.parse(text) as ApiResponse<Res>;
  } catch {
    throw new Error(text || `Request failed with status ${result.status}`);
  }

  if (json.type === "error") {
    throw new Error(json.message);
  }

  return json.data;
};

export const renderVideo = async ({
  id,
  inputProps,
}: {
  id: string;
  inputProps: z.infer<typeof CompositionProps>;
}) => {
  const body: z.infer<typeof RenderRequest> = {
    id,
    inputProps,
  };

  return makeRequest<RenderMediaOnLambdaOutput>("/api/lambda/render", body);
};

export const getProgress = async ({
  id,
  bucketName,
}: {
  id: string;
  bucketName: string;
}) => {
  const body: z.infer<typeof ProgressRequest> = {
    id,
    bucketName,
  };

  return makeRequest<ProgressResponse>("/api/lambda/progress", body);
};

export type UploadVideoResponse = {
  videoSrc: string;
  key: string;
  expiresAt: string;
  storageMode: "local" | "s3";
};

export const uploadVideo = async (file: File) => {
  const result = await fetch("/api/upload-video", {
    method: "post",
    body: file,
    headers: {
      "content-type": file.type,
      "x-file-name": encodeURIComponent(file.name),
    },
  });
  return parseApiResponse<UploadVideoResponse>(result);
};

export type AnalyzeVideoResponse = {
  analysis: VideoAnalysis;
  template: ReelTemplate;
  templatePath: string;
};

export const analyzeVideo = async ({
  key,
  templateName,
  templateHint,
}: {
  key: string;
  templateName?: string;
  templateHint?: string;
}) => {
  return makeRequest<AnalyzeVideoResponse>("/api/analyze-video", {
    key,
    templateName,
    templateHint,
  });
};

export type GenerateReelResponse = {
  captionTimeline: z.infer<typeof CaptionTimeline>;
};

export const generateReel = async ({
  template,
  prompt,
  brandName,
}: {
  template: ReelTemplate;
  prompt: string;
  brandName?: string;
}) => {
  return makeRequest<GenerateReelResponse>("/api/generate-reel", {
    template,
    prompt,
    brandName,
  });
};

export type LocalRenderResponse = {
  url: string;
  size: number;
};

export const renderLocalVideo = async ({
  id,
  inputProps,
}: {
  id: string;
  inputProps: z.infer<typeof CompositionProps>;
}) => {
  const body: z.infer<typeof RenderRequest> = {
    id,
    inputProps,
  };

  return makeRequest<LocalRenderResponse>("/api/local-render", body);
};
