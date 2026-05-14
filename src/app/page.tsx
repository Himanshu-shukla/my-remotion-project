"use client";

import { Player } from "@remotion/player";
import type { NextPage } from "next";
import type React from "react";
import { useCallback, useMemo, useState } from "react";
import { z } from "zod";
import {
  CaptionTimeline,
  captionTemplates,
  defaultCaptionTimeline,
  CompositionProps,
  defaultMyCompProps,
  DURATION_IN_FRAMES,
  VIDEO_FPS,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
} from "../../types/constants";
import { Button } from "../components/Button";
import { RenderControls } from "../components/RenderControls";
import { Spacing } from "../components/Spacing";
import { uploadVideo } from "../lambda/api";
import { Main } from "../remotion/MyComp/Main";

const formatCaptionTimelineJson = (
  timeline: z.infer<typeof CaptionTimeline>,
) => JSON.stringify(timeline, null, 2);

const templateToCaptionTimeline = (
  template: (typeof captionTemplates)[number],
): z.infer<typeof CaptionTimeline> => [
  {
    startMs: 0,
    endMs: Math.round((DURATION_IN_FRAMES / VIDEO_FPS) * 1000),
    position: "center",
    background: true,
    textTransform: "uppercase",
    lines: template.lines.map((line, index) => ({
      text: line,
      color:
        index === template.highlightLineIndex ? template.accentColor : "#fff",
      fontSize: index === template.highlightLineIndex ? 92 : 82,
    })),
  },
];

const applyTemplateStyleToTimeline = (
  timeline: z.infer<typeof CaptionTimeline>,
  template: (typeof captionTemplates)[number],
): z.infer<typeof CaptionTimeline> => {
  return timeline.map((caption) => ({
    ...caption,
    background: caption.background ?? true,
    textTransform: caption.textTransform ?? "uppercase",
    lines: caption.lines.map((line, index) => ({
      ...line,
      color:
        index === template.highlightLineIndex ? template.accentColor : "#fff",
      fontSize:
        line.fontSize ??
        (index === template.highlightLineIndex
          ? Math.min(112, Math.max(92, 104 - caption.lines.length * 6))
          : Math.min(96, Math.max(72, 88 - caption.lines.length * 6))),
      fontWeight: line.fontWeight ?? 900,
    })),
  }));
};

type UploadState =
  | {
      status: "idle";
    }
  | {
      status: "uploading";
      filename: string;
    }
  | {
      status: "done";
      filename: string;
      expiresAt: string;
      storageMode: "local" | "s3";
    }
  | {
      status: "error";
      message: string;
    };

const TemplateCard: React.FC<{
  template: (typeof captionTemplates)[number];
  selected: boolean;
  onSelect: () => void;
}> = ({ template, selected, onSelect }) => {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "min-h-36 rounded-geist border p-geist-half text-left transition-colors",
        "bg-[#090912] hover:border-focused-border-color",
        selected ? "border-focused-border-color" : "border-unfocused-border-color",
      ].join(" ")}
    >
      <div className="flex h-full flex-col justify-end rounded-geist bg-gradient-to-b from-white/5 to-black/80 p-geist-half">
        <div
          className="text-center font-geist text-[22px] font-black leading-none text-white"
          style={{
            textShadow: "0 3px 0 rgba(0, 0, 0, 0.35)",
          }}
        >
          {template.lines.map((line, index) => (
            <div
              key={line}
              style={{
                color:
                  index === template.highlightLineIndex
                    ? template.accentColor
                    : "#ffffff",
              }}
            >
              {line}
            </div>
          ))}
        </div>
        <div
          className="mt-2 text-center font-geist text-xs font-bold uppercase"
          style={{ color: template.accentColor }}
        >
          {template.label}
        </div>
      </div>
    </button>
  );
};

const Home: NextPage = () => {
  const [videoSrc, setVideoSrc] = useState(defaultMyCompProps.videoSrc);
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    defaultMyCompProps.captionTemplateId,
  );
  const [appliedTemplateId, setAppliedTemplateId] = useState(
    defaultMyCompProps.captionTemplateId,
  );
  const captionText = defaultMyCompProps.captionText;
  const [captionTimelineJson, setCaptionTimelineJson] = useState(
    formatCaptionTimelineJson(defaultCaptionTimeline),
  );
  const [uploadState, setUploadState] = useState<UploadState>({
    status: "idle",
  });

  const selectedTemplate = useMemo(() => {
    return (
      captionTemplates.find((template) => template.id === selectedTemplateId) ??
      captionTemplates[0]
    );
  }, [selectedTemplateId]);

  const parsedCaptionTimeline = useMemo(() => {
    try {
      const json = JSON.parse(captionTimelineJson) as unknown;
      return CaptionTimeline.safeParse(json);
    } catch (err) {
      return {
        success: false,
        error: {
          issues: [
            {
              message: (err as Error).message,
            },
          ],
        },
      } as const;
    }
  }, [captionTimelineJson]);

  const captionJsonError = parsedCaptionTimeline.success
    ? null
    : parsedCaptionTimeline.error.issues[0]?.message ?? "Invalid JSON";

  const inputProps: z.infer<typeof CompositionProps> = useMemo(() => {
    return {
      videoSrc,
      captionTemplateId: appliedTemplateId,
      captionText,
      captionTimeline: parsedCaptionTimeline.success
        ? parsedCaptionTimeline.data
        : [],
    };
  }, [appliedTemplateId, captionText, parsedCaptionTimeline, videoSrc]);

  const onVideoChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    async (event) => {
      const file = event.currentTarget.files?.[0];

      if (!file) {
        return;
      }

      setUploadState({
        status: "uploading",
        filename: file.name,
      });

      try {
        const result = await uploadVideo(file);
        setVideoSrc(result.videoSrc);
        setUploadState({
          status: "done",
          filename: file.name,
          expiresAt: result.expiresAt,
          storageMode: result.storageMode,
        });
      } catch (err) {
        setUploadState({
          status: "error",
          message: (err as Error).message,
        });
      }
    },
    [],
  );

  const onApplyTemplate = useCallback(() => {
    setAppliedTemplateId(selectedTemplate.id);
    if (parsedCaptionTimeline.success) {
      setCaptionTimelineJson(
        formatCaptionTimelineJson(
          applyTemplateStyleToTimeline(
            parsedCaptionTimeline.data,
            selectedTemplate,
          ),
        ),
      );
      return;
    }

    setCaptionTimelineJson(
      formatCaptionTimelineJson(templateToCaptionTimeline(selectedTemplate)),
    );
  }, [parsedCaptionTimeline, selectedTemplate]);

  const renderDisabled =
    !videoSrc || uploadState.status === "uploading" || Boolean(captionJsonError);
  const renderDisabledReason = captionJsonError
    ? "Fix the caption JSON before rendering."
    : uploadState.status === "uploading"
      ? "Wait for the upload to finish before rendering."
      : "Upload a video before rendering.";

  return (
    <div>
      <div className="max-w-screen-lg m-auto mb-5 px-4">
        <div className="overflow-hidden rounded-geist shadow-[0_0_200px_rgba(0,0,0,0.15)] mb-10 mt-16">
          <Player
            component={Main}
            inputProps={inputProps}
            durationInFrames={DURATION_IN_FRAMES}
            fps={VIDEO_FPS}
            compositionHeight={VIDEO_HEIGHT}
            compositionWidth={VIDEO_WIDTH}
            style={{
              // Can't use tailwind class for width since player's default styles take presedence over tailwind's,
              // but not over inline styles
              width: "100%",
            }}
            controls
            autoPlay
            loop
            acknowledgeRemotionLicense
          />
        </div>
        <div className="grid gap-geist lg:grid-cols-[280px_1fr]">
          <div className="rounded-geist border border-unfocused-border-color bg-background p-geist">
            <label className="block font-geist text-sm font-medium text-foreground">
              Video file
            </label>
            <input
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              onChange={onVideoChange}
              disabled={uploadState.status === "uploading"}
              className="mt-geist-half block w-full text-sm text-foreground file:mr-geist-half file:h-10 file:rounded-geist file:border file:border-unfocused-border-color file:bg-background file:px-geist-half file:font-geist file:text-sm file:font-medium file:text-foreground hover:file:border-focused-border-color"
            />
            <div className="pt-geist-half text-sm text-subtitle">
              {uploadState.status === "idle" ? "No video uploaded" : null}
              {uploadState.status === "uploading"
                ? `Uploading ${uploadState.filename}`
                : null}
              {uploadState.status === "done"
                ? uploadState.storageMode === "local"
                  ? `${uploadState.filename} ready locally`
                  : `${uploadState.filename} ready until ${new Date(
                      uploadState.expiresAt,
                    ).toLocaleString()}`
                : null}
              {uploadState.status === "error" ? uploadState.message : null}
            </div>
          </div>

          <div className="rounded-geist border border-unfocused-border-color bg-background p-geist">
            <div className="flex flex-wrap items-center justify-between gap-geist-half">
              <div className="font-geist text-sm font-medium text-foreground">
                Caption templates
              </div>
              <Button
                onClick={onApplyTemplate}
                disabled={uploadState.status === "uploading"}
              >
                Apply
              </Button>
            </div>
            <Spacing></Spacing>
            <div className="grid gap-geist-half sm:grid-cols-2 lg:grid-cols-3">
              {captionTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  selected={template.id === selectedTemplateId}
                  onSelect={() => setSelectedTemplateId(template.id)}
                />
              ))}
            </div>
          </div>
        </div>
        <Spacing></Spacing>
        <div className="rounded-geist border border-unfocused-border-color bg-background p-geist">
          <div className="font-geist text-sm font-medium text-foreground">
            Caption JSON
          </div>
          <textarea
            value={captionTimelineJson}
            onChange={(event) => setCaptionTimelineJson(event.target.value)}
            spellCheck={false}
            className="mt-geist-half min-h-80 w-full resize-y rounded-geist border border-unfocused-border-color bg-background p-geist-half font-mono text-sm leading-relaxed text-foreground outline-none transition-colors focus:border-focused-border-color"
          />
          {captionJsonError ? (
            <div className="pt-geist-half text-sm text-geist-error">
              {captionJsonError}
            </div>
          ) : null}
        </div>
        <Spacing></Spacing>
        <RenderControls
          inputProps={inputProps}
          disabled={renderDisabled}
          disabledReason={renderDisabledReason}
        ></RenderControls>
      </div>
    </div>
  );
};

export default Home;
