import { publicEnv } from "@/lib/env/public";

/** Public URL for an object in the public `media` bucket. */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${publicEnv.supabaseUrl}/storage/v1/object/public/media/${encoded}`;
}

export const MEDIA_LIMITS = {
  maxBytes: 5 * 1024 * 1024,
  types: ["image/jpeg", "image/png", "image/webp"],
  accept: "image/jpeg,image/png,image/webp",
} as const;

export const DOCUMENT_LIMITS = {
  maxBytes: 10 * 1024 * 1024,
  types: ["application/pdf", "image/jpeg", "image/png"],
  accept: "application/pdf,image/jpeg,image/png",
} as const;

/**
 * A storage path submitted with a form must live under the folder the user is
 * allowed to write to (e.g. `users/<uid>` or `societies/<id>`). Prevents a
 * form from pointing at someone else's file.
 */
export function isPathInFolder(path: string | null | undefined, folder: string) {
  if (!path) return true;
  return path.startsWith(`${folder}/`) && !path.includes("..") && /^[A-Za-z0-9/_.-]+$/.test(path);
}
