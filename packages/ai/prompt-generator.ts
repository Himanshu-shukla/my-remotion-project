export const buildScriptPrompt = ({
  userPrompt,
  brandName,
}: {
  userPrompt: string;
  brandName?: string;
}) => {
  return [
    brandName ? `Brand: ${brandName}` : null,
    "Create concise Instagram reel caption beats from this direction:",
    userPrompt,
  ]
    .filter(Boolean)
    .join("\n");
};
