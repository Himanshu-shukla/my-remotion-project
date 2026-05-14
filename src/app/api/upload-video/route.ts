import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { REGION } from "../../../../config.mjs";
import type { ApiResponse } from "../../../helpers/api-response";

export const runtime = "nodejs";

const MAX_VIDEO_SIZE_BYTES = 200 * 1024 * 1024;
const SIGNED_URL_EXPIRES_IN_SECONDS = 24 * 60 * 60;
const SUPPORTED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

type UploadVideoResponse = {
  videoSrc: string;
  key: string;
  expiresAt: string;
  storageMode: "local" | "s3";
};

const shouldUseLocalStorage = () => {
  const uploadMode = process.env.REMOTION_UPLOAD_MODE;

  if (uploadMode === "s3") {
    return false;
  }

  if (uploadMode === "local") {
    return true;
  }

  return process.env.NODE_ENV !== "production";
};

const getS3Client = () => {
  const accessKeyId =
    process.env.AWS_ACCESS_KEY_ID ?? process.env.REMOTION_AWS_ACCESS_KEY_ID;
  const secretAccessKey =
    process.env.AWS_SECRET_ACCESS_KEY ??
    process.env.REMOTION_AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId) {
    throw new TypeError(
      "The environment variable REMOTION_AWS_ACCESS_KEY_ID is missing.",
    );
  }

  if (!secretAccessKey) {
    throw new TypeError(
      "The environment variable REMOTION_AWS_SECRET_ACCESS_KEY is missing.",
    );
  }

  return new S3Client({
    region: REGION,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
};

const sanitizeFilename = (name: string) => {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
};

const getUpload = async (req: Request) => {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.startsWith("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("video");

    if (!(file instanceof File)) {
      throw new TypeError("Upload a video file using the 'video' field.");
    }

    return {
      name: file.name,
      type: file.type,
      size: file.size,
      body: new Uint8Array(await file.arrayBuffer()),
    };
  }

  const encodedName = req.headers.get("x-file-name");
  const fileType = contentType.split(";")[0];
  const contentLength = Number(req.headers.get("content-length") ?? "0");

  if (!encodedName) {
    throw new TypeError("Upload a video file with the 'x-file-name' header.");
  }

  if (!Number.isFinite(contentLength) || contentLength <= 0) {
    throw new TypeError("The uploaded video is empty.");
  }

  return {
    name: decodeURIComponent(encodedName),
    type: fileType,
    size: contentLength,
    body: new Uint8Array(await req.arrayBuffer()),
  };
};

const errorResponse = (message: string, status = 400) => {
  return NextResponse.json<ApiResponse<UploadVideoResponse>>(
    {
      type: "error",
      message,
    },
    { status },
  );
};

export const POST = async (req: Request) => {
  try {
    const upload = await getUpload(req);

    if (!SUPPORTED_VIDEO_TYPES.has(upload.type)) {
      return errorResponse("Only MP4, MOV, and WebM videos are supported.");
    }

    if (upload.size > MAX_VIDEO_SIZE_BYTES) {
      return errorResponse("Videos must be 200MB or smaller.");
    }

    if (upload.size === 0) {
      return errorResponse("The uploaded video is empty.");
    }

    const filename = `${randomUUID()}-${sanitizeFilename(upload.name)}`;

    if (shouldUseLocalStorage()) {
      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      await mkdir(uploadsDir, { recursive: true });

      const key = `uploads/${filename}`;
      await writeFile(path.join(process.cwd(), "public", key), upload.body);

      return NextResponse.json<ApiResponse<UploadVideoResponse>>({
        type: "success",
        data: {
          videoSrc: `/${key}`,
          key,
          expiresAt: new Date("9999-12-31T23:59:59.999Z").toISOString(),
          storageMode: "local",
        },
      });
    }

    const bucketName = process.env.REMOTION_UPLOAD_BUCKET_NAME;

    if (!bucketName) {
      return errorResponse(
        "The environment variable REMOTION_UPLOAD_BUCKET_NAME is missing.",
        500,
      );
    }

    const s3Client = getS3Client();
    const key = `uploads/${filename}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: upload.body,
        ContentType: upload.type,
      }),
    );

    const videoSrc = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      }),
      {
        expiresIn: SIGNED_URL_EXPIRES_IN_SECONDS,
      },
    );

    return NextResponse.json<ApiResponse<UploadVideoResponse>>({
      type: "success",
      data: {
        videoSrc,
        key,
        expiresAt: new Date(
          Date.now() + SIGNED_URL_EXPIRES_IN_SECONDS * 1000,
        ).toISOString(),
        storageMode: "s3",
      },
    });
  } catch (err) {
    return errorResponse((err as Error).message, 500);
  }
};
