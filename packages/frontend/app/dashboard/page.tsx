"use client";

import { useEffect, useState } from "react";
import { ResumeItem } from "@cvbuilder/shared";
import { apiFetch } from "../../lib/auth";

const API = "http://localhost:3001";

export default function DashboardPage() {
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch(`${API}/resumes`)
      .then((r) => r.json())
      .then((j) => setResumes(j.data ?? []))
      .catch(() => setError("加载失败，请刷新重试"))
      .finally(() => setLoading(false));
  }, []);

  async function refreshResumes() {
    const res = await apiFetch(`${API}/resumes`);
    const json = await res.json();
    setResumes(json.data ?? []);
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4 opacity-20">⚠️</div>
        <h3 className="text-lg font-semibold mb-2">加载失败</h3>
        <p className="text-sm text-text-secondary mb-6">{error}</p>
        <button onClick={() => window.location.reload()} className="px-5 py-2.5 bg-accent text-white rounded text-sm font-medium hover:bg-accent-hover transition-colors">
          重试
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-surface-tertiary rounded-md animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold">我的简历</h2>
          <p className="text-sm text-text-secondary mt-1">{resumes.length} 份简历</p>
        </div>
        <a href="/upload" className="inline-block px-5 py-2.5 bg-accent text-white rounded text-sm font-medium hover:bg-accent-hover transition-colors">
          上传新简历
        </a>
      </div>

      {resumes.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4 opacity-20">📄</div>
          <h3 className="text-lg font-semibold mb-2">还没有上传简历</h3>
          <p className="text-sm text-text-secondary mb-6">上传你的第一份简历，AI 帮你匹配理想岗位</p>
          <a href="/upload" className="inline-block px-5 py-2.5 bg-accent text-white rounded text-sm font-medium hover:bg-accent-hover transition-colors">
            上传简历
          </a>
        </div>
      ) : (
        <div className="space-y-2">
          {resumes.map((r) => (
            <div key={r.id} className="flex justify-between items-center p-4 bg-surface border border-border-light rounded-md">
              <div>
                <div className="text-sm font-medium">{r.fileNameOriginal}</div>
                <div className="text-xs text-text-muted mt-1">
                  上传于 {new Date(r.createdAt).toLocaleDateString("zh-CN")} · {r.parseStatus === "parsed" ? "解析完成" : r.parseStatus === "parsing" ? "解析中..." : "解析失败"}{r.parseStatus === "parsed" && r.analysisCount > 0 && ` · 已分析 ${r.analysisCount} 次`}{r.parseStatus === "parsed" && ` · 剩余 ${r.freeAnalysisCount} 次`}
                </div>
              </div>
              <div className="flex gap-2">
                {r.parseStatus === "parsed" && (
                  <a href={`/analyze/${r.id}`} className="px-3 py-1.5 border border-border rounded text-xs text-text-secondary hover:bg-surface-tertiary">
                    分析
                  </a>
                )}
                <button onClick={async () => {
                  await apiFetch(`${API}/resumes/${r.id}`, { method: "DELETE" });
                  await refreshResumes();
                }} className="px-3 py-1.5 text-xs text-text-muted hover:text-error">
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}