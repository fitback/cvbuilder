"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../components/Button";
import { Upload, FileText, Check, AlertCircle, Spinner } from "../../components/icons";
import { useToast } from "../../components/Toast";
import { apiFetch, API_BASE } from "../../lib/auth";

const API = API_BASE;

type UploadStep = "idle" | "uploading" | "parsing" | "done";

export default function UploadPage() {
  const [dragOver, setDragOver] = useState(false);
  const [step, setStep] = useState<UploadStep>("idle");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ name: string; ext: string; valid: boolean; reason?: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { toast } = useToast();

  function validateFile(file: File): { valid: boolean; reason?: string } {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["pdf", "docx"].includes(ext)) {
      return { valid: false, reason: "仅支持 PDF 和 Word 格式" };
    }
    if (file.size > 5 * 1024 * 1024) {
      return { valid: false, reason: "文件大小不能超过 5MB" };
    }
    return { valid: true };
  }

  const triggerError = useCallback((msg: string) => {
    setError(msg);
    setShake(true);
    setTimeout(() => setShake(false), 400);
    toast(msg, "error");
  }, [toast]);

  async function uploadFile(file: File) {
    setError("");
    setFileName(file.name);
    setPendingFile(null);

    const validation = validateFile(file);
    if (!validation.valid) {
      setPendingFile({ name: file.name, ext: file.name.split(".").pop()?.toLowerCase() || "", valid: false, reason: validation.reason });
      triggerError(validation.reason!);
      return;
    }

    setPendingFile({ name: file.name, ext: file.name.split(".").pop()?.toLowerCase() || "", valid: true });

    setStep("uploading");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await apiFetch(`${API}/resumes/upload`, { method: "POST", body: form });
      const json = await res.json();
      if (!json.success) {
        setStep("idle");
        triggerError(json.error?.message ?? "上传失败");
        return;
      }
      setStep("parsing");
      await new Promise((r) => setTimeout(r, 800));
      setStep("done");
      toast("上传成功！正在跳转...", "success");
      await new Promise((r) => setTimeout(r, 600));
      router.push("/dashboard");
    } catch {
      setStep("idle");
      triggerError("上传失败，请重试");
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const validation = validateFile(file);
    setPendingFile({ name: file.name, ext: file.name.split(".").pop()?.toLowerCase() || "", valid: validation.valid, reason: validation.reason });
    if (validation.valid) uploadFile(file);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateFile(file);
    setPendingFile({ name: file.name, ext: file.name.split(".").pop()?.toLowerCase() || "", valid: validation.valid, reason: validation.reason });
    if (validation.valid) uploadFile(file);
  }

  return (
    <div className="animate-[slideUp_300ms_ease-out]">
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-[#1A1A1A]">上传简历</h2>
        <p className="text-sm text-[#6B6B6B] mt-1">支持 PDF 和 Word 格式，AI 自动解析简历内容</p>
        <div className="mt-4 p-4 bg-[#FAFAF9] rounded-lg border border-[#EBEBEB]">
          <p className="text-xs font-medium text-[#2D2D2D] mb-2">为了获得最佳解析效果：</p>
          <ul className="text-xs text-[#6B6B6B] space-y-1 list-disc pl-4">
            <li>使用 <strong>Word (.docx)</strong> 格式解析成功率最高</li>
            <li>PDF 请确保是<strong>文字型</strong>（非扫描件/图片），否则无法提取文本</li>
            <li>文件大小不超过 <strong>5MB</strong></li>
            <li>简历内容建议 200 字以上，以确保 AI 准确提取</li>
          </ul>
        </div>
      </div>

      <div
        className={`relative border-2 border-dashed rounded-xl p-14 text-center cursor-pointer
          transition-all duration-200 ease-out
          ${dragOver
            ? "border-[#B75C3A] bg-[#B75C3A]/5 scale-[1.01] animate-[breathe_1.5s_ease-in-out_infinite]"
            : "border-[#D4D4D4] hover:border-[#B75C3A]/50 hover:bg-[#FAFAF9]"
          }
          ${shake ? "animate-[shake_400ms_ease-in-out]" : ""}
          ${step !== "idle" ? "pointer-events-none opacity-60" : ""}`}
        onDragOver={(e) => { e.preventDefault(); const f = e.dataTransfer.items[0]; if (f) setPendingFile({ name: f.type.includes("pdf") ? "PDF 文件" : "Word 文件", ext: "", valid: true }); setDragOver(true); }}
        onDragLeave={() => { setDragOver(false); if (step === "idle") setPendingFile(null); }}
        onDrop={handleDrop}
        onClick={() => step === "idle" && fileRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileRef.current?.click(); }}
        aria-label="上传简历文件"
      >
        <div className={`mb-5 transition-transform duration-200 ${dragOver ? "scale-110" : ""}`}>
          {step === "idle" ? (
            pendingFile ? (
              pendingFile.valid ? (
                <FileText size={40} className={`mx-auto ${pendingFile.ext === "pdf" ? "text-[#C75B5B]" : "text-[#2D7AB5]"}`} />
              ) : (
                <AlertCircle size={40} className="mx-auto text-[#C75B5B]" />
              )
            ) : (
              <Upload size={40} className="mx-auto text-[#B75C3A]/60" />
            )
          ) : step === "uploading" || step === "parsing" ? (
            <Spinner size={40} className="mx-auto text-[#B75C3A] animate-spin" />
          ) : (
            <Check size={40} className="mx-auto text-[#5B8C5A]" />
          )}
        </div>
        <p className="text-sm text-[#2D2D2D] mb-2 font-medium">
          {step === "idle" ? (
            pendingFile ? (
              pendingFile.valid ? `准备上传：${pendingFile.name}` : pendingFile.reason
            ) : "拖拽文件到此处，或点击上传"
          ) : step === "uploading" ? "正在上传..." :
           step === "parsing" ? "正在解析简历内容..." :
           "上传完成"}
        </p>
        {step === "idle" && pendingFile && !pendingFile.valid && (
          <p className="text-xs text-[#C75B5B] mt-2">{pendingFile.reason}</p>
        )}
        <p className="text-xs text-[#9E9E9E] mt-1">支持 PDF 和 Word 格式，最大 5MB</p>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          aria-label="选择简历文件"
          onChange={handleFileSelect}
        />
      </div>

      {/* Step indicator */}
      {step !== "idle" && (
        <div className="mt-8 max-w-[400px] mx-auto">
          <div className="flex items-center justify-between">
            {[
              { key: "uploading", label: "上传文件" },
              { key: "parsing", label: "AI 解析" },
              { key: "done", label: "完成" },
            ].map((s, i) => {
              const stepOrder = ["idle", "uploading", "parsing", "done"];
              const currentIdx = stepOrder.indexOf(step);
              const stepIdx = stepOrder.indexOf(s.key);
              const done = currentIdx > stepIdx;
              const active = currentIdx === stepIdx;
              return (
                <div key={s.key} className="flex flex-col items-center gap-2 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium
                    transition-all duration-300
                    ${done ? "bg-[#5B8C5A] text-white" :
                      active ? "bg-[#B75C3A] text-white ring-4 ring-[#B75C3A]/20" :
                      "bg-[#EBEBEB] text-[#9E9E9E]"}`}
                  >
                    {done ? <Check size={14} /> : active ? <Spinner size={14} className="animate-spin" /> : i + 1}
                  </div>
                  <span className={`text-xs ${active ? "text-[#2D2D2D] font-medium" : "text-[#9E9E9E]"}`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="relative mt-[-20px] mx-[36px]">
            <div className="h-[2px] bg-[#EBEBEB] absolute inset-x-0 top-4" />
            <div
              className="h-[2px] bg-[#5B8C5A] absolute inset-x-0 top-4 transition-all duration-500"
              style={{ width: step === "uploading" ? "0%" : step === "parsing" ? "50%" : "100%" }}
            />
          </div>
        </div>
      )}

      {error && step === "idle" && (
        <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
          <AlertCircle size={16} className="shrink-0 text-[#C75B5B]" />
          <span className="text-sm text-[#C75B5B]">{error}</span>
        </div>
      )}
    </div>
  );
}