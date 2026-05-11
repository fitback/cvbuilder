"use client";

import { useEffect, useState } from "react";
import { ResumeItem, JobDescriptionItem } from "@cvbuilder/shared";
import { apiFetch } from "../../lib/auth";
import RechargeApproval from "../../components/RechargeApproval";

const API = "http://localhost:3001";

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
  const [jobs, setJobs] = useState<JobDescriptionItem[]>([]);
  const [savedResumes, setSavedResumes] = useState<SavedResumeItem[]>([]);
  const [loading, setLoading] = useState({ resumes: true, jobs: true, saved: true });
  const [errors, setErrors] = useState({ resumes: "", jobs: "", saved: "" });
  const [viewingJd, setViewingJd] = useState<{ title: string; company?: string; content: string } | null>(null);

  useEffect(() => { fetchResumes(); fetchJobs(); fetchSavedResumes(); }, []);

  useEffect(() => {
    const hasParsing = resumes.some((r) => r.parseStatus === "parsing");
    if (!hasParsing) return;
    const timer = setInterval(() => fetchResumes(), 3000);
    return () => clearInterval(timer);
  }, [resumes]);

  async function fetchResumes() {
    try {
      const res = await apiFetch(`${API}/resumes`);
      const json = await res.json();
      if (json.success) setResumes(json.data ?? []);
    } catch {
      setErrors((e) => ({ ...e, resumes: "加载失败" }));
    } finally {
      setLoading((l) => ({ ...l, resumes: false }));
    }
  }

  async function fetchJobs() {
    try {
      const res = await apiFetch(`${API}/jobs`);
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
      const res = await apiFetch(`${API}/analyze/saved`);
      const json = await res.json();
      if (json.success) setSavedResumes(json.data ?? []);
    } catch {
      setErrors((e) => ({ ...e, saved: "加载失败" }));
    } finally {
      setLoading((l) => ({ ...l, saved: false }));
    }
  }

  async function deleteResume(id: string) {
    await apiFetch(`${API}/resumes/${id}`, { method: "DELETE" });
    await fetchResumes();
  }

  async function deleteJob(id: string) {
    await apiFetch(`${API}/jobs/${id}`, { method: "DELETE" });
    await fetchJobs();
  }

  async function viewJdDetail(jdId: string) {
    try {
      const res = await apiFetch(`${API}/jobs/${jdId}`);
      const json = await res.json();
      if (json.success) setViewingJd(json.data);
    } catch {}
  }

  const allEmpty = resumes.length === 0 && jobs.length === 0 && savedResumes.length === 0;
  const allLoaded = !loading.resumes && !loading.jobs && !loading.saved;

  if (allEmpty && allLoaded) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4 opacity-20">📄</div>
        <h3 className="text-lg font-semibold mb-2">欢迎使用 ResumeMatcher</h3>
        <p className="text-sm text-text-secondary mb-6">上传你的第一份简历，AI 帮你匹配理想岗位</p>
        <a href="/upload" className="inline-block px-5 py-2.5 bg-accent text-white rounded text-sm font-medium hover:bg-accent-hover transition-colors">
          上传简历
        </a>
      </div>
    );
  }

  return (
    <div>
      <RechargeApproval />

      {/* Section 1: Resumes */}
      <Section title="我的简历" count={resumes.length} href="/upload" actionLabel="上传">
        {loading.resumes ? (
          <Skeleton count={3} />
        ) : errors.resumes ? (
          <ErrorBlock message={errors.resumes} onRetry={fetchResumes} />
        ) : resumes.length === 0 ? (
          <EmptyHint>还没有上传简历 — <a href="/upload" className="text-accent underline">去上传</a></EmptyHint>
        ) : (
          <div className="space-y-0.5">
            {resumes.slice(0, 5).map((r) => (
              <ListItem key={r.id}>
                <div className="flex-1 min-w-0">
                  <span className="text-sm truncate">{r.fileNameOriginal}</span>
                  <span className="text-xs text-text-muted ml-2">
                    {r.parseStatus === "parsed" ? "解析完成" : r.parseStatus === "parsing" ? "解析中..." : "解析失败"}
                  </span>
                  {r.parseStatus === "parsed" && r.analysisCount > 0 && (
                    <span className="text-xs text-text-muted ml-1">· 已分析 {r.analysisCount} 次</span>
                  )}
                  <span className="text-xs text-text-muted ml-1">· {new Date(r.createdAt).toLocaleDateString("zh-CN")}</span>
                </div>
                <Actions>
                  {r.parseStatus === "parsed" && (
                    <a href={`/analyze/${r.id}`} className="px-3 py-1 text-xs text-accent hover:bg-accent/5 rounded transition-colors">分析</a>
                  )}
                  {r.parseStatus !== "parsing" && (
                    <button onClick={() => deleteResume(r.id)} className="px-3 py-1 text-xs text-text-muted hover:text-error transition-colors">删除</button>
                  )}
                </Actions>
              </ListItem>
            ))}
            {resumes.length > 5 && (
              <div className="text-xs text-text-muted px-3 py-1">还有 {resumes.length - 5} 份简历</div>
            )}
          </div>
        )}
      </Section>

      {/* Section 2: JDs */}
      <Section title="我的 JD" count={jobs.length} href="/jobs" actionLabel="创建">
        {loading.jobs ? (
          <Skeleton count={2} />
        ) : errors.jobs ? (
          <ErrorBlock message={errors.jobs} onRetry={fetchJobs} />
        ) : jobs.length === 0 ? (
          <EmptyHint>还没有创建 JD — <a href="/jobs" className="text-accent underline">去创建</a></EmptyHint>
        ) : (
          <div className="space-y-0.5">
            {jobs.slice(0, 5).map((j) => (
              <ListItem key={j.id}>
                <div className="flex-1 min-w-0">
                  <button onClick={() => viewJdDetail(j.id)} className="text-sm text-left hover:text-accent transition-colors truncate">
                    {j.title}
                  </button>
                  {j.company && <span className="text-xs text-text-muted ml-2">{j.company}</span>}
                  <span className="text-xs text-text-muted ml-1">· {new Date(j.createdAt).toLocaleDateString("zh-CN")}</span>
                </div>
                <Actions>
                  <button onClick={() => deleteJob(j.id)} className="px-3 py-1 text-xs text-text-muted hover:text-error transition-colors">删除</button>
                </Actions>
              </ListItem>
            ))}
            {jobs.length > 5 && (
              <div className="text-xs text-text-muted px-3 py-1">还有 {jobs.length - 5} 个 JD</div>
            )}
          </div>
        )}
      </Section>

      {/* Section 3: Saved Resumes */}
      <Section title="已保存的简历" count={savedResumes.length}>
        {loading.saved ? (
          <Skeleton count={2} />
        ) : errors.saved ? (
          <ErrorBlock message={errors.saved} onRetry={fetchSavedResumes} />
        ) : savedResumes.length === 0 ? (
          <EmptyHint>生成并保存简历后，会在这里显示</EmptyHint>
        ) : (
          <div className="space-y-0.5">
            {savedResumes.slice(0, 5).map((s) => (
              <ListItem key={s.analysisRecordId}>
                <div className="flex-1 min-w-0">
                  <a href={`/analyze/${s.resumeId}?record=${s.analysisRecordId}`} className="text-sm hover:text-accent transition-colors truncate">
                    {s.resumeFileName}
                  </a>
                  <span className="text-xs text-text-muted ml-2">→ {s.jdTitle}</span>
                  {s.jdCompany && <span className="text-xs text-text-muted ml-1">· {s.jdCompany}</span>}
                  <span className="text-xs text-text-muted ml-1">· 匹配 {s.matchScore}%</span>
                  <span className="text-xs text-text-muted ml-1">· {new Date(s.savedAt).toLocaleDateString("zh-CN")}</span>
                </div>
              </ListItem>
            ))}
            {savedResumes.length > 5 && (
              <div className="text-xs text-text-muted px-3 py-1">还有 {savedResumes.length - 5} 份简历</div>
            )}
          </div>
        )}
      </Section>

      {/* JD detail modal */}
      {viewingJd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setViewingJd(null)}>
          <div className="bg-surface rounded-lg p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">{viewingJd.title}</h3>
              <button onClick={() => setViewingJd(null)} className="text-text-muted hover:text-text-secondary text-lg leading-none">×</button>
            </div>
            {viewingJd.company && <p className="text-sm text-text-secondary mb-3">{viewingJd.company}</p>}
            <div className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed border-t border-border-light pt-3">{viewingJd.content}</div>
          </div>
        </div>
      )}
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
