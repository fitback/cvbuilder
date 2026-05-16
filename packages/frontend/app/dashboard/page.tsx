"use client";

import { useEffect, useState } from "react";
import { ResumeItem, GeneratedResumeItem } from "@cvbuilder/shared";
import { Button } from "../../components/Button";
import { FileText, Upload, Trash2, ChevronRight, AlertCircle, RefreshCw, Sparkles } from "../../components/icons";
import { useToast } from "../../components/Toast";
import { apiFetch } from "../../lib/auth";
import RechargeApproval from "../../components/RechargeApproval";


interface SavedResumeItem {
  analysisRecordId: string;
  resumeId: string;
  resumeFileName: string;
  jdTitle: string;
  jdCompany?: string;
  matchScore: number;
  savedAt: string;
}

export default function DashboardPage() {
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [generatedResumes, setGeneratedResumes] = useState<GeneratedResumeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchResumes = async () => {
    try {
      const [res, genRes] = await Promise.all([
        apiFetch(`${API}/resumes`),
        apiFetch(`${API}/generated-resumes`),
      ]);
      const json = await res.json();
      const genJson = await genRes.json();
      setResumes(json.data ?? []);
      setGeneratedResumes(genJson.data ?? []);
    } catch {
      setError("加载失败，请刷新重试");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchResumes(); }, []);

  useEffect(() => {
    const hasParsing = resumes.some((r) => r.parseStatus === "parsing");
    if (!hasParsing) return;
    const timer = setInterval(() => fetchResumes(), 3000);
    return () => clearInterval(timer);
  }, [resumes]);

  const handleDelete = async (id: string, name: string) => {
    setDeleting(id);
    try {
      await apiFetch(`${API}/resumes/${id}`, { method: "DELETE" });
      toast(`已删除 "${name}"`, "success");
      await fetchResumes();
    } catch {
      toast("删除失败，请重试", "error");
    } finally {
      setDeleting(null);
    }
  };

  async function fetchJobs() {
    try {
      const res = await apiFetch(`${API_BASE}/jobs`);
      const json = await res.json();
      if (json.success) setJobs(json.data ?? []);
    } catch {
      setErrors((e) => ({ ...e, jobs: "加载失败" }));
    } finally {
      setLoading((l) => ({ ...l, jobs: false }));
    }
  }

  async function fetchSavedResumes() {
    try {
      const res = await apiFetch(`${API_BASE}/analyze/saved`);
      const json = await res.json();
      if (json.success) setSavedResumes(json.data ?? []);
    } catch {
      setErrors((e) => ({ ...e, saved: "加载失败" }));
    } finally {
      setLoading((l) => ({ ...l, saved: false }));
    }
  }

  async function deleteResume(id: string) {
    await apiFetch(`${API_BASE}/resumes/${id}`, { method: "DELETE" });
    await fetchResumes();
  }

  async function deleteJob(id: string) {
    await apiFetch(`${API_BASE}/jobs/${id}`, { method: "DELETE" });
    await fetchJobs();
  }

  async function viewJdDetail(jdId: string) {
    try {
      const res = await apiFetch(`${API_BASE}/jobs/${jdId}`);
      const json = await res.json();
      if (json.success) setViewingJd(json.data);
    } catch {}
  }

  const allEmpty = resumes.length === 0 && jobs.length === 0 && savedResumes.length === 0;
  const allLoaded = !loading.resumes && !loading.jobs && !loading.saved;

  if (showAuth) {
    return <AuthModal onClose={() => setShowAuth(false)} onLogin={() => { setShowAuth(false); window.location.reload(); }} />;
  }

  if (allEmpty && allLoaded) {
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

  if (loading) {
    return (
      <div className="animate-[fadeIn_200ms_ease-out]">
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="h-7 w-24 bg-[#F5F4F2] rounded animate-pulse" />
            <div className="h-4 w-16 bg-[#F5F4F2] rounded mt-2 animate-pulse" />
          </div>
          <div className="h-10 w-28 bg-[#F5F4F2] rounded-lg animate-pulse" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-[#F5F4F2] rounded-lg animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  const getStatusTag = (status: string, count: number) => {
    if (status === "parsed") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#5B8C5A]/10 text-[#5B8C5A] text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-[#5B8C5A]" />
          解析完成
          {count > 0 && <span className="opacity-60">· 已分析 {count} 次</span>}
        </span>
      );
    }
    if (status === "parsing") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#C7953A]/10 text-[#C7953A] text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C7953A] animate-pulse" />
          解析中...
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#C75B5B]/10 text-[#C75B5B] text-xs">
        <span className="w-1.5 h-1.5 rounded-full bg-[#C75B5B]" />
        解析失败
      </span>
    );
  };

  return (
    <div className="animate-[slideUp_300ms_ease-out]">
      <RechargeApproval />
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-[#1A1A1A]">我的简历</h2>
          <p className="text-sm text-[#6B6B6B] mt-1">
            共 {resumes.length} 份简历
            {resumes.filter((r) => r.parseStatus === "parsed").length > 0 &&
              ` · ${resumes.filter((r) => r.parseStatus === "parsed").length} 份可分析`}
          </p>
        </div>
        <a href="/upload">
          <Button variant="primary" icon={<Upload size={16} />}>
            上传新简历
          </Button>
        </a>
      </div>

      {resumes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <FileText size={56} className="text-[#D4D4D4] mb-4" />
          <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">还没有上传简历</h3>
          <p className="text-sm text-[#6B6B6B] mb-6">上传你的第一份简历，AI 帮你匹配理想岗位</p>
          <a href="/upload">
            <Button variant="primary" icon={<Upload size={16} />}>
              上传简历
            </Button>
          </a>
        </div>
      ) : (
        <div className="space-y-2">
          {resumes.map((r) => (
            <div
              key={r.id}
              className="group flex items-center justify-between p-4 bg-white border border-[#EBEBEB] rounded-lg
                         transition-all duration-200 ease-out
                         hover:border-[#D4D4D4] hover:shadow-sm hover:-translate-y-[1px]
                         active:scale-[0.995]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="shrink-0 w-10 h-10 rounded-lg bg-[#F5F4F2] flex items-center justify-center
                            group-hover:bg-[#EBEBEB] transition-colors duration-200">
                  <FileText size={18} className="text-[#6B6B6B]" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[#2D2D2D] truncate max-w-[300px] md:max-w-[400px]">
                    {r.fileNameOriginal}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-[#9E9E9E]">
                      {new Date(r.createdAt).toLocaleDateString("zh-CN")}
                    </span>
                    {getStatusTag(r.parseStatus, (r as any).analysisCount ?? 0)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {r.parseStatus === "parsed" && (
                  <a href={`/analyze/${r.id}`}>
                    <Button variant="secondary" size="sm" icon={<Sparkles size={14} />}>
                      分析
                    </Button>
                  </a>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Trash2 size={14} />}
                  loading={deleting === r.id}
                  onClick={() => handleDelete(r.id, r.fileNameOriginal ?? "未命名")}
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  aria-label={`删除 ${r.fileNameOriginal}`}
                >
                  删除
                </Button>
              </div>
            </div>
            {viewingJd.company && <p className="text-sm text-text-secondary mb-3">{viewingJd.company}</p>}
            <div className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed border-t border-border-light pt-3">{viewingJd.content}</div>
          </div>
        </div>
      )}

      {/* Generated resumes */}
      <div className="pt-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold text-[#1A1A1A]">生成的简历</h3>
            <p className="text-sm text-[#6B6B6B] mt-0.5">
              共 {generatedResumes.length} 份
            </p>
          </div>
        </div>

        {generatedResumes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 border border-dashed border-[#D4D4D4] rounded-xl">
            <FileText size={48} className="text-[#D4D4D4] mb-3" />
            <h3 className="text-base font-medium text-[#1A1A1A] mb-1">还没有生成的简历</h3>
            <p className="text-sm text-[#6B6B6B] mb-4">完成分析后，使用 AI 生成优化简历</p>
            <a href="/upload">
              <Button variant="secondary" size="sm" icon={<Upload size={14} />}>
                上传简历开始
              </Button>
            </a>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {generatedResumes.map((r) => (
              <a
                key={r.id}
                href={`/generated/${r.id}`}
                className="block p-4 bg-white border border-[#EBEBEB] rounded-lg
                           transition-all duration-200 ease-out
                           hover:border-[#D4D4D4] hover:shadow-sm hover:-translate-y-[1px]
                           active:scale-[0.995]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[#2D2D2D] truncate">{r.name}</div>
                    <div className="text-xs text-[#9E9E9E] mt-1">
                      {new Date(r.createdAt).toLocaleDateString("zh-CN")}
                    </div>
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-[#D4D4D4] mt-0.5" />
                </div>
                {r.snippet && (
                  <p className="text-xs text-[#6B6B6B] mt-2 line-clamp-2 leading-relaxed">{r.snippet}</p>
                )}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- Sub-components ---- */

function Section({ title, count, href, actionLabel, children }: {
  title: string; count: number; href?: string; actionLabel?: string; children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{title}</h3>
          <span className="text-xs px-2 py-0.5 bg-surface-tertiary text-text-muted rounded-full">{count}</span>
        </div>
        {href && actionLabel && (
          <a href={href} className="text-xs text-accent hover:underline">{actionLabel}</a>
        )}
      </div>
      {children}
    </div>
  );
}

function ListItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center px-3 py-2 rounded hover:bg-surface-secondary transition-colors group">
      {children}
    </div>
  );
}

function Actions({ children }: { children: React.ReactNode }) {
  return (
    <div className="hidden group-hover:flex items-center gap-1 shrink-0 md:flex">
      {children}
    </div>
  );
}

function Skeleton({ count }: { count: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-9 bg-surface-tertiary rounded animate-pulse" />
      ))}
    </div>
  );
}

function ErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="text-sm text-error py-2 flex items-center gap-3">
      <span>{message}</span>
      <button onClick={onRetry} className="text-xs underline">重试</button>
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-text-muted py-2">{children}</p>;
}
