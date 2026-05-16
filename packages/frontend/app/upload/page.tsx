"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../components/Button";
import { Upload, FileText, Check, AlertCircle, Spinner } from "../../components/icons";
import { useToast } from "../../components/Toast";
import { apiFetch } from "../../lib/auth";

const API = "http://localhost:3001";

type UploadStep = "idle" | "uploading" | "parsing" | "done";

export default function UploadPage() {
  const [dragOver, setDragOver] = useState(false);
  const [step, setStep] = useState<UploadStep>("idle");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { toast } = useToast();

  const triggerError = useCallback((msg: string) => {
    setError(msg);
    setShake(true);
    setTimeout(() => setShake(false), 400);
    toast(msg, "error");
  }, [toast]);

  async function uploadFile(file: File) {
    setError("");
    setFileName(file.name);

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["pdf", "docx"].includes(ext)) {
      triggerError("仅支持 PDF 和 Word 格式");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      triggerError("文件大小不能超过 5MB");
      return;
    }

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
      // Brief delay so the user sees the "parsing" step
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

  return (
    <div className="animate-[slideUp_300ms_ease-out]">
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-[#1A1A1A]">上传简历</h2>
        <p className="text-sm text-[#6B6B6B] mt-1">支持 PDF 和 Word 格式，AI 自动解析简历内容</p>
      </div>

      <div
        className={`relative border-2 border-dashed rounded-xl p-14 text-center cursor-pointer
          transition-all duration-200 ease-out
          ${dragOver
            ? "border-[#B75C3A] bg-[#B75C3A]/5 scale-[1.01]"
            : "border-[#D4D4D4] hover:border-[#B75C3A]/50 hover:bg-[#FAFAF9]"
          }
          ${shake ? "animate-[shake_400ms_ease-in-out]" : ""}
          ${step !== "idle" ? "pointer-events-none opacity-60" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) uploadFile(f); }}
        onClick={() => step === "idle" && fileRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileRef.current?.click(); }}
        aria-label="上传简历文件"
      >
        <div className={`mb-5 transition-transform duration-200 ${dragOver ? "scale-110" : ""}`}>
          {step === "idle" ? (
            <Upload size={40} className="mx-auto text-[#B75C3A]/60" />
          ) : step === "uploading" ? (
            <Spinner size={40} className="mx-auto text-[#B75C3A] animate-spin" />
          ) : step === "parsing" ? (
            <Spinner size={40} className="mx-auto text-[#B75C3A] animate-spin" />
          ) : (
            <Check size={40} className="mx-auto text-[#5B8C5A]" />
          )}
        </div>
        <p className="text-sm text-[#2D2D2D] mb-2 font-medium">
          {step === "idle" ? "拖拽文件到此处，或点击上传" :
           step === "uploading" ? "正在上传..." :
           step === "parsing" ? "正在解析简历内容..." :
           "上传完成"}
        </p>
        <p className="text-xs text-[#9E9E9E]">支持 PDF 和 Word 格式，最大 5MB</p>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          aria-label="选择简历文件"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); }}
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