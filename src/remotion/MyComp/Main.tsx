import { fontFamily, loadFont } from "@remotion/google-fonts/Inter";
import type React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  OffthreadVideo,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";
import {
  CaptionTimeline,
  captionTemplates,
  CompositionProps,
  defaultCaptionTimeline,
  defaultCaptionTemplate,
} from "../../../types/constants";

loadFont("normal", {
  subsets: ["latin"],
  weights: ["400", "700", "900"],
});

type CaptionTimelineEntry = z.infer<typeof CaptionTimeline>[number];

const templateToTimeline = (
  captionTemplateId: string;
  captionText: string;
): z.infer<typeof CaptionTimeline> => {
  const template =
    captionTemplates.find((item) => item.id === captionTemplateId) ??
    defaultCaptionTemplate;
  const lines = captionText.trim()
    ? captionText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
    : template.lines;

  return [
    {
      startMs: 0,
      endMs: 6600,
      position: "center",
      background: true,
      textTransform: "uppercase",
      lines: lines.map((line, index) => ({
        text: line,
        color:
          index === template.highlightLineIndex ? template.accentColor : "#fff",
        fontSize: index === template.highlightLineIndex ? 92 : 82,
      })),
    },
  ];
};

const verticalPosition = (position: CaptionTimelineEntry["position"]) => {
  if (position === "top") {
    return "flex-start";
  }

  if (position === "bottom") {
    return "flex-end";
  }

  return "center";
};

const horizontalPosition = (align: CaptionTimelineEntry["align"]) => {
  if (align === "left") {
    return "flex-start";
  }

  if (align === "right") {
    return "flex-end";
  }

  return "center";
};

const TimedCaptionOverlay: React.FC<{
  captionTimeline: z.infer<typeof CaptionTimeline>;
}> = ({ captionTimeline }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentMs = (frame / fps) * 1000;
  const activeCaption = captionTimeline.find(
    (item) => currentMs >= item.startMs && currentMs < item.endMs,
  );

  if (!activeCaption) {
    return null;
  }

  const localFrame = ((currentMs - activeCaption.startMs) / 1000) * fps;
  const remainingFrames = ((activeCaption.endMs - currentMs) / 1000) * fps;
  const enterOpacity = interpolate(localFrame, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const exitOpacity = interpolate(remainingFrames, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = Math.min(enterOpacity, exitOpacity);
  const scale = interpolate(localFrame, [0, 10], [0.96, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const align = activeCaption.align ?? "center";
  const withBackground = activeCaption.background ?? false;

  return (
    <AbsoluteFill
      style={{
        justifyContent: verticalPosition(activeCaption.position),
        alignItems: horizontalPosition(align),
        padding: "82px 86px",
      }}
    >
      <div
        style={{
          width: withBackground ? "min(1040px, 100%)" : "100%",
          padding: withBackground ? "34px 48px" : 0,
          borderRadius: withBackground ? 24 : 0,
          background: withBackground
            ? "linear-gradient(180deg, rgba(4, 8, 18, 0.08), rgba(4, 8, 18, 0.62))"
            : "transparent",
          textAlign: align,
          textTransform: activeCaption.textTransform ?? "none",
          WebkitTextStroke: "1px rgba(0, 0, 0, 0.22)",
          opacity,
          transform: `scale(${scale})`,
        }}
      >
        {activeCaption.lines.map((line, index) => (
          <div
            key={`${line.text}-${index}`}
            style={{
              color: line.color ?? "#ffffff",
              fontFamily,
              fontSize: line.fontSize ?? 84,
              fontWeight: line.fontWeight ?? 900,
              lineHeight: 0.98,
              letterSpacing: 0,
              overflowWrap: "break-word",
              textShadow:
                "0 6px 0 rgba(0, 0, 0, 0.35), 0 16px 36px rgba(0, 0, 0, 0.68)",
            }}
          >
            {line.text}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const Main = ({
  videoSrc = "",
  captionTemplateId = defaultCaptionTemplate.id,
  captionText = defaultCaptionTemplate.lines.join("\n"),
  captionTimeline = defaultCaptionTimeline,
}: z.infer<typeof CompositionProps>) => {
  const resolvedTimeline =
    captionTimeline.length > 0
      ? captionTimeline
      : templateToTimeline(captionTemplateId, captionText);

  return (
    <AbsoluteFill style={{ backgroundColor: "#08080f" }}>
      {videoSrc ? (
        <OffthreadVideo
          src={videoSrc}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : (
        <AbsoluteFill
          style={{
            justifyContent: "center",
            alignItems: "center",
            background:
              "radial-gradient(circle at center, #232336 0%, #08080f 62%)",
          }}
        >
          <div
            style={{
              fontFamily,
              color: "#ffffff",
              fontSize: 46,
              fontWeight: 700,
              textAlign: "center",
              maxWidth: 720,
              lineHeight: 1.15,
            }}
          >
            Upload a video and apply a caption template
          </div>
        </AbsoluteFill>
      )}
      <TimedCaptionOverlay captionTimeline={resolvedTimeline} />
    </AbsoluteFill>
  );
};
