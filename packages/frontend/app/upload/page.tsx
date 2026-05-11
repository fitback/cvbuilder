"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, API_BASE, isLoggedIn } from "../../lib/auth";
import AuthModal from "../../components/AuthModal";

export default function UploadPage() {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [showAuth, setShowAuth] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function requireAuth(): boolean {
    if (!isLoggedIn()) {
      setShowAuth(true);
      return false;
    }
    return true;
  }

  async function uploadFile(file: File) {
    if (!requireAuth()) return;
    setError("");

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["pdf", "docx"].includes(ext)) {
      setError("仅支持 PDF 和 Word 格式");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("文件大小不能超过 5MB");
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await apiFetch(`${API_BASE}/resumes/upload`, { method: "POST", body: form });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "上传失败");
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("上传失败，请重试");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">上传简历</h2>
      <div
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
          dragOver ? "border-accent bg-accent/5" : "border-border hover:border-text-muted"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) uploadFile(f); }}
        onClick={() => fileRef.current?.click()}
      >
        <div className="text-4xl mb-4">📤</div>
        <p className="text-sm text-text-secondary mb-2">拖拽文件到此处，或点击上传</p>
        <p className="text-xs text-text-muted">支持 PDF 和 Word 格式，最大 5MB</p>
        <input ref={fileRef} type="file" accept=".pdf,.docx" className="hidden" aria-label="选择简历文件" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); }} />
      </div>
      {uploading && (
        <div className="mt-6 p-4 bg-surface-tertiary rounded-md">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-text-secondary">正在上传并解析...</span>
          </div>
        </div>
      )}
      {error && (
        <div className="mt-4 p-3 bg-red-50 text-error text-sm rounded">{error}</div>
      )}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onLogin={() => setShowAuth(false)} />}
    </div>
  );
}