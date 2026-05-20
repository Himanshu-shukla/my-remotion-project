import { NextResponse } from "next/server";
import {
  createProject,
  listProjects,
} from "../../../../packages/projects/project-store";
import type { ApiResponse } from "../../../helpers/api-response";

export const runtime = "nodejs";

export const GET = async () => {
  const projects = await listProjects();

  return NextResponse.json<ApiResponse<typeof projects>>({
    type: "success",
    data: projects,
  });
};

export const POST = async (req: Request) => {
  try {
    const body = (await req.json()) as { name?: string };
    const project = await createProject(body.name ?? "Manual reel project");

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
