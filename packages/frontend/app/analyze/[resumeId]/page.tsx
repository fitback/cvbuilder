"use client";

import { useEffect, useState, use } from "react";
import MDEditor from "@uiw/react-md-editor";
import { JobDescriptionItem, AnalysisResult, ResumeDetail, AnalysisHistoryItem } from "@cvbuilder/shared";
import { apiFetch } from "../../../lib/auth";

const API = "http://localhost:3001";

export default function AnalyzePage({ params }: { params: Promise<{ resumeId: string }> }) {
  const { resumeId } = use(params);
  const [resume, setResume] = useState<ResumeDetail | null>(null);
  const [jobs, setJobs] = useState<JobDescriptionItem[]>([]);
  const [selectedJd, setSelectedJd] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [viewingHistoryId, setViewingHistoryId] = useState<string | null>(null);
  const [generatedMarkdown, setGeneratedMarkdown] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    apiFetch(`${API}/resumes/${resumeId}`).then((r) => r.json()).then((j) => setResume(j.data));
    apiFetch(`${API}/jobs`).then((r) => r.json()).then((j) => setJobs(j.data ?? []));
    fetchHistory();
  }, [resumeId]);

  async function fetchHistory() {
    const res = await apiFetch(`${API}/analyze?resumeId=${resumeId}`);
    const json = await res.json();
    const items: AnalysisHistoryItem[] = json.data ?? [];
    setHistory(items);
    if (items.length > 0 && !viewingHistoryId) {
      loadDetail(items[0].id);
    }
  }

  async function loadDetail(recordId: string) {
    setViewingHistoryId(recordId);
    const res = await apiFetch(`${API}/analyze/${recordId}`);
    const json = await res.json();
    if (json.success) {
      setResult(json.data);
    }
  }

  async function startAnalyze() {
    if (!selectedJd) return;
    setError("");
    setAnalyzing(true);

    try {
      const res = await apiFetch(`${API}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ resumeId, jobDescriptionId: selectedJd }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "分析失败");
        return;
      }
      setResult(json.data);
      setRemaining(json.data.remainingFreeCount);
      await fetchHistory();
    } catch {
      setError("网络错误，请重试");
    } finally {
      setAnalyzing(false);
    }
  }

  async function startGenerate() {
    if (!viewingHistoryId) return;
    setGenerating(true);
    setGeneratedMarkdown("");
    setError("");
    try {
      const res = await apiFetch(`${API}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ resumeId, analysisRecordId: viewingHistoryId }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "生成失败");
        return;
      }
      setGeneratedMarkdown(json.data.markdown);
    } catch {
      setError("网络错误，请重试");
    } finally {
      setGenerating(false);
    }
  }

  async function copyMarkdown() {
    await navigator.clipboard.writeText(generatedMarkdown);
  }

  async function exportPdf() {
    try {
      const res = await apiFetch(`${API}/export/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown: generatedMarkdown }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "resume.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("PDF 导出失败");
    }
  }

  if (!resume) return <div className="p-8 text-text-muted text-sm">加载中...</div>;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-1">分析简历</h2>
      <p className="text-sm text-text-secondary mb-6">{resume.fileNameOriginal}</p>

      {history.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-3 text-text-secondary">历史分析</h3>
          <div className="space-y-2">
            {history.map((item) => (
              <button
                key={item.id}
                onClick={() => loadDetail(item.id)}
                className={`w-full text-left p-4 rounded-md border transition-colors ${
                  viewingHistoryId === item.id
                    ? "border-accent bg-accent/5"
                    : "border-border-light bg-surface hover:border-text-muted"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm font-medium">{item.jdTitle}</div>
                    {item.jdCompany && <div className="text-xs text-text-muted">{item.jdCompany}</div>}
                  </div>
                  <div className="text-right">
                    <div className="font-[family-name:var(--font-display)] text-2xl font-bold text-accent">{item.matchScore}</div>
                    <div className="text-xs text-text-muted">{new Date(item.createdAt).toLocaleDateString("zh-CN")}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {result && (
        <div className="mt-4">
          <div className="text-center py-8">
            <div className="font-[family-name:var(--font-display)] text-7xl font-bold text-accent">{result.matchScore}</div>
            <div className="text-sm text-text-secondary mt-2">匹配度分数</div>
            <p className="text-sm text-text-primary mt-4 max-w-md mx-auto">{result.matchSummary || `你的简历覆盖了该岗位 ${result.matchScore}% 的核心需求`}</p>
          </div>

          <div className="mt-4 space-y-3">
            <details open className="bg-surface border border-border-light rounded-md">
              <summary className="p-4 text-sm font-medium cursor-pointer">JD 核心解码</summary>
              <div className="px-4 pb-4 space-y-3">
                {result.jdCoreDecoding?.map((item, i) => (
                  <div key={i} className="p-3 bg-surface-tertiary rounded">
                    <div className="text-sm font-medium">{item.core}</div>
                    <div className="text-xs text-text-secondary mt-1">隐性考察：{item.hidden}</div>
                  </div>
                ))}
              </div>
            </details>

            <details open className="bg-surface border border-border-light rounded-md">
              <summary className="p-4 text-sm font-medium cursor-pointer">优化建议</summary>
              <div className="px-4 pb-4 space-y-3">
                {result.optimizationSuggestions?.map((item, i) => (
                  <div key={i} className="p-3 bg-surface-tertiary rounded">
                    <div className="text-sm font-medium">{item.target} — <span className="text-accent">{item.action === "add" ? "新增" : item.action === "modify" ? "修改" : "删除"}</span></div>
                    <div className="text-xs text-text-secondary mt-1">{item.detail}</div>
                    <div className="text-xs text-text-muted mt-1 italic">示例：{item.example}</div>
                  </div>
                ))}
              </div>
            </details>

            <details open className="bg-surface border border-border-light rounded-md">
              <summary className="p-4 text-sm font-medium cursor-pointer">排雷清单</summary>
              <div className="px-4 pb-4 space-y-2">
                {result.detailChecklist?.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${item.type === "delete" ? "bg-red-50 text-error" : "bg-amber-50 text-warning"}`}>
                      {item.type === "delete" ? "删除" : "修改"}
                    </span>
                    <div>
                      <span className="text-text-muted">{item.location}：</span>
                      {item.content}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          </div>

          {!generatedMarkdown && (
            <div className="mt-4 flex justify-center">
              <button onClick={startGenerate} disabled={generating} className="px-5 py-2.5 bg-accent text-white rounded text-sm font-medium hover:bg-accent-hover disabled:opacity-40 transition-colors">
                {generating ? "生成中..." : "✨ 生成优化简历"}
              </button>
            </div>
          )}
        </div>
      )}

      {generating && (
        <div className="mt-6 p-8 bg-surface border border-border-light rounded-md text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-text-secondary">AI 正在生成简历，请稍候...</p>
        </div>
      )}

      {generatedMarkdown && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">生成的简历</h3>
            <div className="flex gap-2">
              <button onClick={copyMarkdown} className="px-3 py-1.5 border border-border rounded text-xs text-text-secondary hover:bg-surface-tertiary transition-colors">
                复制
              </button>
              <button onClick={exportPdf} className="px-3 py-1.5 border border-border rounded text-xs text-text-secondary hover:bg-surface-tertiary transition-colors">
                导出 PDF
              </button>
              <button onClick={() => setGeneratedMarkdown("")} className="px-3 py-1.5 text-xs text-text-muted hover:text-error transition-colors">
                收起
              </button>
            </div>
          </div>
          <div data-color-mode="light">
            <MDEditor value={generatedMarkdown} onChange={(v) => setGeneratedMarkdown(v || "")} height={600} visibleDragbar={false} />
          </div>
        </div>
      )}

      <div className="mt-6 p-6 bg-surface border border-border-light rounded-md">
        <label className="block text-sm font-medium mb-2">选择目标岗位</label>
        {jobs.length === 0 ? (
          <div className="text-sm text-text-muted">
            还没有 JD — <a href="/jobs" className="text-accent underline">去创建一个</a>
          </div>
        ) : (
          <div className="space-y-3 mb-4">
            {jobs.map((j) => (
              <label key={j.id} className={`flex items-center gap-3 p-3 border rounded cursor-pointer transition-colors ${selectedJd === j.id ? "border-accent bg-accent/5" : "border-border-light hover:border-text-muted"}`}>
                <input type="radio" name="jd" value={j.id} checked={selectedJd === j.id} onChange={() => setSelectedJd(j.id)} className="accent-accent" />
                <div>
                  <div className="text-sm font-medium">{j.title}</div>
                  {j.company && <div className="text-xs text-text-muted">{j.company}</div>}
                </div>
              </label>
            ))}
          </div>
        )}
        <button onClick={startAnalyze} disabled={!selectedJd || analyzing} className="px-5 py-2.5 bg-accent text-white rounded text-sm font-medium hover:bg-accent-hover disabled:opacity-40 transition-colors">
          {analyzing ? "分析中..." : "免费分析"}
        </button>
        {resume.freeAnalysisCount !== undefined && (
          <p className="text-xs text-text-muted mt-2">剩余免费分析 {resume.freeAnalysisCount} 次</p>
        )}
      </div>

      {analyzing && (
        <div className="mt-6 p-8 bg-surface border border-border-light rounded-md text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-text-secondary">AI 正在分析中，请稍候...</p>
          <div className="mt-6 space-y-3 max-w-md mx-auto">
            <div className="h-4 bg-surface-tertiary rounded animate-pulse w-3/4" />
            <div className="h-4 bg-surface-tertiary rounded animate-pulse w-1/2" />
            <div className="h-4 bg-surface-tertiary rounded animate-pulse w-2/3" />
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 text-error text-sm rounded-md flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => { setError(""); setResult(null); }} className="text-sm underline">重试</button>
        </div>
      )}
    </div>
  );
}
