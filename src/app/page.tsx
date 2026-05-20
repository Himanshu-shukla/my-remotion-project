"use client";

import { Player } from "@remotion/player";
import Image from "next/image";
import type { NextPage } from "next";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  defaultManualTemplate,
  makeManualTemplate,
  ManualReelScript,
  ManualReelTemplate,
  ReelScene,
} from "../../packages/template-engine/manual-template-schema";
import { MANUAL_REEL_COMP_NAME } from "../../types/constants";
import { Button } from "../components/Button";
import { Spacing } from "../components/Spacing";
import { ReelComposition } from "../remotion/ReelComposition";

type Project = {
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

type Subtitle = {
  sceneId: string;
  start: number;
  end: number;
  text: string;
};

type VideoAnalysis = {
  metadata?: {
    width: number;
    height: number;
    fps: number;
    duration: number;
    hasAudio: boolean;
    codec: string;
  };
  scenes: Array<{
    startMs: number;
    endMs: number;
    keyframe?: string;
  }>;
  audio?: {
    wav: string | null;
    extracted: boolean;
  };
  transcription?: {
    language: string;
    provider: string;
    segments: Array<{
      start: number;
      end: number;
      text: string;
    }>;
  };
  layout?: {
    captionBox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    captionConfidence: number;
    avatar: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    avatarConfidence: number;
  };
};

type StatusState =
  | { type: "idle"; message: string }
  | { type: "working"; message: string }
  | { type: "done"; message: string }
  | { type: "error"; message: string };

const defaultPrompt = "Create a reel for UK data analytics course";
const defaultTone = "urgent, educational, conversion-focused";

const parseApiResponse = async <T,>(response: Response) => {
  const json = (await response.json()) as
    | { type: "success"; data: T }
    | { type: "error"; message: string };

  if (json.type === "error") {
    throw new Error(json.message);
  }

  return json.data;
};

const apiRequest = async <T,>(endpoint: string, body?: unknown) => {
  const response = await fetch(endpoint, {
    method: body ? "post" : "get",
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "content-type": "application/json" } : undefined,
  });

  return parseApiResponse<T>(response);
};

const patchProject = async (id: string, patch: Partial<Project>) => {
  const response = await fetch(`/api/projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
    headers: {
      "content-type": "application/json",
    },
  });

  return parseApiResponse<Project>(response);
};

const uploadAsset = async (file: File) => {
  const response = await fetch("/api/upload-asset", {
    method: "post",
    body: file,
    headers: {
      "content-type": file.type,
      "x-file-name": encodeURIComponent(file.name),
    },
  });

  return parseApiResponse<{ src: string; key: string }>(response);
};

const normalizeSceneTiming = (scenes: ReelScene[]) => {
  let cursor = 0;

  return scenes.map((scene) => {
    const start = Number(cursor.toFixed(2));
    const duration = Number(Math.max(0.5, scene.duration).toFixed(2));
    const end = Number((start + duration).toFixed(2));
    cursor = end;

    return {
      ...scene,
      start,
      end,
      duration,
    };
  });
};

const sceneFromIndex = (
  index: number,
  start: number,
  sampleVideo?: string | null,
): ReelScene => {
  const template = makeManualTemplate({
    sceneCount: index + 1,
    duration: start + 3,
    sampleVideo: sampleVideo ?? undefined,
  });

  return {
    ...template.scenes[index],
    start,
    end: start + 3,
    duration: 3,
    id: `scene_${index + 1}`,
  };
};

const safeTemplateJson = (template: ManualReelTemplate) => {
  return JSON.stringify(template, null, 2);
};

const Home: NextPage = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [projectName, setProjectName] = useState("Manual Reel Template");
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [tone, setTone] = useState(defaultTone);
  const [sceneCount, setSceneCount] = useState(8);
  const [duration, setDuration] = useState(30);
  const [template, setTemplate] =
    useState<ManualReelTemplate>(defaultManualTemplate);
  const [script, setScript] = useState<ManualReelScript | undefined>();
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [analysis, setAnalysis] = useState<VideoAnalysis | undefined>();
  const [templateJson, setTemplateJson] = useState(
    safeTemplateJson(defaultManualTemplate),
  );
  const [status, setStatus] = useState<StatusState>({
    type: "idle",
    message: "Draft",
  });
  const [jsonError, setJsonError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    const list = await apiRequest<Project[]>("/api/projects");
    setProjects(list);
  }, []);

  useEffect(() => {
    loadProjects().catch((err) => {
      setStatus({ type: "error", message: (err as Error).message });
    });
  }, [loadProjects]);

  const applyProject = useCallback((nextProject: Project) => {
    setProject(nextProject);
    setProjectName(nextProject.name);
    setPrompt(nextProject.prompt || defaultPrompt);
    setStatus({ type: "idle", message: nextProject.status });

    if (nextProject.templateJson) {
      try {
        const parsed = ManualReelTemplate.parse(
          JSON.parse(nextProject.templateJson),
        );
        setTemplate(parsed);
        setTemplateJson(safeTemplateJson(parsed));
        setSceneCount(parsed.scenes.length);
        setDuration(parsed.duration);
        setJsonError(null);
      } catch {
        setTemplate(defaultManualTemplate);
        setTemplateJson(nextProject.templateJson);
        setJsonError("Stored template JSON is invalid.");
      }
    } else {
      const manualTemplate = makeManualTemplate({
        sceneCount,
        duration,
        sampleVideo: nextProject.sampleVideo ?? undefined,
      });
      setTemplate(manualTemplate);
      setTemplateJson(safeTemplateJson(manualTemplate));
      setJsonError(null);
    }

    if (nextProject.scriptJson) {
      try {
        setScript(ManualReelScript.parse(JSON.parse(nextProject.scriptJson)));
      } catch {
        setScript(undefined);
      }
    } else {
      setScript(undefined);
    }

    if (nextProject.analysisJson) {
      try {
        setAnalysis(JSON.parse(nextProject.analysisJson) as VideoAnalysis);
      } catch {
        setAnalysis(undefined);
      }
    } else {
      setAnalysis(undefined);
    }
  }, [duration, sceneCount]);

  const syncTemplate = useCallback((nextTemplate: ManualReelTemplate) => {
    setTemplate(nextTemplate);
    setTemplateJson(safeTemplateJson(nextTemplate));
    setDuration(nextTemplate.duration);
    setSceneCount(nextTemplate.scenes.length);
    setJsonError(null);
  }, []);

  const saveProjectPatch = useCallback(
    async (patch: Partial<Project>) => {
      if (!project) {
        return null;
      }

      const updated = await patchProject(project.id, patch);
      setProject(updated);
      setProjects((items) =>
        items.map((item) => (item.id === updated.id ? updated : item)),
      );
      return updated;
    },
    [project],
  );

  const createProject = useCallback(async () => {
    setStatus({ type: "working", message: "Creating project" });
    try {
      const created = await apiRequest<Project>("/api/projects", {
        name: projectName,
      });
      const manualTemplate = makeManualTemplate({
        sceneCount,
        duration,
      });
      const updated = await patchProject(created.id, {
        prompt,
        templateJson: safeTemplateJson(manualTemplate),
      });
      await loadProjects();
      applyProject(updated);
      setStatus({ type: "done", message: "Project created" });
    } catch (err) {
      setStatus({ type: "error", message: (err as Error).message });
    }
  }, [
    applyProject,
    duration,
    loadProjects,
    projectName,
    prompt,
    sceneCount,
  ]);

  const rebuildTemplate = useCallback(() => {
    const nextTemplate = makeManualTemplate({
      sceneCount,
      duration,
      sampleVideo: project?.sampleVideo ?? undefined,
    });
    syncTemplate(nextTemplate);
    saveProjectPatch({
      templateJson: safeTemplateJson(nextTemplate),
      status: "draft",
    }).catch((err) =>
      setStatus({ type: "error", message: (err as Error).message }),
    );
  }, [duration, project?.sampleVideo, saveProjectPatch, sceneCount, syncTemplate]);

  const updateScene = useCallback(
    (sceneId: string, updater: (scene: ReelScene) => ReelScene) => {
      const scenes = normalizeSceneTiming(
        template.scenes.map((scene) =>
          scene.id === sceneId ? updater(scene) : scene,
        ),
      );
      const nextTemplate = {
        ...template,
        duration: Number(
          scenes.reduce((total, scene) => total + scene.duration, 0).toFixed(2),
        ),
        scenes,
      };

      syncTemplate(nextTemplate);
    },
    [syncTemplate, template],
  );

  const addScene = useCallback(() => {
    const last = template.scenes[template.scenes.length - 1];
    const nextScene = sceneFromIndex(
      template.scenes.length,
      last?.end ?? 0,
      project?.sampleVideo,
    );
    const scenes = normalizeSceneTiming([...template.scenes, nextScene]);
    syncTemplate({
      ...template,
      duration: scenes[scenes.length - 1]?.end ?? template.duration,
      scenes,
    });
  }, [project?.sampleVideo, syncTemplate, template]);

  const removeScene = useCallback(
    (sceneId: string) => {
      if (template.scenes.length === 1) {
        return;
      }

      const scenes = normalizeSceneTiming(
        template.scenes.filter((scene) => scene.id !== sceneId),
      ).map((scene, index) => ({
        ...scene,
        id: `scene_${index + 1}`,
      }));
      syncTemplate({
        ...template,
        duration: scenes[scenes.length - 1]?.end ?? template.duration,
        scenes,
      });
    },
    [syncTemplate, template],
  );

  const onTemplateJsonChange = useCallback((value: string) => {
    setTemplateJson(value);
    try {
      const parsed = ManualReelTemplate.parse(JSON.parse(value));
      setTemplate(parsed);
      setDuration(parsed.duration);
      setSceneCount(parsed.scenes.length);
      setJsonError(null);
    } catch (err) {
      setJsonError((err as Error).message);
    }
  }, []);

  const onUploadSample: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    async (event) => {
      const file = event.currentTarget.files?.[0];

      if (!file) {
        return;
      }

      setStatus({ type: "working", message: "Uploading sample reel" });
      try {
        const uploaded = await uploadAsset(file);
        const scenes = template.scenes.map((scene) => ({
          ...scene,
          backgroundType: "video" as const,
          backgroundAsset: uploaded.src,
        }));
        const nextTemplate = {
          ...template,
          scenes,
        };
        syncTemplate(nextTemplate);
        const updated = await saveProjectPatch({
          sampleVideo: uploaded.src,
          analysisJson: null,
          templateJson: safeTemplateJson(nextTemplate),
          status: "draft",
        });

        if (updated) {
          setProject(updated);
        }

        setAnalysis(undefined);
        setStatus({ type: "done", message: "Sample reel uploaded" });
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message });
      }
    },
    [saveProjectPatch, syncTemplate, template],
  );

  const onUploadAvatar: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    async (event) => {
      const file = event.currentTarget.files?.[0];

      if (!file) {
        return;
      }

      setStatus({ type: "working", message: "Uploading avatar" });
      try {
        const uploaded = await uploadAsset(file);
        const updated = await saveProjectPatch({
          avatarImage: uploaded.src,
          status: "draft",
        });

        if (updated) {
          setProject(updated);
        }

        setStatus({ type: "done", message: "Avatar uploaded" });
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message });
      }
    },
    [saveProjectPatch],
  );

  const analyzeSample = useCallback(async () => {
    if (!project?.sampleVideo) {
      setStatus({ type: "error", message: "Upload a sample reel first." });
      return;
    }

    setStatus({ type: "working", message: "Analyzing sample reel" });
    try {
      const result = await apiRequest<{
        analysis: VideoAnalysis;
        template: ManualReelTemplate;
      }>("/api/analyze-video", {
        projectId: project.id,
        key: project.sampleVideo,
        templateName: projectName,
      });

      setAnalysis(result.analysis);
      syncTemplate(result.template);
      const updatedProject = {
        ...project,
        analysisJson: JSON.stringify(result.analysis, null, 2),
        templateJson: safeTemplateJson(result.template),
        status: "analyzed",
        updatedAt: new Date().toISOString(),
      };
      setProject(updatedProject);
      await loadProjects();
      setStatus({ type: "done", message: "Draft template generated" });
    } catch (err) {
      setStatus({ type: "error", message: (err as Error).message });
    }
  }, [loadProjects, project, projectName, syncTemplate]);

  const generateScript = useCallback(async () => {
    setStatus({ type: "working", message: "Generating script" });
    try {
      const generated = await apiRequest<ManualReelScript>(
        "/api/generate-script",
        {
          prompt,
          tone,
          template,
        },
      );
      setScript(generated);
      await saveProjectPatch({
        prompt,
        scriptJson: JSON.stringify(generated, null, 2),
        status: "scripted",
      });
      setStatus({ type: "done", message: "Script generated" });
    } catch (err) {
      setStatus({ type: "error", message: (err as Error).message });
    }
  }, [prompt, saveProjectPatch, template, tone]);

  const generateSubtitles = useCallback(async () => {
    if (!script) {
      setStatus({ type: "error", message: "Generate a script first." });
      return;
    }

    setStatus({ type: "working", message: "Generating subtitles" });
    try {
      const generated = await apiRequest<Subtitle[]>("/api/generate-subtitles", {
        template,
        script,
      });
      const scenes = template.scenes.map((scene) => {
        const subtitle = generated.find((item) => item.sceneId === scene.id);

        return {
          ...scene,
          caption: {
            ...scene.caption,
            text: subtitle?.text ?? scene.caption.text,
          },
        };
      });
      const nextTemplate = {
        ...template,
        scenes,
      };

      setSubtitles(generated);
      syncTemplate(nextTemplate);
      await saveProjectPatch({
        templateJson: safeTemplateJson(nextTemplate),
        status: "subtitled",
      });
      setStatus({ type: "done", message: "Subtitles generated" });
    } catch (err) {
      setStatus({ type: "error", message: (err as Error).message });
    }
  }, [saveProjectPatch, script, syncTemplate, template]);

  const saveTemplate = useCallback(async () => {
    setStatus({ type: "working", message: "Saving template" });
    try {
      await saveProjectPatch({
        name: projectName,
        prompt,
        templateJson: safeTemplateJson(template),
        scriptJson: script ? JSON.stringify(script, null, 2) : null,
        status: "draft",
      });
      setStatus({ type: "done", message: "Template saved" });
    } catch (err) {
      setStatus({ type: "error", message: (err as Error).message });
    }
  }, [projectName, prompt, saveProjectPatch, script, template]);

  const renderVideo = useCallback(async () => {
    if (!project) {
      setStatus({ type: "error", message: "Create a project before rendering." });
      return;
    }

    setStatus({ type: "working", message: "Rendering MP4" });
    try {
      const result = await apiRequest<{ url: string; size: number }>(
        "/api/manual-render",
        {
          projectId: project.id,
          template,
          script,
          avatar: project.avatarImage ?? undefined,
        },
      );
      const updated = await patchProject(project.id, {
        outputVideo: result.url,
        status: "rendered",
      });
      setProject(updated);
      await loadProjects();
      setStatus({ type: "done", message: "Render complete" });
    } catch (err) {
      setStatus({ type: "error", message: (err as Error).message });
    }
  }, [loadProjects, project, script, template]);

  const inputProps = useMemo(
    () => ({
      template,
      script,
      avatar: project?.avatarImage ?? undefined,
      assets: {},
    }),
    [project?.avatarImage, script, template],
  );
  const durationInFrames = Math.max(1, Math.ceil(template.duration * template.fps));

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[1440px] px-4 py-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-geist">
          <div>
            <h1 className="font-geist text-3xl font-black tracking-normal">
              Local Reel Template Studio
            </h1>
            <div className="pt-1 font-geist text-sm text-subtitle">
              {project ? project.name : "No project selected"} · {status.message}
            </div>
          </div>
          <div className="flex flex-wrap gap-geist-half">
            <Button onClick={createProject} disabled={status.type === "working"}>
              Create project
            </Button>
            <Button
              onClick={saveTemplate}
              disabled={!project || status.type === "working" || Boolean(jsonError)}
            >
              Save
            </Button>
            <Button
              onClick={renderVideo}
              disabled={!project || status.type === "working" || Boolean(jsonError)}
            >
              Render final video
            </Button>
          </div>
        </div>

        <div className="grid gap-geist xl:grid-cols-[260px_minmax(0,1fr)_420px]">
          <aside className="flex flex-col gap-geist">
            <section className="rounded-geist border border-unfocused-border-color bg-background p-geist">
              <label className="block font-geist text-sm font-medium">
                Project name
              </label>
              <input
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                className="mt-geist-half h-10 w-full rounded-geist border border-unfocused-border-color bg-background px-geist-half font-geist text-sm outline-none focus:border-focused-border-color"
              />
              <Spacing />
              <div className="font-geist text-sm font-medium">Open project</div>
              <div className="mt-geist-half grid gap-geist-half">
                {projects.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => applyProject(item)}
                    className={[
                      "rounded-geist border p-geist-half text-left font-geist transition-colors",
                      project?.id === item.id
                        ? "border-focused-border-color"
                        : "border-unfocused-border-color",
                    ].join(" ")}
                  >
                    <div className="text-sm font-bold">{item.name}</div>
                    <div className="pt-1 text-xs text-subtitle">{item.status}</div>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-geist border border-unfocused-border-color bg-background p-geist">
              <div className="font-geist text-sm font-medium">Assets</div>
              <label className="mt-geist-half block font-geist text-xs text-subtitle">
                Sample reel
              </label>
              <input
                type="file"
                accept="video/mp4,video/quicktime,video/webm"
                onChange={onUploadSample}
                disabled={!project || status.type === "working"}
                className="mt-geist-quarter block w-full text-sm file:mr-geist-half file:h-10 file:rounded-geist file:border file:border-unfocused-border-color file:bg-background file:px-geist-half file:font-geist file:text-sm file:text-foreground"
              />
              <div className="mt-geist-half">
                <Button
                  onClick={analyzeSample}
                  disabled={
                    !project?.sampleVideo || status.type === "working"
                  }
                >
                  Analyze sample
                </Button>
              </div>
              <label className="mt-geist-half block font-geist text-xs text-subtitle">
                Avatar
              </label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={onUploadAvatar}
                disabled={!project || status.type === "working"}
                className="mt-geist-quarter block w-full text-sm file:mr-geist-half file:h-10 file:rounded-geist file:border file:border-unfocused-border-color file:bg-background file:px-geist-half file:font-geist file:text-sm file:text-foreground"
              />
            </section>

            {analysis ? (
              <section className="rounded-geist border border-unfocused-border-color bg-background p-geist">
                <div className="font-geist text-sm font-medium">
                  Analysis draft
                </div>
                <div className="mt-geist-half grid gap-geist-quarter font-geist text-xs text-subtitle">
                  <div>
                    {analysis.metadata?.width ?? template.width} x{" "}
                    {analysis.metadata?.height ?? template.height} ·{" "}
                    {analysis.metadata?.fps ?? template.fps} fps
                  </div>
                  <div>
                    {Number(
                      analysis.metadata?.duration ?? template.duration,
                    ).toFixed(2)}
                    s · {analysis.metadata?.codec ?? "codec unknown"} ·{" "}
                    {analysis.metadata?.hasAudio ? "audio" : "no audio"}
                  </div>
                  <div>
                    {analysis.scenes.length} scenes · transcription{" "}
                    {analysis.transcription?.provider ?? "mock"}
                  </div>
                  <div>
                    Caption {Math.round(
                      (analysis.layout?.captionConfidence ?? 0) * 100,
                    )}
                    % · avatar{" "}
                    {Math.round((analysis.layout?.avatarConfidence ?? 0) * 100)}
                    %
                  </div>
                </div>
              </section>
            ) : null}

            <section className="rounded-geist border border-unfocused-border-color bg-background p-geist">
              <div className="font-geist text-sm font-medium">Template setup</div>
              <div className="mt-geist-half grid grid-cols-2 gap-geist-half">
                <label className="font-geist text-xs text-subtitle">
                  Scenes
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={sceneCount}
                    onChange={(event) =>
                      setSceneCount(Number(event.target.value))
                    }
                    className="mt-geist-quarter h-10 w-full rounded-geist border border-unfocused-border-color bg-background px-geist-half text-sm text-foreground outline-none focus:border-focused-border-color"
                  />
                </label>
                <label className="font-geist text-xs text-subtitle">
                  Seconds
                  <input
                    type="number"
                    min={3}
                    max={120}
                    value={duration}
                    onChange={(event) => setDuration(Number(event.target.value))}
                    className="mt-geist-quarter h-10 w-full rounded-geist border border-unfocused-border-color bg-background px-geist-half text-sm text-foreground outline-none focus:border-focused-border-color"
                  />
                </label>
              </div>
              <div className="mt-geist-half">
                <Button onClick={rebuildTemplate} disabled={!project}>
                  Build scenes
                </Button>
              </div>
            </section>
          </aside>

          <section className="flex min-w-0 flex-col gap-geist">
            <div className="overflow-hidden rounded-geist border border-unfocused-border-color bg-[#050505]">
              <Player
                component={ReelComposition}
                inputProps={inputProps}
                durationInFrames={durationInFrames}
                fps={template.fps}
                compositionHeight={template.height}
                compositionWidth={template.width}
                style={{
                  width: "min(100%, 430px)",
                  margin: "0 auto",
                }}
                controls
                loop
                acknowledgeRemotionLicense
              />
            </div>

            <div className="rounded-geist border border-unfocused-border-color bg-background p-geist">
              <div className="flex flex-wrap items-center justify-between gap-geist-half">
                <div className="font-geist text-sm font-medium">
                  Manual scene editor
                </div>
                <Button onClick={addScene}>Add scene</Button>
              </div>
              <div className="mt-geist grid gap-geist">
                {template.scenes.map((scene, index) => (
                  <div
                    key={scene.id}
                    className="rounded-geist border border-unfocused-border-color p-geist-half"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-geist-half">
                      <div className="font-geist text-sm font-bold">
                        {scene.id} · {scene.start}s to {scene.end}s
                      </div>
                      <Button onClick={() => removeScene(scene.id)}>
                        Remove
                      </Button>
                    </div>
                    {scene.keyframe ? (
                      <Image
                        src={scene.keyframe}
                        alt={`${scene.id} keyframe`}
                        width={108}
                        height={192}
                        unoptimized
                        className="mt-geist-half aspect-[9/16] w-28 rounded-geist border border-unfocused-border-color object-cover"
                      />
                    ) : null}
                    <div className="mt-geist-half grid gap-geist-half md:grid-cols-4">
                      <label className="font-geist text-xs text-subtitle">
                        Duration
                        <input
                          type="number"
                          min={0.5}
                          step={0.5}
                          value={scene.duration}
                          onChange={(event) =>
                            updateScene(scene.id, (item) => ({
                              ...item,
                              duration: Number(event.target.value),
                            }))
                          }
                          className="mt-geist-quarter h-10 w-full rounded-geist border border-unfocused-border-color bg-background px-geist-half text-sm text-foreground outline-none focus:border-focused-border-color"
                        />
                      </label>
                      <label className="font-geist text-xs text-subtitle">
                        Layout
                        <select
                          value={scene.layout}
                          onChange={(event) =>
                            updateScene(scene.id, (item) => ({
                              ...item,
                              layout: event.target.value as ReelScene["layout"],
                            }))
                          }
                          className="mt-geist-quarter h-10 w-full rounded-geist border border-unfocused-border-color bg-background px-geist-half text-sm text-foreground outline-none focus:border-focused-border-color"
                        >
                          <option value="avatar_left_text_right">
                            Avatar left
                          </option>
                          <option value="avatar_right_text_left">
                            Avatar right
                          </option>
                          <option value="full_bg_caption_bottom">
                            Full background
                          </option>
                          <option value="split_screen">Split screen</option>
                        </select>
                      </label>
                      <label className="font-geist text-xs text-subtitle">
                        Caption position
                        <select
                          value={scene.caption.position}
                          onChange={(event) =>
                            updateScene(scene.id, (item) => ({
                              ...item,
                              caption: {
                                ...item.caption,
                                position: event.target
                                  .value as ReelScene["caption"]["position"],
                                y:
                                  event.target.value === "top"
                                    ? 240
                                    : event.target.value === "center"
                                      ? 900
                                      : 1450,
                              },
                            }))
                          }
                          className="mt-geist-quarter h-10 w-full rounded-geist border border-unfocused-border-color bg-background px-geist-half text-sm text-foreground outline-none focus:border-focused-border-color"
                        >
                          <option value="top">Top</option>
                          <option value="center">Center</option>
                          <option value="bottom">Bottom</option>
                        </select>
                      </label>
                      <label className="font-geist text-xs text-subtitle">
                        Background
                        <select
                          value={scene.backgroundType}
                          onChange={(event) =>
                            updateScene(scene.id, (item) => ({
                              ...item,
                              backgroundType: event.target
                                .value as ReelScene["backgroundType"],
                              backgroundAsset:
                                event.target.value === "video"
                                  ? project?.sampleVideo ?? item.backgroundAsset
                                  : item.backgroundAsset,
                            }))
                          }
                          className="mt-geist-quarter h-10 w-full rounded-geist border border-unfocused-border-color bg-background px-geist-half text-sm text-foreground outline-none focus:border-focused-border-color"
                        >
                          <option value="gradient">Gradient</option>
                          <option value="solid">Solid</option>
                          <option value="video">Sample video</option>
                          <option value="image">Image</option>
                        </select>
                      </label>
                    </div>
                    <div className="mt-geist-half grid gap-geist-half md:grid-cols-[1fr_120px_120px_120px]">
                      <label className="font-geist text-xs text-subtitle">
                        Caption
                        <input
                          value={scene.caption.text}
                          onChange={(event) =>
                            updateScene(scene.id, (item) => ({
                              ...item,
                              caption: {
                                ...item.caption,
                                text: event.target.value,
                              },
                            }))
                          }
                          className="mt-geist-quarter h-10 w-full rounded-geist border border-unfocused-border-color bg-background px-geist-half text-sm text-foreground outline-none focus:border-focused-border-color"
                        />
                      </label>
                      <label className="font-geist text-xs text-subtitle">
                        Font
                        <input
                          type="number"
                          min={18}
                          max={180}
                          value={scene.caption.fontSize}
                          onChange={(event) =>
                            updateScene(scene.id, (item) => ({
                              ...item,
                              caption: {
                                ...item.caption,
                                fontSize: Number(event.target.value),
                              },
                            }))
                          }
                          className="mt-geist-quarter h-10 w-full rounded-geist border border-unfocused-border-color bg-background px-geist-half text-sm text-foreground outline-none focus:border-focused-border-color"
                        />
                      </label>
                      <label className="font-geist text-xs text-subtitle">
                        Color
                        <input
                          type="color"
                          value={scene.caption.color}
                          onChange={(event) =>
                            updateScene(scene.id, (item) => ({
                              ...item,
                              caption: {
                                ...item.caption,
                                color: event.target.value,
                              },
                            }))
                          }
                          className="mt-geist-quarter h-10 w-full rounded-geist border border-unfocused-border-color bg-background p-1"
                        />
                      </label>
                      <label className="font-geist text-xs text-subtitle">
                        Animation
                        <select
                          value={scene.caption.animation}
                          onChange={(event) =>
                            updateScene(scene.id, (item) => ({
                              ...item,
                              caption: {
                                ...item.caption,
                                animation: event.target
                                  .value as ReelScene["caption"]["animation"],
                              },
                            }))
                          }
                          className="mt-geist-quarter h-10 w-full rounded-geist border border-unfocused-border-color bg-background px-geist-half text-sm text-foreground outline-none focus:border-focused-border-color"
                        >
                          <option value="word_pop">Word pop</option>
                          <option value="slide_up">Slide up</option>
                          <option value="fade_in">Fade in</option>
                          <option value="none">None</option>
                        </select>
                      </label>
                    </div>
                    <div className="mt-geist-half grid gap-geist-half md:grid-cols-4">
                      {(["x", "y", "width", "height"] as const).map((key) => (
                        <label
                          key={`${scene.id}-caption-${key}`}
                          className="font-geist text-xs text-subtitle"
                        >
                          Caption {key}
                          <input
                            type="number"
                            value={scene.caption[key] ?? 0}
                            onChange={(event) =>
                              updateScene(scene.id, (item) => ({
                                ...item,
                                caption: {
                                  ...item.caption,
                                  [key]: Number(event.target.value),
                                },
                              }))
                            }
                            className="mt-geist-quarter h-10 w-full rounded-geist border border-unfocused-border-color bg-background px-geist-half text-sm text-foreground outline-none focus:border-focused-border-color"
                          />
                        </label>
                      ))}
                    </div>
                    {scene.avatar ? (
                      <div className="mt-geist-half grid gap-geist-half md:grid-cols-4">
                        {(["x", "y", "width", "height"] as const).map((key) => (
                          <label
                            key={`${scene.id}-${key}`}
                            className="font-geist text-xs text-subtitle"
                          >
                            Avatar {key}
                            <input
                              type="number"
                              value={scene.avatar?.[key] ?? 0}
                              onChange={(event) =>
                                updateScene(scene.id, (item) => ({
                                  ...item,
                                  avatar: item.avatar
                                    ? {
                                        ...item.avatar,
                                        [key]: Number(event.target.value),
                                      }
                                    : item.avatar,
                                }))
                              }
                              className="mt-geist-quarter h-10 w-full rounded-geist border border-unfocused-border-color bg-background px-geist-half text-sm text-foreground outline-none focus:border-focused-border-color"
                            />
                          </label>
                        ))}
                      </div>
                    ) : null}
                    <div className="pt-geist-half font-geist text-xs text-subtitle">
                      Scene {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="flex min-w-0 flex-col gap-geist">
            <section className="rounded-geist border border-unfocused-border-color bg-background p-geist">
              <div className="flex flex-wrap items-center justify-between gap-geist-half">
                <div className="font-geist text-sm font-medium">
                  Prompt and script
                </div>
                <div className="flex flex-wrap gap-geist-half">
                  <Button onClick={generateScript} disabled={!project}>
                    Generate script
                  </Button>
                  <Button onClick={generateSubtitles} disabled={!project || !script}>
                    Generate subtitles
                  </Button>
                </div>
              </div>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                className="mt-geist-half min-h-24 w-full resize-y rounded-geist border border-unfocused-border-color bg-background p-geist-half font-geist text-sm leading-relaxed outline-none focus:border-focused-border-color"
              />
              <input
                value={tone}
                onChange={(event) => setTone(event.target.value)}
                className="mt-geist-half h-10 w-full rounded-geist border border-unfocused-border-color bg-background px-geist-half font-geist text-sm outline-none focus:border-focused-border-color"
              />
              {script ? (
                <pre className="mt-geist-half max-h-56 overflow-auto rounded-geist border border-unfocused-border-color p-geist-half font-mono text-xs leading-relaxed">
                  {JSON.stringify(script, null, 2)}
                </pre>
              ) : null}
              {subtitles.length > 0 ? (
                <pre className="mt-geist-half max-h-40 overflow-auto rounded-geist border border-unfocused-border-color p-geist-half font-mono text-xs leading-relaxed">
                  {JSON.stringify(subtitles, null, 2)}
                </pre>
              ) : null}
              {analysis?.transcription ? (
                <pre className="mt-geist-half max-h-44 overflow-auto rounded-geist border border-unfocused-border-color p-geist-half font-mono text-xs leading-relaxed">
                  {JSON.stringify(analysis.transcription, null, 2)}
                </pre>
              ) : null}
            </section>

            <section className="rounded-geist border border-unfocused-border-color bg-background p-geist">
              <div className="font-geist text-sm font-medium">Template JSON</div>
              <textarea
                value={templateJson}
                onChange={(event) => onTemplateJsonChange(event.target.value)}
                spellCheck={false}
                className="mt-geist-half min-h-[520px] w-full resize-y rounded-geist border border-unfocused-border-color bg-background p-geist-half font-mono text-xs leading-relaxed outline-none focus:border-focused-border-color"
              />
              {jsonError ? (
                <div className="pt-geist-half font-geist text-sm text-geist-error">
                  {jsonError}
                </div>
              ) : null}
            </section>

            <section className="rounded-geist border border-unfocused-border-color bg-background p-geist">
              <div className="font-geist text-sm font-medium">Render status</div>
              <div className="pt-geist-half font-geist text-sm text-subtitle">
                Composition: {MANUAL_REEL_COMP_NAME}
              </div>
              <div
                className={[
                  "pt-geist-half font-geist text-sm",
                  status.type === "error" ? "text-geist-error" : "text-foreground",
                ].join(" ")}
              >
                {status.message}
              </div>
              {project?.outputVideo ? (
                <a
                  href={project.outputVideo}
                  download
                  className="mt-geist-half inline-flex h-10 items-center rounded-geist border border-unfocused-border-color px-geist-half font-geist text-sm font-medium text-foreground"
                >
                  Download final MP4
                </a>
              ) : null}
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
};

export default Home;
