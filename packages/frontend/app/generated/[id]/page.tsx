"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import MDEditor from "@uiw/react-md-editor";
import { GeneratedResumeDetail } from "@cvbuilder/shared";
import { Button } from "../../../components/Button";
import { FileText, AlertCircle, RefreshCw, Check, Copy, Download } from "../../../components/icons";
import { useToast } from "../../../components/Toast";
import { apiFetch } from "../../../lib/auth";

const API = "http://localhost:3001";

export default function GeneratedResumeEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [record, setRecord] = useState<GeneratedResumeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    apiFetch(`${API}/generated-resumes/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          setRecord(json.data);
          setName(json.data.name);
          setContent(json.data.content);
        } else {
          setError(json.error?.message ?? "加载失败");
        }
      })
      .catch(() => setError("加载失败，请重试"))
      .finally(() => setLoading(false));
  }, [id]);

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
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={<Copy size={14} />} onClick={copyMarkdown}>
            复制
          </Button>
          <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={exportPdf}>
            导出 PDF
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
    </div>
  );
}
