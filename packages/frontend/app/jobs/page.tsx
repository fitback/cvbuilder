"use client";

import { useEffect, useState } from "react";
import { JobDescriptionItem } from "@cvbuilder/shared";
import { Button } from "../../components/Button";
import { Briefcase, Plus, Trash2, AlertCircle, RefreshCw } from "../../components/icons";
import { useToast } from "../../components/Toast";
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
  const { toast } = useToast();

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
    try {
      await apiFetch(`${API}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title, company: company || undefined, content }),
      });
      toast("JD 创建成功", "success");
      setShowForm(false);
      setTitle("");
      setCompany("");
      setContent("");
      await fetchJobs();
    } catch {
      toast("创建失败，请重试", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, jobTitle: string) {
    try {
      await apiFetch(`${API}/jobs/${id}`, { method: "DELETE", credentials: "include" });
      toast(`已删除 "${jobTitle}"`, "success");
      await fetchJobs();
    } catch {
      toast("删除失败", "error");
    }
  }

  if (error && !loading) {
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

  return (
    <div className="animate-[slideUp_300ms_ease-out]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-[#1A1A1A]">我的 JD</h2>
          <p className="text-sm text-[#6B6B6B] mt-1">{jobs.length > 0 ? `共 ${jobs.length} 个岗位` : ""}</p>
        </div>
        <Button
          variant="primary"
          icon={showForm ? undefined : <Plus size={16} />}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "取消" : "新建 JD"}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={createJob}
          className="mb-6 p-6 bg-white border border-[#EBEBEB] rounded-xl space-y-4 animate-[slideUp_200ms_ease-out]"
        >
          <div>
            <label className="block text-sm font-medium text-[#2D2D2D] mb-1.5">职位名称 *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2.5 border border-[#D4D4D4] rounded-lg text-sm focus:border-[#B75C3A] focus:ring-2 focus:ring-[#B75C3A]/15 outline-none transition-all duration-150"
              placeholder="如：高级前端工程师"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#2D2D2D] mb-1.5">公司名称</label>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full px-3 py-2.5 border border-[#D4D4D4] rounded-lg text-sm focus:border-[#B75C3A] focus:ring-2 focus:ring-[#B75C3A]/15 outline-none transition-all duration-150"
              placeholder="选填"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#2D2D2D] mb-1.5">JD 正文 *</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={8}
              className="w-full px-3 py-2.5 border border-[#D4D4D4] rounded-lg text-sm focus:border-[#B75C3A] focus:ring-2 focus:ring-[#B75C3A]/15 outline-none transition-all duration-150 resize-y"
              placeholder="粘贴岗位描述的完整内容..."
            />
          </div>
          <div className="flex gap-3">
            <Button type="submit" loading={saving} disabled={!title || !content}>
              保存
            </Button>
            <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>
              取消
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-[#F5F4F2] rounded-lg animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Briefcase size={56} className="text-[#D4D4D4] mb-4" />
          <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">还没有岗位描述</h3>
          <p className="text-sm text-[#6B6B6B] mb-6">创建你的第一个岗位描述，开始匹配分析</p>
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setShowForm(true)}>
            新建 JD
          </Button>
        </div>
      ) : (
        <div className="space-y-1">
          {jobs.map((j) => (
            <div
              key={j.id}
              className="group flex items-center justify-between p-4 bg-white border border-[#EBEBEB] rounded-lg
                         transition-all duration-200 ease-out
                         hover:border-[#D4D4D4] hover:shadow-sm hover:-translate-y-[0.5px]
                         active:scale-[0.995]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="shrink-0 w-10 h-10 rounded-lg bg-[#F5F4F2] flex items-center justify-center
                            group-hover:bg-[#EBEBEB] transition-colors duration-200">
                  <Briefcase size={18} className="text-[#6B6B6B]" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[#2D2D2D] truncate max-w-[300px] md:max-w-[400px]">
                    {j.title}{j.company ? ` · ${j.company}` : ""}
                  </div>
                  <div className="text-xs text-[#9E9E9E] mt-0.5">创建于 {new Date(j.createdAt).toLocaleDateString("zh-CN")}</div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                icon={<Trash2 size={14} />}
                onClick={() => handleDelete(j.id, j.title)}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                aria-label={`删除 ${j.title}`}
              >
                删除
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
