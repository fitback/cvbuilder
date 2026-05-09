"use client";

import { useEffect, useState } from "react";
import { JobDescriptionItem } from "@cvbuilder/shared";
import { apiFetch } from "../../lib/auth";

const API = "http://localhost:3001";

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobDescriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  async function fetchJobs() {
    try {
      const res = await apiFetch(`${API}/jobs`);
      const json = await res.json();
      setJobs(json.data ?? []);
      setError("");
    } catch {
      setError("加载失败，请刷新重试");
    }
  }

  useEffect(() => { fetchJobs().finally(() => setLoading(false)); }, []);

  async function createJob(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await apiFetch(`${API}/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ title, company: company || undefined, content }),
    });
    setSaving(false);
    setShowForm(false);
    setTitle("");
    setCompany("");
    setContent("");
    fetchJobs();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">我的 JD</h2>
        <button onClick={() => setShowForm(!showForm)} className="px-5 py-2.5 bg-accent text-white rounded text-sm font-medium hover:bg-accent-hover transition-colors">
          新建 JD
        </button>
      </div>

      {showForm && (
        <form onSubmit={createJob} className="mb-6 p-6 bg-surface border border-border-light rounded-md space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">职位名称 *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full px-3 py-2 border border-border rounded text-sm focus:border-accent focus:ring-2 focus:ring-accent/15 outline-none" placeholder="如：高级前端工程师" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">公司名称</label>
            <input value={company} onChange={(e) => setCompany(e.target.value)} className="w-full px-3 py-2 border border-border rounded text-sm focus:border-accent focus:ring-2 focus:ring-accent/15 outline-none" placeholder="选填" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">JD 正文 *</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} required rows={8} className="w-full px-3 py-2 border border-border rounded text-sm focus:border-accent focus:ring-2 focus:ring-accent/15 outline-none" placeholder="粘贴岗位描述的完整内容..." />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="px-5 py-2 bg-accent text-white rounded text-sm font-medium hover:bg-accent-hover disabled:opacity-40">
              {saving ? "保存中..." : "保存"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 border border-border rounded text-sm text-text-secondary hover:bg-surface-tertiary">
              取消
            </button>
          </div>
        </form>
      )}

      {error && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4 opacity-20">⚠️</div>
          <h3 className="text-lg font-semibold mb-2">加载失败</h3>
          <p className="text-sm text-text-secondary mb-6">{error}</p>
          <button onClick={() => window.location.reload()} className="px-5 py-2.5 bg-accent text-white rounded text-sm font-medium hover:bg-accent-hover transition-colors">
            重试
          </button>
        </div>
      )}

      {!error && loading ? (
        <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-16 bg-surface-tertiary rounded-md animate-pulse" />)}</div>
      ) : !error && jobs.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4 opacity-20">📋</div>
          <h3 className="text-lg font-semibold mb-2">还没有岗位描述</h3>
          <p className="text-sm text-text-secondary">创建你的第一个岗位描述，开始匹配分析</p>
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map((j) => (
            <div key={j.id} className="flex justify-between items-center p-4 bg-surface border border-border-light rounded-md">
              <div>
                <div className="text-sm font-medium">{j.title}{j.company ? ` · ${j.company}` : ""}</div>
                <div className="text-xs text-text-muted mt-1">创建于 {new Date(j.createdAt).toLocaleDateString("zh-CN")}</div>
              </div>
              <button onClick={async () => {
                await apiFetch(`${API}/jobs/${j.id}`, { method: "DELETE", credentials: "include" });
                fetchJobs();
              }} className="px-3 py-1.5 text-xs text-text-muted hover:text-error">删除</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}