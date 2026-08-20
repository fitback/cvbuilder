"use client";

import { useEffect, useState, use, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import MDEditor from "@uiw/react-md-editor";
import { GeneratedResumeDetail } from "@cvbuilder/shared";
import { Button } from "../../../components/Button";
import { marked } from "marked";
import {
  FileText, AlertCircle, RefreshCw, Check, Copy, Download,
  ChevronDown, Sparkles, Columns, MoreHorizontal,
} from "../../../components/icons";
import { useToast } from "../../../components/Toast";
import { apiFetch, API_BASE } from "../../../lib/auth";
import { useModalA11y } from "../../../lib/useModalA11y";

const API = API_BASE;

function renderPreviewHtml(md: string): string {
  return (marked.parse(md) as string)
    .replace(/<h1/g, '<h1 style="font-size:18pt;font-weight:700;margin-bottom:0.3cm"')
    .replace(/<h2/g, '<h2 style="font-size:13pt;font-weight:600;margin-top:0.6cm;margin-bottom:0.2cm;border-bottom:1px solid #D4D4D4;padding-bottom:0.1cm"')
    .replace(/<h3/g, '<h3 style="font-size:11pt;font-weight:600;margin-top:0.4cm;margin-bottom:0.15cm"')
    .replace(/<p/g, '<p style="margin:0.15cm 0"')
    .replace(/<ul/g, '<ul style="margin:0.1cm 0;padding-left:1.2em"')
    .replace(/<li/g, '<li style="margin-bottom:0.08cm"')
    .replace(/<strong/g, '<strong style="font-weight:600;color:#B75C3A"');
}

type AutoSaveStatus = "idle" | "saving" | "saved" | "error";

export default function GeneratedResumeEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [record, setRecord] = useState<GeneratedResumeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [splitView, setSplitView] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const originalContent = useRef("");
  const moreRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const router = useRouter();
  const leaveDialogRef = useModalA11y(showLeaveConfirm, () => setShowLeaveConfirm(false));
  const previewDialogRef = useModalA11y(showPreview, () => setShowPreview(false));

  const isDirty = content !== originalContent.current;

  // Ctrl/Cmd+S to save
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (name.trim()) handleSave();
      }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [name, content]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    if (!isDirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [isDirty]);

  useEffect(() => {
    apiFetch(`${API}/generated-resumes/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          setRecord(json.data);
          setName(json.data.name);
          setContent(json.data.content);
          originalContent.current = json.data.content;
          setLastSaved(new Date(json.data.updatedAt));
        } else {
          setError(json.error?.message ?? "加载失败");
        }
      })
      .catch(() => setError("加载失败，请重试"))
      .finally(() => setLoading(false));
  }, [id]);

  // Close more menu on outside click
  useEffect(() => {
    if (!showMore) return;
    const h = (e: MouseEvent) => { if (moreRef.current && !moreRef.current.contains(e.target as Node)) setShowMore(false); };
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, [showMore]);

  // Auto-save draft every 30 seconds
  function dispatchSave(state: "saving" | "idle" | "error") {
    const time = state === "idle" ? new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }) : "";
    window.dispatchEvent(new CustomEvent("save-status", { detail: { state, time } }));
  }

  const doAutoSave = useCallback(async () => {
    if (!content || !record) return;
    setAutoSaveStatus("saving");
    dispatchSave("saving");
    try {
      const res = await apiFetch(`${API}/generated-resumes/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, content }),
      });
      const json = await res.json();
      if (json.success) {
        setAutoSaveStatus("saved");
        originalContent.current = content;
        setLastSaved(new Date());
        setTimeout(() => { setAutoSaveStatus("idle"); dispatchSave("idle"); }, 3000);
      } else {
        setAutoSaveStatus("error");
        dispatchSave("error");
        setTimeout(() => { setAutoSaveStatus("idle"); dispatchSave("idle"); }, 5000);
      }
    } catch {
      setAutoSaveStatus("error");
      dispatchSave("error");
      setTimeout(() => { setAutoSaveStatus("idle"); dispatchSave("idle"); }, 5000);
    }
  }, [id, content, name, record]);

  useEffect(() => {
    if (!content || !record) return;
    const timer = setInterval(doAutoSave, 30000);
    return () => clearInterval(timer);
  }, [doAutoSave]);

  async function copyMarkdown() { await navigator.clipboard.writeText(content); toast("已复制到剪贴板", "success"); }

  function doExportPdf() {
    apiFetch(`${API}/export/pdf`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ markdown: content }) })
      .then(r => r.blob()).then(blob => {
        const url = URL.createObjectURL(blob); const a = document.createElement("a");
        a.href = url; a.download = "resume.pdf"; a.click(); URL.revokeObjectURL(url);
        toast("PDF 已导出", "success");
      }).catch(() => toast("PDF 导出失败", "error"));
  }

  function doExportDocx() {
    apiFetch(`${API}/export/docx`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ markdown: content }) })
      .then(r => r.blob()).then(blob => {
        const url = URL.createObjectURL(blob); const a = document.createElement("a");
        a.href = url; a.download = "resume.docx"; a.click(); URL.revokeObjectURL(url);
        toast("DOCX 已导出", "success");
      }).catch(() => toast("DOCX 导出失败", "error"));
  }

  async function handleSave() {
    if (!name.trim()) { setSaveError("请输入名称"); return; }
    setSaving(true); setSaveError("");
    try {
      const res = await apiFetch(`${API}/generated-resumes/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), content }),
      });
      const json = await res.json();
      if (!json.success) { setSaveError(json.error?.message ?? "保存失败"); return; }
      toast("保存成功", "success");
      router.push("/dashboard");
    } catch { setSaveError("网络错误，请重试"); } finally { setSaving(false); }
  }

  const analysisRecordId = record?.analysisRecordId;
  const resumeId = record?.resumeId;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle size={48} className="text-[#C75B5B] mb-4 opacity-50" />
        <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">加载失败</h3>
        <p className="text-sm text-[#6B6B6B] mb-6">{error}</p>
        <Button variant="secondary" icon={<RefreshCw size={16} />} onClick={() => window.location.reload()}>重试</Button>
      </div>
    );
  }

  if (loading || !record) {
    return (
      <div className="animate-[fadeIn_200ms_ease-out] space-y-6">
        <div className="space-y-2"><div className="h-7 w-48 bg-[#F5F4F2] rounded animate-pulse" /><div className="h-4 w-32 bg-[#F5F4F2] rounded animate-pulse" /></div>
        <div className="h-[600px] bg-[#F5F4F2] rounded-xl animate-pulse" />
      </div>
    );
  }

  const autoSaveLabel = autoSaveStatus === "saving" ? "保存中..." : autoSaveStatus === "saved" ? "已自动保存" : autoSaveStatus === "error" ? "保存失败" : null;

  return (
    <div className="animate-[slideUp_300ms_ease-out] space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-semibold text-[#1A1A1A]">编辑简历</h2>
            {autoSaveLabel && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                autoSaveStatus === "saving" ? "bg-[#C7953A]/10 text-[#C7953A]" :
                autoSaveStatus === "saved" ? "bg-[#5B8C5A]/10 text-[#5B8C5A]" :
                "bg-[#C75B5B]/10 text-[#C75B5B]"}`}>
                {autoSaveStatus === "saving" && <RefreshCw size={10} className="inline animate-spin mr-1" />}
                {autoSaveLabel}
              </span>
            )}
          </div>
          <p className="text-sm text-[#6B6B6B] mt-1 flex items-center gap-2 flex-wrap">
            {new Date(record.createdAt).toLocaleDateString("zh-CN")}
            {lastSaved && autoSaveStatus === "idle" && (
              <span className="text-[#9E9E9E]">· 上次保存 {lastSaved.toLocaleTimeString("zh-CN")}</span>
            )}
          </p>
        </div>

        {/* Desktop buttons */}
        <div className="hidden sm:flex items-center gap-2">
          {analysisRecordId && (
            <Button variant="ghost" size="sm" icon={<Sparkles size={14} />} onClick={() => { if (isDirty) setShowLeaveConfirm(true); else router.push(`/analyze/${resumeId}`); }}>
              分析依据
            </Button>
          )}
          <Button variant="secondary" size="sm" icon={<Copy size={14} />} onClick={copyMarkdown}>复制</Button>
          <Button variant="secondary" size="sm" icon={<Columns size={14} />} onClick={() => setSplitView(!splitView)}>
            {splitView ? "单栏" : "分屏"}
          </Button>
          <Button variant="secondary" size="sm" icon={<FileText size={14} />} onClick={() => setShowPreview(true)}>预览导出</Button>
          <Button variant="secondary" size="sm" onClick={() => { if (isDirty) setShowLeaveConfirm(true); else router.push("/dashboard"); }}>返回</Button>
          <Button variant="primary" size="sm" icon={<Check size={14} />} loading={saving} onClick={handleSave}>保存并返回</Button>
        </div>

        {/* Mobile: primary + more */}
        <div className="flex sm:hidden items-center gap-2">
          <Button variant="primary" size="sm" icon={<Check size={14} />} loading={saving} onClick={handleSave}>保存并返回</Button>
          <div className="relative" ref={moreRef}>
            <Button variant="secondary" size="sm" icon={<MoreHorizontal size={14} />} onClick={() => setShowMore(!showMore)} aria-label="打开更多编辑操作" />
            {showMore && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-[#EBEBEB] rounded-lg shadow-lg py-1 z-50 min-w-[140px]">
                <button onClick={() => { setShowPreview(true); setShowMore(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-[#F5F4F2] flex items-center gap-2"><FileText size={14} />预览导出</button>
                <button onClick={() => { setSplitView(!splitView); setShowMore(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-[#F5F4F2] flex items-center gap-2"><Columns size={14} />分屏</button>
                <button onClick={() => { copyMarkdown(); setShowMore(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-[#F5F4F2] flex items-center gap-2"><Copy size={14} />复制</button>
                {analysisRecordId && (
                  <button onClick={() => { router.push(`/analyze/${resumeId}`); setShowMore(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-[#F5F4F2] flex items-center gap-2"><Sparkles size={14} />分析依据</button>
                )}
                <hr className="my-1 border-[#EBEBEB]" />
                <button onClick={() => { setShowMore(false); if (isDirty) setShowLeaveConfirm(true); else router.push("/dashboard"); }} className="w-full text-left px-3 py-2 text-sm hover:bg-[#F5F4F2]">返回仪表盘</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Name input */}
      <div>
        <label className="block text-sm font-medium text-[#2D2D2D] mb-2">名称</label>
        <input type="text" value={name} onChange={(e) => { setName(e.target.value); setSaveError(""); }}
          className="w-full max-w-md px-3 py-2 border border-[#EBEBEB] rounded-lg text-sm text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#B75C3A]/30 focus:border-[#B75C3A]"
          placeholder="输入简历名称" />
        {saveError && <p className="text-xs text-[#C75B5B] mt-1">{saveError}</p>}
      </div>

      {/* Editor area */}
      <div className={`grid ${splitView ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"} gap-4`}>
        <div data-color-mode="light" className="responsive-md-editor rounded-xl overflow-hidden border border-[#EBEBEB]">
          <MDEditor value={content} onChange={(v) => setContent(v || "")} height={600} visibleDragbar={false} />
        </div>
        {splitView && (
          <div className="hidden lg:block rounded-xl overflow-hidden border border-[#EBEBEB] bg-white">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-[#EBEBEB] bg-[#FAFAF9]">
              <FileText size={14} className="text-[#9E9E9E]" />
              <span className="text-xs text-[#6B6B6B] font-medium">A4 实时预览</span>
            </div>
            <div className="h-[400px] lg:h-[600px] p-6 overflow-auto">
              <div className="mx-auto" style={{ maxWidth: "21cm", fontFamily: '"PingFang SC","Microsoft YaHei","Noto Sans SC","Source Han Sans CN",sans-serif', fontSize: "10.5pt", lineHeight: "1.5", color: "#2D2D2D" }}
                dangerouslySetInnerHTML={{ __html: renderPreviewHtml(content) }} />
            </div>
          </div>
        )}
      </div>

      {/* Leave confirmation */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowLeaveConfirm(false)}>
          <div ref={leaveDialogRef} role="dialog" aria-modal="true" aria-labelledby="leave-dialog-title" className="bg-white rounded-xl p-6 w-full max-w-sm mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 id="leave-dialog-title" className="text-lg font-semibold text-[#1A1A1A] mb-2">有未保存的更改</h3>
            <p className="text-sm text-[#6B6B6B] mb-6">离开页面将丢失未保存的修改。是否保存后再离开？</p>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" size="sm" onClick={() => { setShowLeaveConfirm(false); router.push("/dashboard"); }}>不保存直接离开</Button>
              <Button variant="primary" size="sm" onClick={handleSave}>保存并离开</Button>
            </div>
          </div>
        </div>
      )}

      {/* Preview/Export Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowPreview(false)}>
          <div ref={previewDialogRef} role="dialog" aria-modal="true" aria-labelledby="preview-dialog-title" className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#EBEBEB]">
              <h3 id="preview-dialog-title" className="text-lg font-semibold text-[#1A1A1A]">打印预览</h3>
              <div className="flex items-center gap-2">
                <Button variant="primary" size="sm" icon={<Download size={14} />} onClick={() => { doExportPdf(); }}>导出 PDF</Button>
                <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={() => { doExportDocx(); }}>导出 DOCX</Button>
                <button onClick={() => setShowPreview(false)} className="text-[#9E9E9E] hover:text-[#2D2D2D] text-lg leading-none" aria-label="关闭打印预览">&times;</button>
              </div>
            </div>
            <div className="p-8 overflow-auto max-h-[calc(90vh-64px)] bg-white">
              <div className="mx-auto" style={{ maxWidth: "21cm", fontFamily: '"PingFang SC","Microsoft YaHei","Noto Sans SC","Source Han Sans CN",sans-serif', fontSize: "10.5pt", lineHeight: "1.5", color: "#2D2D2D" }}
                dangerouslySetInnerHTML={{ __html: renderPreviewHtml(content) }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
