"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import MDEditor from "@uiw/react-md-editor";
import { GeneratedResumeDetail } from "@cvbuilder/shared";
import { Button } from "../../../components/Button";
import { marked } from "marked";
import { FileText, AlertCircle, RefreshCw, Check, Copy, Download } from "../../../components/icons";
import { useToast } from "../../../components/Toast";
import { apiFetch, API_BASE } from "../../../lib/auth";

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
  const { toast } = useToast();
  const router = useRouter();

  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);

  useEffect(() => {
    apiFetch(`${API}/generated-resumes/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          setRecord(json.data);
          setName(json.data.name);
          setContent(json.data.content);
          setLastSaved(new Date(json.data.updatedAt));
        } else {
          setError(json.error?.message ?? "加载失败");
        }
      })
      .catch(() => setError("加载失败，请重试"))
      .finally(() => setLoading(false));
  }, [id]);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (!content || !record) return;
    const timer = setInterval(async () => {
      try {
        const res = await apiFetch(`${API}/generated-resumes/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, content }),
        });
        const json = await res.json();
        if (json.success) {
          setDraftSaved(true);
          setLastSaved(new Date());
          setTimeout(() => setDraftSaved(false), 2000);
        }
      } catch {}
    }, 30000);
    return () => clearInterval(timer);
  }, [id, content, name, record]);

  async function copyMarkdown() {
    await navigator.clipboard.writeText(content);
    toast("已复制到剪贴板", "success");
  }

  async function exportPdf() {
    try {
      const res = await apiFetch(`${API}/export/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown: content }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "resume.pdf";
      a.click();
      URL.revokeObjectURL(url);
      toast("PDF 已导出", "success");
    } catch {
      toast("PDF 导出失败", "error");
    }
  }

  async function exportDocx() {
    try {
      const res = await apiFetch(`${API}/export/docx`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown: content }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "resume.docx";
      a.click();
      URL.revokeObjectURL(url);
      toast("DOCX 已导出", "success");
    } catch {
      toast("DOCX 导出失败", "error");
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      setSaveError("请输入名称");
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      const res = await apiFetch(`${API}/generated-resumes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), content }),
      });
      const json = await res.json();
      if (!json.success) {
        setSaveError(json.error?.message ?? "保存失败");
        return;
      }
      toast("保存成功", "success");
      router.push("/dashboard");
    } catch {
      setSaveError("网络错误，请重试");
    } finally {
      setSaving(false);
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-[fadeIn_200ms_ease-out]">
        <AlertCircle size={48} className="text-[#C75B5B] mb-4 opacity-50" />
        <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">加载失败</h3>
        <p className="text-sm text-[#6B6B6B] mb-6">{error}</p>
        <Button variant="secondary" icon={<RefreshCw size={16} />} onClick={() => window.location.reload()}>
          重试
        </Button>
      </div>
    );
  }

  if (loading || !record) {
    return (
      <div className="animate-[fadeIn_200ms_ease-out] space-y-6">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-[#F5F4F2] rounded animate-pulse" />
          <div className="h-4 w-32 bg-[#F5F4F2] rounded animate-pulse" />
        </div>
        <div className="h-[600px] bg-[#F5F4F2] rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="animate-[slideUp_300ms_ease-out] space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#1A1A1A]">编辑简历</h2>
          <p className="text-sm text-[#6B6B6B] mt-1">
            创建于 {new Date(record.createdAt).toLocaleDateString("zh-CN")}
            {draftSaved && <span className="ml-2 text-[#5B8C5A]">草稿已自动保存</span>}
            {lastSaved && !draftSaved && <span className="ml-2 text-[#9E9E9E]">上次保存 {lastSaved.toLocaleTimeString("zh-CN")}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={<Copy size={14} />} onClick={copyMarkdown}>
            复制
          </Button>
          <Button variant="secondary" size="sm" icon={<FileText size={14} />} onClick={() => setShowPreview(true)}>
            预览
          </Button>
          <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={exportPdf}>
            导出 PDF
          </Button>
          <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={exportDocx}>
            导出 DOCX
          </Button>
          <Button variant="secondary" size="sm" onClick={() => router.push("/dashboard")}>
            返回
          </Button>
          <Button variant="primary" size="sm" icon={<Check size={14} />} loading={saving} onClick={handleSave}>
            确认
          </Button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#2D2D2D] mb-2">名称</label>
        <input
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setSaveError(""); }}
          className="w-full max-w-md px-3 py-2 border border-[#EBEBEB] rounded-lg text-sm text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#B75C3A]/30 focus:border-[#B75C3A]"
          placeholder="输入简历名称"
        />
        {saveError && <p className="text-xs text-[#C75B5B] mt-1">{saveError}</p>}
      </div>

      <div data-color-mode="light" className="rounded-xl overflow-hidden border border-[#EBEBEB]">
        <MDEditor
          value={content}
          onChange={(v) => setContent(v || "")}
          height={600}
          visibleDragbar={false}
        />
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowPreview(false)}>
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#EBEBEB]">
              <h3 className="text-lg font-semibold text-[#1A1A1A]">打印预览</h3>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={() => { setShowPreview(false); exportPdf(); }}>
                  导出 PDF
                </Button>
                <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={() => { setShowPreview(false); exportDocx(); }}>
                  导出 DOCX
                </Button>
                <button onClick={() => setShowPreview(false)} className="text-[#9E9E9E] hover:text-[#2D2D2D] text-lg leading-none">&times;</button>
              </div>
            </div>
            <div className="p-8 overflow-auto max-h-[calc(90vh-64px)] bg-white">
              <div
                className="mx-auto"
                style={{ maxWidth: "21cm", fontFamily: '"PingFang SC","Microsoft YaHei","Noto Sans SC","Source Han Sans CN",sans-serif', fontSize: "10.5pt", lineHeight: "1.5", color: "#2D2D2D" }}
                dangerouslySetInnerHTML={{ __html: renderPreviewHtml(content) }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
