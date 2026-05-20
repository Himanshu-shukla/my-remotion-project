import { NextResponse } from "next/server";
import {
  getProject,
  updateProject,
} from "../../../../../packages/projects/project-store";
import type { ApiResponse } from "../../../../helpers/api-response";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const notFound = () => {
  return NextResponse.json<ApiResponse<never>>(
    {
      type: "error",
      message: "Project not found.",
    },
    { status: 404 },
  );
};

export const GET = async (_req: Request, context: RouteContext) => {
  const { id } = await context.params;
  const project = await getProject(id);

  if (!project) {
    return notFound();
  }

  return NextResponse.json<ApiResponse<typeof project>>({
    type: "success",
    data: project,
  });
};

export const PATCH = async (req: Request, context: RouteContext) => {
  try {
    const { id } = await context.params;
    const body = (await req.json()) as Parameters<typeof updateProject>[1];
    const project = await updateProject(id, body);

    if (!project) {
      return notFound();
    }

    return NextResponse.json<ApiResponse<typeof project>>({
      type: "success",
      data: project,
    });
  } catch (err) {
    return NextResponse.json<ApiResponse<never>>(
      {
        type: "error",
        message: (err as Error).message,
      },
      { status: 500 },
    );
  }
};
