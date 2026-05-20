import path from "path";

export const sanitizeFilename = (name: string) => {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
};

export const publicKeyToPath = (key: string) => {
  const normalized = key.replace(/^\/+/, "");

  if (
    !normalized.startsWith("uploads/") &&
    !normalized.startsWith("storage/uploads/")
  ) {
    throw new TypeError("Only local uploaded videos can be analyzed.");
  }

  return path.join(process.cwd(), "public", normalized);
};

export const msToSeconds = (ms: number) => Math.round(ms) / 1000;
