import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export type Project = {
  id: string;
  name: string;
  prompt?: string | null;
  sampleVideo?: string | null;
  avatarImage?: string | null;
  templateJson?: string | null;
  scriptJson?: string | null;
  analysisJson?: string | null;
  outputVideo?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

const storageDir = () => path.join(process.cwd(), "storage");
const dbPath = () => path.join(storageDir(), "projects.json");

const readProjects = async (): Promise<Project[]> => {
  try {
    const file = await readFile(dbPath(), "utf8");
    return JSON.parse(file) as Project[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw err;
  }
};

const writeProjects = async (projects: Project[]) => {
  await mkdir(storageDir(), { recursive: true });
  await writeFile(dbPath(), JSON.stringify(projects, null, 2));
};

export const listProjects = async () => {
  const projects = await readProjects();
  return projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
};

export const createProject = async (name: string) => {
  const projects = await readProjects();
  const now = new Date().toISOString();
  const project: Project = {
    id: randomUUID(),
    name: name.trim() || "Untitled reel project",
    prompt: "",
    sampleVideo: null,
    avatarImage: null,
    templateJson: null,
    scriptJson: null,
    analysisJson: null,
    outputVideo: null,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };

  await writeProjects([project, ...projects]);
  return project;
};

export const getProject = async (id: string) => {
  const projects = await readProjects();
  return projects.find((project) => project.id === id) ?? null;
};

export const updateProject = async (
  id: string,
  patch: Partial<
    Pick<
      Project,
      | "name"
      | "prompt"
      | "sampleVideo"
      | "avatarImage"
      | "templateJson"
      | "scriptJson"
      | "analysisJson"
      | "outputVideo"
      | "status"
    >
  >,
) => {
  const projects = await readProjects();
  const index = projects.findIndex((project) => project.id === id);

  if (index === -1) {
    return null;
  }

  const updated: Project = {
    ...projects[index],
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  projects[index] = updated;
  await writeProjects(projects);
  return updated;
};
