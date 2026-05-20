import { captionTemplates } from "../../types/constants";

export const detectCaptionStyle = (templateHint?: string) => {
  const preset =
    captionTemplates.find((item) => item.id === templateHint) ??
    captionTemplates[1];

  return {
    position: "center" as const,
    align: "center" as const,
    background: true,
    textTransform: "uppercase" as const,
    accentColor: preset.accentColor,
  };
};
