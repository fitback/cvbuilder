"use client";

import { useEffect, useState, use, useMemo } from "react";
import { useRouter } from "next/navigation";
import MDEditor from "@uiw/react-md-editor";
import { JobDescriptionItem, AnalysisResult, ResumeDetail, AnalysisHistoryItem } from "@cvbuilder/shared";
import { Button } from "../../../components/Button";
import {
  Sparkles, FileText, Briefcase, AlertCircle, Check, X,
  ChevronDown, Copy, Download, RefreshCw, BarChart3,
  Target, Lightbulb, ShieldAlert, ChevronLeft, History,
} from "../../../components/icons";
import { useToast } from "../../../components/Toast";
import { apiFetch, API_BASE } from "../../../lib/auth";
import { getErrorMessage } from "../../../lib/error-codes";
import InsufficientPoints from "../../../components/InsufficientPoints";

const API = API_BASE;

type Step = string;

export default function AnalyzePage({ params }: { params: Promise<{ resumeId: string }> }) {
  const { resumeId } = use(params);
  const [resume, setResume] = useState<ResumeDetail | null>(null);
  const [jobs, setJobs] = useState<JobDescriptionItem[]>([]);
  const [selectedJd, setSelectedJd] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [viewingHistoryId, setViewingHistoryId] = useState<string | null>(null);
  const [generatedMarkdown, setGeneratedMarkdown] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [suggestionStatus, setSuggestionStatus] = useState<Record<number, "pending" | "applied" | "ignored">>({});
  const [showInsufficient, setShowInsufficient] = useState(false);
  const [pointsNeeded, setPointsNeeded] = useState(0);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const defaultSaveName = useMemo(() => {
    const jd = jobs.find((j) => j.id === selectedJd);
    const title = jd?.title ?? "未知岗位";
    const date = new Date().toISOString().slice(0, 10);
    return `优化简历 - ${title} - ${date}`;
  }, [jobs, selectedJd]);

  useEffect(() => {
    apiFetch(`${API}/resumes/${resumeId}`).then((r) => r.json()).then((j) => setResume(j.data));
    apiFetch(`${API}/jobs`).then((r) => r.json()).then((j) => { setJobs(j.data ?? []); });
    fetchHistory();
  }, [resumeId]);

  async function fetchHistory() {
    const res = await apiFetch(`${API}/analyze?resumeId=${resumeId}`);
    const json = await res.json();
    setHistory(json.data ?? []);
  }

  async function loadDetail(recordId: string) {
    setViewingHistoryId(recordId);
    const res = await apiFetch(`${API}/analyze/${recordId}`);
    const json = await res.json();
    if (json.success) {
      setResult(json.data);
      setStep("done");
      setShowHistory(false);
    }
  }

  async function startAnalyze() {
    if (!selectedJd) return;
    setError("");
    setStep("analyzing");
    try {
      const res = await apiFetch(`${API}/analyze`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId, jobDescriptionId: selectedJd }),
      });
      const json = await res.json();
      if (!json.success) {
        if (json.error?.code === "QUOTA_EXCEEDED") {
          setPointsNeeded(30); setCurrentBalance(json.error?.data?.balance ?? 0);
          setStep("idle"); setShowInsufficient(true); return;
        }
        setError(getErrorMessage(json)); setStep("idle"); return;
      }
      setResult(json.data);
      setStep("done");
      window.dispatchEvent(new Event("points-updated"));
      toast("分析完成", "success");
      await fetchHistory();
    } catch { setError("网络错误，请重试"); setStep("idle"); }
  }

  async function startGenerate() {
    if (!viewingHistoryId && !result) return;
    const recordId = viewingHistoryId || history[0]?.id;
    if (!recordId) return;
    setStep("generating"); setGeneratedMarkdown(""); setError("");
    try {
      const res = await apiFetch(`${API}/generate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId, analysisRecordId: recordId }),
      });
      const json = await res.json();
      if (!json.success) {
        if (json.error?.code === "QUOTA_EXCEEDED") {
          setPointsNeeded(50); setCurrentBalance(json.error?.data?.balance ?? 0);
          setStep("done"); setShowInsufficient(true); return;
        }
        setError(getErrorMessage(json)); setStep("done"); return;
      }
      setGeneratedMarkdown(json.data.markdown);
      setStep("done");
      window.dispatchEvent(new Event("points-updated"));
      toast("简历生成成功", "success");
      try {
        const jd = jobs.find((j) => j.id === selectedJd);
        const autoName = `优化简历 - ${jd?.title ?? "未知岗位"} - ${new Date().toISOString().slice(0, 10)}`;
        await apiFetch(`${API}/generated-resumes`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: autoName, content: json.data.markdown, resumeId, analysisRecordId: recordId }),
        });
      } catch {}
    } catch { setError("网络错误，请重试"); setStep("done"); }
  }

  async function copyMarkdown() { await navigator.clipboard.writeText(generatedMarkdown); toast("已复制到剪贴板", "success"); }

  async function exportPdf() {
    try {
      const res = await apiFetch(`${API}/export/pdf`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ markdown: generatedMarkdown }) });
      if (!res.ok) throw new Error("Export failed"); const blob = await res.blob();
      const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "resume.pdf"; a.click(); URL.revokeObjectURL(url); toast("PDF 已导出", "success");
    } catch { toast("PDF 导出失败", "error"); }
  }

  async function exportDocx() {
    try {
      const res = await apiFetch(`${API}/export/docx`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ markdown: generatedMarkdown }) });
      if (!res.ok) throw new Error("Export failed"); const blob = await res.blob();
      const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "resume.docx"; a.click(); URL.revokeObjectURL(url); toast("DOCX 已导出", "success");
    } catch { toast("DOCX 导出失败", "error"); }
  }

  function openSaveDialog() { setSaveName(defaultSaveName); setSaveError(""); setShowSaveDialog(true); }

  async function handleSave() {
    if (!saveName.trim()) { setSaveError("请输入名称"); return; }
    setSaving(true); setSaveError("");
    try {
      const res = await apiFetch(`${API}/generated-resumes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: saveName.trim(), content: generatedMarkdown }) });
      const json = await res.json();
      if (!json.success) { setSaveError(json.error?.message ?? "保存失败"); return; }
      toast("保存成功", "success"); router.push("/dashboard");
    } catch { setSaveError("网络错误，请重试"); } finally { setSaving(false); }
  }

  const selectedJdItem = jobs.find(j => j.id === selectedJd);

  if (!resume) {
    return <div className="p-8 space-y-4">{[1,2,3].map(i => <div key={i} className="h-6 bg-[#F5F4F2] rounded animate-pulse w-3/4" style={{animationDelay:`${i*100}ms`}} />)}</div>;
  }

  return (
    <div className="animate-[slideUp_300ms_ease-out] space-y-6">
      {/* ── Top bar: resume + JD + action ── */}
      <div>
        <button onClick={() => router.push(`/resumes/${resumeId}`)} className="text-sm text-[#9E9E9E] hover:text-[#2D2D2D] flex items-center gap-1 mb-2 transition-colors">
          <ChevronLeft size={14} />返回编辑
        </button>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-[#1A1A1A] truncate">
              分析：{resume.fileNameOriginal}
            </h2>
            <p className="text-sm text-[#6B6B6B] mt-0.5">
              {selectedJdItem ? `目标岗位：${selectedJdItem.title}${selectedJdItem.company ? ` · ${selectedJdItem.company}` : ""}` : "请选择目标岗位"}
            </p>
          </div>
          {history.length > 0 && (
            <Button variant="secondary" size="sm" icon={<History size={14} />} onClick={() => setShowHistory(!showHistory)}>
              历史 ({history.length})
            </Button>
          )}
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-[#C75B5B]/10 rounded-lg text-sm text-[#C75B5B]">
          <AlertCircle size={16} />{error}
          <button onClick={() => setError("")} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* ── History panel (collapsible) ── */}
      {showHistory && history.length > 0 && (
        <div className="bg-white border border-[#EBEBEB] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-[#6B6B6B]">历史分析</h3>
            <button onClick={() => setShowHistory(false)} className="text-[#9E9E9E] hover:text-[#2D2D2D]"><X size={14} /></button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {history.map((item) => (
              <button key={item.id} onClick={() => loadDetail(item.id)}
                className={`text-left p-3 rounded-lg border transition-all duration-200 active:scale-[0.99]
                  ${viewingHistoryId === item.id ? "border-[#B75C3A] bg-[#B75C3A]/5" : "border-[#EBEBEB] hover:border-[#D4D4D4]"}`}>
                <div className="flex justify-between gap-2">
                  <div className="min-w-0"><div className="text-sm font-medium truncate">{item.jdTitle}</div>
                    {item.jdCompany && <div className="text-xs text-[#9E9E9E]">{item.jdCompany}</div>}</div>
                  <div className="text-right shrink-0"><span className="text-lg font-bold text-[#B75C3A]">{item.matchScore}</span><span className="text-xs text-[#9E9E9E]">分</span></div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Step 1: Select JD & Analyze (always visible when no result) ── */}
      {!result && step !== "analyzing" && (
        <div className="p-6 bg-white border border-[#EBEBEB] rounded-xl space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-[#2D2D2D]">
            <Target size={18} className="text-[#B75C3A]" />选择目标岗位
          </div>
          {jobs.length === 0 ? (
            <div className="text-sm text-[#9E9E9E] py-4 text-center">
              还没有 JD — <a href="/jobs" className="text-[#B75C3A] hover:underline font-medium">去创建一个</a>
            </div>
          ) : (
            <div className="space-y-2">
              {jobs.map((j) => (
                <label key={j.id} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all
                  ${selectedJd === j.id ? "border-[#B75C3A] bg-[#B75C3A]/5" : "border-[#EBEBEB] hover:border-[#D4D4D4]"}`}>
                  <input type="radio" name="jd" value={j.id} checked={selectedJd === j.id} onChange={() => setSelectedJd(j.id)} className="accent-[#B75C3A]" />
                  <div><div className="text-sm font-medium">{j.title}</div>{j.company && <div className="text-xs text-[#9E9E9E]">{j.company}</div>}</div>
                </label>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3 pt-2 border-t border-[#EBEBEB]">
            <Button variant="primary" icon={<BarChart3 size={16} />} loading={step === "analyzing"} disabled={!selectedJd} onClick={startAnalyze}>
              AI 分析 · 消耗 30 积分
            </Button>
            {!selectedJd && <span className="text-xs text-[#9E9E9E]">请先选择目标岗位</span>}
          </div>
        </div>
      )}

      {/* ── Analyzing ── */}
      {step === "analyzing" && (
        <div className="p-8 bg-white border border-[#EBEBEB] rounded-xl text-center space-y-4">
          <div className="w-10 h-10 border-2 border-[#B75C3A] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-[#6B6B6B]">AI 正在分析中，请稍候...</p>
        </div>
      )}

      {/* ── Results ── */}
      {result && step === "done" && (
        <div className="space-y-6">
          {/* Score + Summary */}
          <div className="bg-white border border-[#EBEBEB] rounded-xl p-6">
            <div className="flex items-start gap-6">
              <div className="shrink-0 text-center">
                <div className="text-5xl font-bold text-[#B75C3A]">{result.matchScore}</div>
                <div className="text-xs text-[#9E9E9E] mt-1">/ 100 分</div>
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-[#1A1A1A] mb-1">匹配度评估</h3>
                <p className="text-sm text-[#6B6B6B] leading-relaxed">
                  {result.matchSummary || `你的简历覆盖了该岗位 ${result.matchScore}% 的核心需求`}
                </p>
                <div className="flex items-center gap-4 mt-3 text-xs">
                  {selectedJdItem && <span className="text-[#6B6B6B]">岗位：{selectedJdItem.title}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* JD Core */}
          <div className="bg-white border border-[#EBEBEB] rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 p-4 border-b border-[#EBEBEB] bg-[#FAFAF9]">
              <Target size={16} className="text-[#B75C3A]" /><span className="text-sm font-medium">岗位核心要求</span>
            </div>
            <div className="p-4 grid gap-2 sm:grid-cols-2">
              {result.jdCoreDecoding?.map((item, i) => (
                <div key={i} className="p-3 bg-[#F5F4F2] rounded-lg text-sm">
                  <div className="font-medium text-[#2D2D2D]">{item.core}</div>
                  <div className="text-xs text-[#6B6B6B] mt-1">隐性考察：{item.hidden}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 优化建议 — task list */}
          <div className="bg-white border border-[#EBEBEB] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#EBEBEB] bg-[#FAFAF9]">
              <div className="flex items-center gap-2">
                <Lightbulb size={16} className="text-[#C7953A]" /><span className="text-sm font-medium">优化操作清单</span>
              </div>
              <span className="text-xs text-[#9E9E9E]">
                {Object.values(suggestionStatus).filter(s => s === "applied").length}/{result.optimizationSuggestions?.length ?? 0} 已应用
              </span>
            </div>
            <div className="divide-y divide-[#EBEBEB]">
              {result.optimizationSuggestions?.map((item, i) => {
                const status = suggestionStatus[i] || "pending";
                return (
                  <div key={i} className={`p-4 transition-colors ${status === "applied" ? "bg-[#5B8C5A]/5" : status === "ignored" ? "bg-[#F5F4F2]/50" : ""}`}>
                    <div className="flex items-start gap-3">
                      {/* Priority badge */}
                      <div className="shrink-0 mt-0.5">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
                          ${item.action === "add" ? "bg-[#5B8C5A] text-white" : item.action === "delete" ? "bg-[#C75B5B] text-white" : "bg-[#C7953A] text-white"}`}>
                          {i + 1}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-medium text-[#2D2D2D]">{item.target}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            item.action === "add" ? "bg-[#5B8C5A]/10 text-[#5B8C5A]" :
                            item.action === "delete" ? "bg-[#C75B5B]/10 text-[#C75B5B]" :
                            "bg-[#C7953A]/10 text-[#C7953A]"}`}>
                            {item.action === "add" ? "新增" : item.action === "delete" ? "删除" : "修改"}
                          </span>
                          {status !== "pending" && (
                            <span className={`text-xs ${status === "applied" ? "text-[#5B8C5A]" : "text-[#9E9E9E]"}`}>
                              · {status === "applied" ? "已应用" : "已忽略"}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#6B6B6B] mb-2">{item.detail}</p>
                        {item.example && (
                          <div className="p-2 bg-[#FAFAF9] rounded text-xs text-[#6B6B6B] mb-2 font-mono break-all">
                            {item.example}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          {item.example && (
                            <button onClick={() => { navigator.clipboard.writeText(item.example); toast("示例已复制", "success"); }}
                              className="text-xs text-[#B75C3A] hover:text-[#9A4E31] flex items-center gap-1">
                              <Copy size={12} />复制示例
                            </button>
                          )}
                          {status === "pending" && (
                            <>
                              <button onClick={() => setSuggestionStatus(p => ({...p, [i]: "applied"}))}
                                className="text-xs text-[#5B8C5A] hover:text-[#3D6E3D] flex items-center gap-1">
                                <Check size={12} />标记已应用
                              </button>
                              <button onClick={() => setSuggestionStatus(p => ({...p, [i]: "ignored"}))}
                                className="text-xs text-[#9E9E9E] hover:text-[#6B6B6B] flex items-center gap-1">
                                <X size={12} />忽略
                              </button>
                            </>
                          )}
                          {status !== "pending" && (
                            <button onClick={() => setSuggestionStatus(p => ({...p, [i]: "pending"}))}
                              className="text-xs text-[#6B6B6B] hover:text-[#2D2D2D] flex items-center gap-1">
                              <RefreshCw size={12} />重置
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 排雷清单 — with risk levels */}
          {result.detailChecklist && result.detailChecklist.length > 0 && (
            <div className="bg-white border border-[#EBEBEB] rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 p-4 border-b border-[#EBEBEB] bg-[#FAFAF9]">
                <ShieldAlert size={16} className="text-[#C75B5B]" /><span className="text-sm font-medium">细节排雷</span>
              </div>
              <div className="divide-y divide-[#EBEBEB]">
                {result.detailChecklist.map((item, i) => {
                  const isDelete = item.type === "delete";
                  const risk = isDelete ? "high" : "medium";
                  return (
                    <div key={i} className="flex items-start gap-3 p-3 text-sm">
                      <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded font-medium ${
                        risk === "high" ? "bg-red-100 text-[#C75B5B]" : "bg-amber-100 text-[#C7953A]"}`}>
                        {risk === "high" ? "高风险" : "中风险"}
                      </span>
                      <div className="min-w-0">
                        <span className="text-[#9E9E9E]">{item.location}：</span>
                        <span className="text-[#2D2D2D]">{item.content}</span>
                      </div>
                      {/* Email formats get extra emphasis */}
                      {isDelete && (
                        <span className="shrink-0 px-1.5 py-0.5 text-xs bg-red-50 text-[#C75B5B] rounded font-medium">必须改</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Generate button (natural next step) ── */}
          {!generatedMarkdown && (
            <div className="flex justify-center pt-2">
              <Button variant="primary" size="lg" icon={<Sparkles size={18} />} onClick={startGenerate}>
                生成优化简历 · 消耗 50 积分
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Generating ── */}
      {step === "generating" && !generatedMarkdown && (
        <div className="p-8 bg-white border border-[#EBEBEB] rounded-xl text-center space-y-4">
          <div className="w-10 h-10 border-2 border-[#B75C3A] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-[#6B6B6B]">AI 正在生成简历，请稍候...</p>
        </div>
      )}

      {/* ── Generated markdown ── */}
      {generatedMarkdown && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[#1A1A1A]">生成的简历</h3>
            <div className="flex gap-2">
              {collapsed ? (
                <Button variant="secondary" size="sm" icon={<ChevronDown size={14} />} onClick={() => setCollapsed(false)}>展开</Button>
              ) : (
                <>
                  <Button variant="primary" size="sm" icon={<Check size={14} />} onClick={openSaveDialog}>确认</Button>
                  <Button variant="secondary" size="sm" icon={<Copy size={14} />} onClick={copyMarkdown}>复制</Button>
                  <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={exportPdf}>PDF</Button>
                  <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={exportDocx}>DOCX</Button>
                  <Button variant="ghost" size="sm" onClick={() => setCollapsed(true)}>收起</Button>
                </>
              )}
            </div>
          </div>
          {!collapsed && (
            <div data-color-mode="light" className="rounded-xl overflow-hidden border border-[#EBEBEB]">
              <MDEditor value={generatedMarkdown} onChange={(v) => setGeneratedMarkdown(v || "")} height={600} visibleDragbar={false} />
            </div>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      {showInsufficient && <InsufficientPoints needed={pointsNeeded} current={currentBalance} onClose={() => setShowInsufficient(false)} />}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => !saving && setShowSaveDialog(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[#1A1A1A] mb-4">保存简历</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-[#2D2D2D] mb-1">名称</label>
                <input type="text" value={saveName} onChange={(e) => { setSaveName(e.target.value); setSaveError(""); }}
                  className="w-full px-3 py-2 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#B75C3A]/30 focus:border-[#B75C3A]" placeholder="输入简历名称" disabled={saving} autoFocus />
                {saveError && <p className="text-xs text-[#C75B5B] mt-1">{saveError}</p>}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="secondary" size="sm" onClick={() => setShowSaveDialog(false)} disabled={saving}>取消</Button>
              <Button variant="primary" size="sm" loading={saving} onClick={handleSave}>确认保存</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
