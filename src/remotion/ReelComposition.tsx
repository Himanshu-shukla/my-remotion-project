import { fontFamily, loadFont } from "@remotion/google-fonts/Inter";
import type React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  OffthreadVideo,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type {
  AvatarPlacement,
  CaptionStyle,
  ManualReelProps,
  ReelScene,
} from "../../packages/template-engine/manual-template-schema";
import { defaultManualTemplate } from "../../packages/template-engine/manual-template-schema";

loadFont("normal", {
  subsets: ["latin"],
  weights: ["400", "700", "900"],
});

const resolveAsset = (src?: string) => {
  if (!src) {
    return undefined;
  }

  if (src.startsWith("/") || src.startsWith("storage/")) {
    return staticFile(src.replace(/^\//, ""));
  }

  return src;
};

const fontWeightMap: Record<CaptionStyle["fontWeight"], number> = {
  normal: 400,
  bold: 700,
  black: 900,
};

const backgroundForScene = (scene: ReelScene, index: number) => {
  if (scene.backgroundType === "gradient") {
    const palettes = [
      "linear-gradient(150deg, #111827 0%, #2563eb 48%, #f97316 100%)",
      "linear-gradient(145deg, #0f172a 0%, #0d9488 45%, #f8fafc 120%)",
      "linear-gradient(155deg, #18181b 0%, #be123c 48%, #facc15 110%)",
    ];

    return palettes[index % palettes.length];
  }

  if (scene.backgroundType === "solid") {
    return index % 2 === 0 ? "#121826" : "#151515";
  }

  return "#08080f";
};

const AnimatedCaption: React.FC<{
  caption: CaptionStyle;
  text: string;
}> = ({ caption, text }) => {
  const frame = useCurrentFrame();
  const baseOpacity =
    caption.animation === "none"
      ? 1
      : interpolate(frame, [0, 12], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        });
  const translateY =
    caption.animation === "slide_up"
      ? interpolate(frame, [0, 14], [52, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        })
      : 0;
  const words = text.split(/\s+/).filter(Boolean);

  if (caption.animation !== "word_pop") {
    return (
      <div
        style={{
          position: "absolute",
          left: caption.x,
          top: caption.y,
          width: caption.width,
          color: caption.color,
          fontFamily,
          fontSize: caption.fontSize,
          fontWeight: fontWeightMap[caption.fontWeight],
          lineHeight: 1.02,
          opacity: baseOpacity,
          overflowWrap: "break-word",
          textAlign: caption.position === "center" ? "center" : "left",
          textShadow: "0 12px 32px rgba(0, 0, 0, 0.55)",
          transform: `translateY(${translateY}px)`,
          WebkitTextStroke: `${caption.strokeWidth ?? 0}px ${
            caption.strokeColor ?? "transparent"
          }`,
        }}
      >
        {text}
      </div>
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        left: caption.x,
        top: caption.y,
        width: caption.width,
        color: caption.color,
        fontFamily,
        fontSize: caption.fontSize,
        fontWeight: fontWeightMap[caption.fontWeight],
        lineHeight: 1.04,
        overflowWrap: "break-word",
        textAlign: caption.position === "center" ? "center" : "left",
        textShadow: "0 12px 32px rgba(0, 0, 0, 0.55)",
        WebkitTextStroke: `${caption.strokeWidth ?? 0}px ${
          caption.strokeColor ?? "transparent"
        }`,
      }}
    >
      {words.map((word, index) => {
        const scale = interpolate(
          frame,
          [index * 3, index * 3 + 8, index * 3 + 18],
          [0.86, 1.08, 1],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          },
        );
        const opacity = interpolate(frame, [index * 3, index * 3 + 5], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        return (
          <span
            key={`${word}-${index}`}
            style={{
              display: "inline-block",
              marginRight: "0.28em",
              opacity,
              transform: `scale(${scale})`,
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

const AnimatedAvatar: React.FC<{
  avatar: AvatarPlacement;
  src?: string;
}> = ({ avatar, src }) => {
  const frame = useCurrentFrame();
  const resolvedSrc = resolveAsset(src);
  const floatOffset =
    avatar.animation === "float" ? Math.sin(frame / 18) * 16 : 0;
  const scale =
    avatar.animation === "zoom_in"
      ? interpolate(frame, [0, 18], [0.92, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        })
      : 1;
  const translateX =
    avatar.animation === "slide_in"
      ? interpolate(frame, [0, 18], [-90, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        })
      : 0;

  return (
    <div
      style={{
        position: "absolute",
        left: avatar.x,
        top: avatar.y,
        width: avatar.width,
        height: avatar.height,
        borderRadius: avatar.borderRadius ?? 32,
        overflow: "hidden",
        background:
          "linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.04))",
        boxShadow: "0 28px 80px rgba(0, 0, 0, 0.35)",
        transform: `translate(${translateX}px, ${floatOffset}px) scale(${scale})`,
      }}
    >
      {resolvedSrc ? (
        <Img
          src={resolvedSrc}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : (
        <AbsoluteFill
          style={{
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            fontFamily,
            fontSize: 52,
            fontWeight: 900,
            textAlign: "center",
          }}
        >
          AVATAR
        </AbsoluteFill>
      )}
    </div>
  );
};

const SceneLayer: React.FC<{
  scene: ReelScene;
  sceneIndex: number;
  captionText: string;
  avatar?: string;
}> = ({ scene, sceneIndex, captionText, avatar }) => {
  const backgroundAsset = resolveAsset(scene.backgroundAsset);
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        background: backgroundForScene(scene, sceneIndex),
        overflow: "hidden",
      }}
    >
      {scene.backgroundType === "image" && backgroundAsset ? (
        <Img
          src={backgroundAsset}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : null}
      {scene.backgroundType === "video" && backgroundAsset ? (
        <OffthreadVideo
          src={backgroundAsset}
          startFrom={Math.round(scene.start * fps)}
          muted
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : null}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.44))",
        }}
      />
      {scene.avatar ? <AnimatedAvatar avatar={scene.avatar} src={avatar} /> : null}
      <AnimatedCaption caption={scene.caption} text={captionText} />
    </AbsoluteFill>
  );
};

export const ReelComposition: React.FC<ManualReelProps> = ({
  template = defaultManualTemplate,
  script,
  avatar,
}) => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "#08080f" }}>
      {template.scenes.map((scene, index) => {
        const from = Math.round(scene.start * fps);
        const durationInFrames = Math.max(1, Math.round(scene.duration * fps));
        const scriptLine = script?.script.find((item) => item.sceneId === scene.id);

        return (
          <Sequence
            key={scene.id}
            from={from}
            durationInFrames={durationInFrames}
          >
            <SceneLayer
              scene={scene}
              sceneIndex={index}
              captionText={scriptLine?.caption ?? scene.caption.text}
              avatar={avatar}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
