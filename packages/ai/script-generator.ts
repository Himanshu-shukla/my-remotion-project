import type { ReelTemplate } from "../template-engine/template-schema";

const splitPrompt = (prompt: string) =>
  prompt
    .split(/[.!?\n]/)
    .map((line) => line.trim())
    .filter(Boolean);

export const generateCaptionLines = ({
  prompt,
  brandName,
  template,
}: {
  prompt: string;
  brandName?: string;
  template: ReelTemplate;
}) => {
  const promptLines = splitPrompt(prompt);
  const fallback = [
    brandName ? `${brandName} hook` : "Strong hook",
    "Name the pain",
    "Show the shift",
    "Make it real",
    "Call them in",
  ];
  const sceneCount = Math.max(1, template.defaultCaptionTimeline.length);

  return Array.from({ length: sceneCount }, (_, index) => {
    const text = promptLines[index] ?? fallback[index] ?? fallback.at(-1) ?? "";
    return text.length > 34 ? `${text.slice(0, 31).trim()}...` : text;
  });
};
