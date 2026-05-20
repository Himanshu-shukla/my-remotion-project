import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import type { ApiResponse } from "../../../helpers/api-response";

export const runtime = "nodejs";

const MAX_ASSET_SIZE_BYTES = 200 * 1024 * 1024;
const SUPPORTED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

type UploadAssetResponse = {
  src: string;
  key: string;
};

const sanitizeFilename = (name: string) => {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
};

const errorResponse = (message: string, status = 400) => {
  return NextResponse.json<ApiResponse<UploadAssetResponse>>(
    {
      type: "error",
      message,
    },
    { status },
  );
};

export const POST = async (req: Request) => {
  try {
    const contentType = req.headers.get("content-type")?.split(";")[0] ?? "";
    const encodedName = req.headers.get("x-file-name");
    const contentLength = Number(req.headers.get("content-length") ?? "0");

    if (!encodedName) {
      return errorResponse("Upload a file with the 'x-file-name' header.");
    }

    if (!SUPPORTED_TYPES.has(contentType)) {
      return errorResponse("Only image and video assets are supported.");
    }

    if (!Number.isFinite(contentLength) || contentLength <= 0) {
      return errorResponse("The uploaded asset is empty.");
    }

    if (contentLength > MAX_ASSET_SIZE_BYTES) {
      return errorResponse("Assets must be 200MB or smaller.");
    }

    const filename = `${randomUUID()}-${sanitizeFilename(
      decodeURIComponent(encodedName),
    )}`;
    const key = `storage/uploads/${filename}`;
    const assetPath = path.join(process.cwd(), "public", key);

    await mkdir(path.dirname(assetPath), { recursive: true });
    await writeFile(assetPath, new Uint8Array(await req.arrayBuffer()));

    return NextResponse.json<ApiResponse<UploadAssetResponse>>({
      type: "success",
      data: {
        src: `/${key}`,
        key,
      },
    });
  } catch (err) {
    return errorResponse((err as Error).message, 500);
  }
};
