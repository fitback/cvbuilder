"use client";

import { useEffect, useState, use, useMemo } from "react";
import { useRouter } from "next/navigation";
import MDEditor from "@uiw/react-md-editor";
import { JobDescriptionItem, AnalysisResult, ResumeDetail, AnalysisHistoryItem } from "@cvbuilder/shared";
import { Button } from "../../../components/Button";
import {
  Sparkles, FileText, Briefcase, AlertCircle, Check, X,
  ChevronDown, Copy, Download, RefreshCw, BarChart3,
  Target, Lightbulb, ShieldAlert,
} from "../../../components/icons";
import { useToast } from "../../../components/Toast";
import { apiFetch } from "../../../lib/auth";
import InsufficientPoints from "../../../components/InsufficientPoints";
import OriginalResumeCard from "../../../components/OriginalResumeCard";


type Step = "idle" | "analyzing" | "generating" | "done";

export default function AnalyzePage({ params }: { params: Promise<{ resumeId: string }> }) {
  const { resumeId } = use(params);
  const { record: initialRecord } = use(searchParams);
  const [resume, setResume] = useState<ResumeDetail | null>(null);
  const [jobs, setJobs] = useState<JobDescriptionItem[]>([]);
  const [selectedJd, setSelectedJd] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [viewingHistoryId, setViewingHistoryId] = useState<string | null>(null);
  const [generatedMarkdown, setGeneratedMarkdown] = useState("");
  const [showInsufficient, setShowInsufficient] = useState(false);
  const [pointsNeeded, setPointsNeeded] = useState(0);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const { toast } = useToast();
  const router = useRouter();

  const defaultSaveName = useMemo(() => {
    const jd = jobs.find((j) => j.id === selectedJd);
    const title = jd?.title ?? "未知岗位";
    const date = new Date().toISOString().slice(0, 10);
    return `优化简历 - ${title} - ${date}`;
  }, [jobs, selectedJd]);

  useEffect(() => {
    apiFetch(`${API_BASE}/resumes/${resumeId}`).then((r) => r.json()).then((j) => setResume(j.data));
    apiFetch(`${API_BASE}/jobs`).then((r) => r.json()).then((j) => setJobs(j.data ?? []));
    fetchHistory();
  }, [resumeId]);

  async function fetchHistory() {
    const res = await apiFetch(`${API_BASE}/analyze?resumeId=${resumeId}`);
    const json = await res.json();
    const items: AnalysisHistoryItem[] = json.data ?? [];
    setHistory(items);
    if (initialRecord && !viewingHistoryId) {
      loadDetail(initialRecord);
      setGeneratedMarkdown(""); // trigger comparison view open
    } else if (items.length > 0 && !viewingHistoryId) {
      loadDetail(items[0].id);
    }
  }

  async function loadDetail(recordId: string) {
    setViewingHistoryId(recordId);
    const res = await apiFetch(`${API_BASE}/analyze/${recordId}`);
    const json = await res.json();
    if (json.success) {
      setResult(json.data);
      setStep("done");
    }
    // Also try to load saved markdown
    try {
      const genRes = await apiFetch(`${API_BASE}/generate/${recordId}`);
      const genJson = await genRes.json();
      if (genJson.success && genJson.data.markdown) {
        setGeneratedMarkdown(genJson.data.markdown);
        setSavedMarkdown(genJson.data.markdown);
      }
    } catch {}
  }

  async function startAnalyze() {
    if (!selectedJd) return;
    setError("");
    setStep("analyzing");

    try {
      const res = await apiFetch(`${API_BASE}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ resumeId, jobDescriptionId: selectedJd }),
      });
      const json = await res.json();
      if (!json.success) {
        if (json.error?.code === "QUOTA_EXCEEDED") {
          setPointsNeeded(30);
          setCurrentBalance(0);
          setShowInsufficient(true);
          return;
        }
        setError(json.error?.message ?? "分析失败");
        setStep("idle");
        return;
      }
      setResult(json.data);
      setRemaining(json.data.remainingFreeCount);
      setStep("done");
      toast("分析完成", "success");
      await fetchHistory();
    } catch {
      setError("网络错误，请重试");
      setStep("idle");
    }
  }

  async function startGenerate() {
    if (!viewingHistoryId) return;
    setStep("generating");
    setGeneratedMarkdown("");
    setError("");
    try {
      const res = await apiFetch(`${API_BASE}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ resumeId, analysisRecordId: viewingHistoryId }),
      });
      const json = await res.json();
      if (!json.success) {
        if (json.error?.code === "QUOTA_EXCEEDED") {
          setPointsNeeded(50);
          setCurrentBalance(0);
          setShowInsufficient(true);
          return;
        }
        setError(json.error?.message ?? "生成失败");
        setStep("done");
        return;
      }
      setGeneratedMarkdown(json.data.markdown);
      setStep("done");
      toast("简历生成成功", "success");
    } catch {
      setError("网络错误，请重试");
      setStep("done");
    }
  }

  async function copyMarkdown() {
    await navigator.clipboard.writeText(generatedMarkdown);
    toast("已复制到剪贴板", "success");
  }

  async function exportPdf() {
    try {
      const content = savedMarkdown || generatedMarkdown;
      const res = await apiFetch(`${API_BASE}/export/pdf`, {
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

  function openSaveDialog() {
    setSaveName(defaultSaveName);
    setSaveError("");
    setShowSaveDialog(true);
  }

  async function handleSave() {
    if (!saveName.trim()) {
      setSaveError("请输入名称");
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      const res = await apiFetch(`${API}/generated-resumes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: saveName.trim(),
          content: generatedMarkdown,
          resumeId,
          analysisRecordId: viewingHistoryId ?? undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setSaveError(json.error?.message ?? "保存失败");
        return;
      }
      setShowSaveDialog(false);
      toast("保存成功", "success");
      router.push(`/generated/${json.data.id}`);
    } catch {
      setSaveError("网络错误，请重试");
    } finally {
      setSaving(false);
    }
  }

  if (!resume) {
    return (
      <div className="p-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-6 bg-[#F5F4F2] rounded animate-pulse w-3/4" style={{ animationDelay: `${i * 100}ms` }} />
        ))}
      </div>
    );
  }

  return (
    <div className="animate-[slideUp_300ms_ease-out] space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#1A1A1A]">分析简历</h2>
        <p className="text-sm text-[#6B6B6B] mt-1">{resume.fileNameOriginal}</p>
      </div>

      {/* History cards */}
      {history.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-[#6B6B6B] mb-3">历史分析</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {history.map((item) => (
              <button
                key={item.id}
                onClick={() => loadDetail(item.id)}
                className={`text-left p-4 rounded-xl border transition-all duration-200 ease-out
                  active:scale-[0.99]
                  ${viewingHistoryId === item.id
                    ? "border-[#B75C3A] bg-[#B75C3A]/5 shadow-sm"
                    : "border-[#EBEBEB] bg-white hover:border-[#D4D4D4] hover:shadow-sm"
                  }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[#2D2D2D] truncate">{item.jdTitle}</div>
                    {item.jdCompany && <div className="text-xs text-[#9E9E9E] mt-0.5">{item.jdCompany}</div>}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-2xl font-bold text-[#B75C3A]">{item.matchScore}</span>
                      <span className="text-xs text-[#9E9E9E]">分</span>
                    </div>
                    <div className="text-xs text-[#9E9E9E]">{new Date(item.createdAt).toLocaleDateString("zh-CN")}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Analysis result */}
      {result && step === "done" && (
        <div className="space-y-4">
          <div className="bg-white border border-[#EBEBEB] rounded-xl p-8 text-center">
            <div className="relative inline-flex mb-4">
              <div className="text-6xl font-bold text-[#B75C3A]">{result.matchScore}</div>
              <div className="text-base text-[#9E9E9E] mt-4 ml-1">/ 100</div>
            </div>
            <div className="text-sm text-[#9E9E9E] mb-1">匹配度分数</div>
            <p className="text-sm text-[#2D2D2D] max-w-md mx-auto">
              {result.matchSummary || `你的简历覆盖了该岗位 ${result.matchScore}% 的核心需求`}
            </p>
          </div>

          <div className="space-y-3">
            <details open className="group bg-white border border-[#EBEBEB] rounded-xl overflow-hidden">
              <summary className="flex items-center gap-2 p-4 text-sm font-medium text-[#2D2D2D] cursor-pointer
                                 hover:bg-[#FAFAF9] transition-colors duration-150">
                <Target size={18} className="text-[#B75C3A]" />
                <span className="flex-1">JD 核心解码</span>
                <ChevronDown size={16} className="text-[#9E9E9E] group-open:rotate-180 transition-transform duration-200" />
              </summary>
              <div className="px-4 pb-4 space-y-3">
                {result.jdCoreDecoding?.map((item, i) => (
                  <div key={i} className="p-3 bg-[#F5F4F2] rounded-lg">
                    <div className="text-sm font-medium text-[#2D2D2D]">{item.core}</div>
                    <div className="text-xs text-[#6B6B6B] mt-1">隐性考察：{item.hidden}</div>
                  </div>
                ))}
              </div>
            </details>

            <details open className="group bg-white border border-[#EBEBEB] rounded-xl overflow-hidden">
              <summary className="flex items-center gap-2 p-4 text-sm font-medium text-[#2D2D2D] cursor-pointer
                                 hover:bg-[#FAFAF9] transition-colors duration-150">
                <Lightbulb size={18} className="text-[#C7953A]" />
                <span className="flex-1">优化建议</span>
                <ChevronDown size={16} className="text-[#9E9E9E] group-open:rotate-180 transition-transform duration-200" />
              </summary>
              <div className="px-4 pb-4 space-y-3">
                {result.optimizationSuggestions?.map((item, i) => (
                  <div key={i} className="p-3 bg-[#F5F4F2] rounded-lg">
                    <div className="text-sm font-medium text-[#2D2D2D]">
                      {item.target}
                      <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                        item.action === "add" ? "bg-[#5B8C5A]/10 text-[#5B8C5A]" :
                        item.action === "modify" ? "bg-[#C7953A]/10 text-[#C7953A]" :
                        "bg-[#C75B5B]/10 text-[#C75B5B]"
                      }`}>
                        {item.action === "add" ? "新增" : item.action === "modify" ? "修改" : "删除"}
                      </span>
                    </div>
                    <div className="text-xs text-[#6B6B6B] mt-1">{item.detail}</div>
                    <div className="text-xs text-[#9E9E9E] mt-1 italic">示例：{item.example}</div>
                  </div>
                ))}
              </div>
            </details>

            <details open className="group bg-white border border-[#EBEBEB] rounded-xl overflow-hidden">
              <summary className="flex items-center gap-2 p-4 text-sm font-medium text-[#2D2D2D] cursor-pointer
                                 hover:bg-[#FAFAF9] transition-colors duration-150">
                <ShieldAlert size={18} className="text-[#C75B5B]" />
                <span className="flex-1">排雷清单</span>
                <ChevronDown size={16} className="text-[#9E9E9E] group-open:rotate-180 transition-transform duration-200" />
              </summary>
              <div className="px-4 pb-4 space-y-2">
                {result.detailChecklist?.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      item.type === "delete" ? "bg-red-50 text-[#C75B5B]" : "bg-amber-50 text-[#C7953A]"
                    }`}>
                      {item.type === "delete" ? "删除" : "修改"}
                    </span>
                    <div className="text-[#2D2D2D]">
                      <span className="text-[#9E9E9E]">{item.location}：</span>
                      {item.content}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          </div>

          {!generatedMarkdown && (
            <div className="flex justify-center">
              <Button
                variant="primary"
                size="lg"
                icon={<Sparkles size={18} />}
                onClick={startGenerate}
              >
                生成优化简历 · 消耗 50 积分
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Generating state */}
      {step === "generating" && !generatedMarkdown && (
        <div className="p-8 bg-white border border-[#EBEBEB] rounded-xl text-center space-y-4">
          <div className="w-10 h-10 border-2 border-[#B75C3A] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-[#6B6B6B]">AI 正在生成简历，请稍候...</p>
          <div className="space-y-2 max-w-sm mx-auto">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-3 bg-[#F5F4F2] rounded animate-pulse" style={{ width: `${[70, 50, 60][i - 1]}%`, animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
        </div>
      )}

      {/* Generated markdown */}
      {generatedMarkdown && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[#1A1A1A]">生成的简历</h3>
            <div className="flex gap-2">
              <Button variant="primary" size="sm" icon={<Check size={14} />} onClick={openSaveDialog}>
                确认
              </Button>
              <Button variant="secondary" size="sm" icon={<Copy size={14} />} onClick={copyMarkdown}>
                复制
              </Button>
              <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={exportPdf}>
                导出 PDF
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setGeneratedMarkdown("")}>
                收起
              </Button>
            </div>
          </div>
          <div data-color-mode="light" className="rounded-xl overflow-hidden border border-[#EBEBEB]">
            <MDEditor
              value={generatedMarkdown}
              onChange={(v) => setGeneratedMarkdown(v || "")}
              height={600}
              visibleDragbar={false}
            />
          </div>
        </div>
      )}

      {/* Job selection & analyze */}
      <div className="p-6 bg-white border border-[#EBEBEB] rounded-xl space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-[#2D2D2D] mb-3">
          <Target size={18} className="text-[#B75C3A]" />
          <span>选择目标岗位</span>
        </div>
        {jobs.length === 0 ? (
          <div className="text-sm text-[#9E9E9E]">
            还没有 JD — <a href="/jobs" className="text-[#B75C3A] hover:underline">去创建一个</a>
          </div>
        ) : (
          <div className="space-y-2 mb-4">
            {jobs.map((j) => (
              <label
                key={j.id}
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all duration-150
                  ${selectedJd === j.id
                    ? "border-[#B75C3A] bg-[#B75C3A]/5"
                    : "border-[#EBEBEB] hover:border-[#D4D4D4] hover:bg-[#FAFAF9]"
                  }`}
              >
                <input
                  type="radio"
                  name="jd"
                  value={j.id}
                  checked={selectedJd === j.id}
                  onChange={() => setSelectedJd(j.id)}
                  className="accent-[#B75C3A]"
                />
                <div>
                  <div className="text-sm font-medium text-[#2D2D2D]">{j.title}</div>
                  {j.company && <div className="text-xs text-[#9E9E9E]">{j.company}</div>}
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); viewJdDetail(j.id); }}
                  className="text-xs text-accent hover:underline shrink-0"
                >
                  查看详情
                </button>
              </label>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            icon={<BarChart3 size={16} />}
            loading={step === "analyzing"}
            disabled={!selectedJd}
            onClick={startAnalyze}
          >
            AI 分析 · 消耗 30 积分
          </Button>
          <span className="text-xs text-[#9E9E9E]">每次分析消耗 30 积分</span>
        </div>
      </div>

      {/* Analyzing state */}
      {step === "analyzing" && (
        <div className="p-8 bg-white border border-[#EBEBEB] rounded-xl text-center space-y-4">
          <div className="w-10 h-10 border-2 border-[#B75C3A] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-[#6B6B6B]">AI 正在分析中，请稍候...</p>
          <div className="space-y-2 max-w-sm mx-auto">
            <div className="h-3 bg-[#F5F4F2] rounded animate-pulse w-3/4" />
            <div className="h-3 bg-[#F5F4F2] rounded animate-pulse w-1/2" />
            <div className="h-3 bg-[#F5F4F2] rounded animate-pulse w-2/3" />
          </div>
        </div>
      )}

      {showInsufficient && (
        <InsufficientPoints needed={pointsNeeded} current={currentBalance} onClose={() => setShowInsufficient(false)} />
      )}

      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => !saving && setShowSaveDialog(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[#1A1A1A] mb-4">保存简历</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-[#2D2D2D] mb-1">名称</label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => { setSaveName(e.target.value); setSaveError(""); }}
                  className="w-full px-3 py-2 border border-[#EBEBEB] rounded-lg text-sm text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#B75C3A]/30 focus:border-[#B75C3A]"
                  placeholder="输入简历名称"
                  disabled={saving}
                  autoFocus
                />
                {saveError && <p className="text-xs text-[#C75B5B] mt-1">{saveError}</p>}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="secondary" size="sm" onClick={() => setShowSaveDialog(false)} disabled={saving}>
                取消
              </Button>
              <Button variant="primary" size="sm" loading={saving} onClick={handleSave}>
                确认保存
              </Button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 rounded-xl">
          <AlertCircle size={16} className="shrink-0 text-[#C75B5B]" />
          <span className="text-sm text-[#C75B5B] flex-1">{error}</span>
          <Button variant="ghost" size="sm" onClick={() => { setError(""); setStep("idle"); }}>
            重试
          </Button>
        </div>
      )}
    </div>
  );
}
