"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface AvatarUploadProps {
  currentUrl: string | null;
  initial: string;
}

export function AvatarUpload({ currentUrl, initial }: AvatarUploadProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState("");

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Images only (JPEG, PNG, WebP, GIF)");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError("Max 3 MB");
      return;
    }

    setError("");
    setStatus("uploading");
    setPreview(URL.createObjectURL(file));

    const form = new FormData();
    form.append("file", file);

    const res = await fetch("/api/user/avatar", { method: "POST", body: form });
    if (!res.ok) {
      const { error: msg } = await res.json().catch(() => ({ error: "Upload failed" }));
      setError(msg ?? "Upload failed");
      setPreview(currentUrl);
      setStatus("error");
      return;
    }

    const { url } = await res.json();
    setPreview(url);
    setStatus("idle");
    router.refresh();
  }

  async function handleRemove() {
    setStatus("uploading");
    await fetch("/api/user/avatar", { method: "DELETE" });
    setPreview(null);
    setStatus("idle");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-4">
      {/* Preview circle */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative h-16 w-16 rounded-full overflow-hidden border-2 border-dashed border-zinc-700 hover:border-emerald-500/60 transition-colors flex-shrink-0 group"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-400 text-xl font-black">
            {initial}
          </div>
        )}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-white text-xs font-medium">Change</span>
        </div>
      </button>

      <div className="space-y-1.5">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={status === "uploading"}
            className="text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 rounded px-3 py-1.5 transition-colors disabled:opacity-50"
          >
            {status === "uploading" ? "Uploading…" : "Upload photo"}
          </button>
          {preview && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={status === "uploading"}
              className="text-xs text-zinc-500 hover:text-red-400 border border-zinc-700 rounded px-3 py-1.5 transition-colors disabled:opacity-50"
            >
              Remove
            </button>
          )}
        </div>
        <p className="text-[11px] text-zinc-600">JPEG, PNG or WebP · max 3 MB</p>
        {error && <p className="text-[11px] text-red-400">{error}</p>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
