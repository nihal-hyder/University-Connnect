"use client";

import { useId, useRef, useState } from "react";
import Image from "next/image";
import { FileText, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DOCUMENT_LIMITS, MEDIA_LIMITS, mediaUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };

function randomName(type: string) {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  const id = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${Date.now().toString(36)}-${id}.${EXT[type] ?? "bin"}`;
}

/**
 * Uploads straight to Supabase Storage as the signed-in user. Storage RLS
 * decides whether the user may write under `folder` (see migration 0012);
 * the server re-checks the stored path's folder when the form is saved.
 * File names are random so user-supplied names never reach storage paths.
 */
export function FileUpload({
  id: idProp,
  bucket,
  folder,
  value,
  onChange,
  aspect = "square",
  label = "Upload image",
  describedBy,
}: {
  id?: string;
  bucket: "media" | "documents";
  folder: string;
  value: string | null;
  onChange: (path: string | null) => void;
  aspect?: "square" | "wide";
  label?: string;
  describedBy?: string;
}) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const limits = bucket === "media" ? MEDIA_LIMITS : DOCUMENT_LIMITS;
  const preview = bucket === "media" ? mediaUrl(value) : null;

  async function handle(file: File) {
    setError(null);
    if (!(limits.types as readonly string[]).includes(file.type)) {
      setError(bucket === "media" ? "Use a JPG, PNG or WebP image." : "Use a PDF, JPG or PNG file.");
      return;
    }
    if (file.size > limits.maxBytes) {
      setError(`The file is larger than ${Math.round(limits.maxBytes / 1024 / 1024)} MB.`);
      return;
    }
    setBusy(true);
    const path = `${folder}/${randomName(file.type)}`;
    const { error: uploadError } = await createClient()
      .storage.from(bucket)
      .upload(path, file, { contentType: file.type, upsert: false, cacheControl: "31536000" });
    setBusy(false);
    if (uploadError) {
      setError("Upload failed. Check your connection and that you have permission, then try again.");
      return;
    }
    onChange(path);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        {bucket === "media" ? (
          <div
            className={cn(
              "relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-secondary/50 text-muted-foreground",
              aspect === "square" ? "size-20" : "h-20 w-32",
            )}
          >
            {preview ? <Image src={preview} alt="" fill sizes="128px" className="object-cover" /> : <ImagePlus className="size-5" aria-hidden />}
          </div>
        ) : value ? (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm">
            <FileText className="size-4 text-muted-foreground" aria-hidden />
            Document attached
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <input
            ref={input}
            id={id}
            type="file"
            accept={limits.accept}
            className="sr-only"
            aria-describedby={describedBy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handle(file);
              e.target.value = "";
            }}
          />
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? <Loader2 className="animate-spin" /> : null}
            {value ? "Replace" : label}
          </Button>
          {value ? (
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => onChange(null)}>
              <Trash2 /> Remove
            </Button>
          ) : null}
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-[13px] text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
