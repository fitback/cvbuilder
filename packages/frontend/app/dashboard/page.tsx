"use client";

import { useEffect, useState } from "react";
import { ResumeItem, GeneratedResumeItem } from "@cvbuilder/shared";
import { Button } from "../../components/Button";
import { FileText, Upload, Trash2, ChevronRight, AlertCircle, RefreshCw } from "../../components/icons";
import { useToast } from "../../components/Toast";
import { apiFetch, API_BASE } from "../../lib/auth";

const API = API_BASE;

export default function DashboardPage() {
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [generatedResumes, setGeneratedResumes] = useState<GeneratedResumeItem[]>([]);
  const [jdCount, setJdCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const { toast } = useToast();

  const fetchResumes = async () => {
    try {
      const [res, genRes, jds] = await Promise.all([
        apiFetch(`${API}/resumes`),
        apiFetch(`${API}/generated-resumes`),
        apiFetch(`${API}/jobs`),
      ]);
      const json = await res.json();
      const genJson = await genRes.json();
      const jdJson = await jds.json();
      setResumes(json.data ?? []);
      setGeneratedResumes(genJson.data ?? []);
      setJdCount((jdJson.data ?? []).length);
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

  function confirmDelete(id: string, name: string) { setDeleteTarget({ id, name }); }

  async function handleDelete() {
    if (!deleteTarget) return;
    const { id, name } = deleteTarget;
    setDeleting(id); setDeleteTarget(null);
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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle size={48} className="text-[#C75B5B] mb-4 opacity-50" />
        <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">加载失败</h3>
        <p className="text-sm text-[#6B6B6B] mb-6">{error}</p>
        <Button variant="secondary" icon={<RefreshCw size={16} />} onClick={() => window.location.reload()}>重试</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="animate-[fadeIn_200ms_ease-out]">
        <div className="flex justify-between items-center mb-6">
          <div><div className="h-7 w-24 bg-[#F5F4F2] rounded animate-pulse" /><div className="h-4 w-16 bg-[#F5F4F2] rounded mt-2 animate-pulse" /></div>
          <div className="h-10 w-28 bg-[#F5F4F2] rounded-lg animate-pulse" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-[#F5F4F2] rounded-lg animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />)}
        </div>
      </div>
    );
  }

  function getStatusTag(r: ResumeItem) {
    const status = r.parseStatus;
    const count = (r as any).analysisCount ?? 0;
    const errMsg = (r as any).parseResult?.message;
    const stale = r.createdAt && (Date.now() - new Date(r.createdAt).getTime() > 2 * 60 * 1000);

    if (status === "parsed") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#5B8C5A]/10 text-[#5B8C5A] text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-[#5B8C5A]" />解析完成
          {count > 0 && <span className="opacity-60">· 已分析 {count} 次</span>}
        </span>
      );
    }
    if (status === "parsing") {
      return (
        <span className="inline-flex flex-col gap-0.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#C7953A]/10 text-[#C7953A] text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C7953A] animate-pulse" />解析中...
          </span>
          {stale && <span className="text-[11px] text-[#C75B5B]">已超过2分钟，可删除重新上传</span>}
        </span>
      );
    }
    return (
      <span className="inline-flex flex-col gap-0.5">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#C75B5B]/10 text-[#C75B5B] text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C75B5B]" />解析失败
        </span>
        {errMsg && <span className="text-[11px] text-[#C75B5B]/70 max-w-[280px] truncate">{errMsg}</span>}
      </span>
    );
  }

  return (
    <div className="animate-[slideUp_300ms_ease-out]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-[#1A1A1A]">我的简历</h2>
          <p className="text-sm text-[#6B6B6B] mt-1">
            共 {resumes.length} 份简历
            {resumes.filter((r) => r.parseStatus === "parsed").length > 0 && ` · ${resumes.filter((r) => r.parseStatus === "parsed").length} 份可分析`}
          </p>
        </div>
        <a href="/upload"><Button variant="primary" icon={<Upload size={16} />}>上传新简历</Button></a>
      </div>

      {(resumes.length === 0 || jdCount === 0) ? (
        <OnboardingGuide resumes={resumes.length} jds={jdCount} />
      ) : (
        <div className="flex items-center gap-3 mb-4">
          <a href={`/resumes/${resumes.find(r => r.parseStatus === "parsed")?.id ?? resumes[0]?.id}`}>
            <Button variant="primary" size="sm" icon={<FileText size={14} />}>开始分析</Button>
          </a>
          <span className="text-xs text-[#9E9E9E]">已有简历和 JD，可以开始匹配分析</span>
        </div>
      )}

      {resumes.length > 0 && (
        <div className="space-y-2">
          {resumes.map((r) => (
            <div key={r.id} className="group flex items-center justify-between p-4 bg-white border border-[#EBEBEB] rounded-lg transition-all duration-200 ease-out hover:border-[#D4D4D4] hover:shadow-sm hover:-translate-y-[1px] active:scale-[0.995]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="shrink-0 w-10 h-10 rounded-lg bg-[#F5F4F2] flex items-center justify-center group-hover:bg-[#EBEBEB] transition-colors duration-200">
                  <FileText size={18} className="text-[#6B6B6B]" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[#2D2D2D] truncate max-w-[300px] md:max-w-[400px]">{r.fileNameOriginal}</div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-[#9E9E9E]">{new Date(r.createdAt).toLocaleDateString("zh-CN")}</span>
                    {getStatusTag(r)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {r.parseStatus === "parsed" && (
                  <a href={`/resumes/${r.id}`}><Button variant="secondary" size="sm" icon={<FileText size={14} />}>解析</Button></a>
                )}
                <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} loading={deleting === r.id} onClick={() => confirmDelete(r.id, r.fileNameOriginal ?? "未命名")} className="opacity-0 group-hover:opacity-100 transition-opacity duration-200" aria-label={`删除 ${r.fileNameOriginal}`}>删除</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pt-8">
        <div className="flex justify-between items-center mb-4">
          <div><h3 className="text-lg font-semibold text-[#1A1A1A]">生成的简历</h3><p className="text-sm text-[#6B6B6B] mt-0.5">共 {generatedResumes.length} 份</p></div>
        </div>
        {generatedResumes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 border border-dashed border-[#D4D4D4] rounded-xl">
            <FileText size={48} className="text-[#D4D4D4] mb-3" />
            <h3 className="text-base font-medium text-[#1A1A1A] mb-1">还没有生成的简历</h3>
            <p className="text-sm text-[#6B6B6B] mb-4">完成分析后，使用 AI 生成优化简历</p>
            <a href="/upload"><Button variant="secondary" size="sm" icon={<Upload size={14} />}>上传简历开始</Button></a>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {generatedResumes.map((r) => (
              <a key={r.id} href={`/generated/${r.id}`} className="block p-4 bg-white border border-[#EBEBEB] rounded-lg transition-all duration-200 ease-out hover:border-[#D4D4D4] hover:shadow-sm hover:-translate-y-[1px] active:scale-[0.995]">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><div className="text-sm font-medium text-[#2D2D2D] truncate">{r.name}</div><div className="text-xs text-[#9E9E9E] mt-1">{new Date(r.createdAt).toLocaleDateString("zh-CN")}</div></div>
                  <ChevronRight size={16} className="shrink-0 text-[#D4D4D4] mt-0.5" />
                </div>
                {r.snippet && <p className="text-xs text-[#6B6B6B] mt-2 line-clamp-2 leading-relaxed">{r.snippet}</p>}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">确认删除</h3>
            <p className="text-sm text-[#6B6B6B] mb-6">确定要删除「{deleteTarget.name}」吗？此操作不可撤销。</p>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(null)}>取消</Button>
              <Button variant="danger" size="sm" icon={<Trash2 size={14} />} loading={deleting !== null} onClick={handleDelete}>确认删除</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OnboardingGuide({ resumes, jds }: { resumes: number; jds: number }) {
  const step = resumes === 0 ? 1 : jds === 0 ? 2 : 3;

  return (
    <div className="bg-white border-2 border-dashed border-[#D4D4D4] rounded-2xl p-8 md:p-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#B75C3A]/10 flex items-center justify-center mx-auto mb-5">
        <FileText size={32} className="text-[#B75C3A]" />
      </div>

      <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">
        {step === 1 ? "开始优化你的简历" : "下一步：创建目标岗位"}
      </h3>
      <p className="text-sm text-[#6B6B6B] mb-8 max-w-md mx-auto">
        {step === 1
          ? "上传简历，AI 自动提取你的工作经历和技能"
          : "粘贴目标岗位的 JD，AI 帮你分析匹配度并给出优化建议"}
      </p>

      {/* 3-step indicator */}
      <div className="flex items-center justify-center gap-6 md:gap-10 mb-8">
        <div className="flex flex-col items-center gap-2">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300
            ${step > 1 ? "bg-[#5B8C5A] text-white" : "bg-[#B75C3A] text-white ring-4 ring-[#B75C3A]/20"}`}>
            {step > 1 ? "✓" : "1"}
          </div>
          <span className="text-xs text-[#2D2D2D] font-medium">上传简历</span>
        </div>

        <div className="w-12 h-px bg-[#EBEBEB] self-start mt-5" />

        <div className="flex flex-col items-center gap-2">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300
            ${step > 2 ? "bg-[#5B8C5A] text-white"
              : step === 2 ? "bg-[#B75C3A] text-white ring-4 ring-[#B75C3A]/20"
              : "bg-[#F5F4F2] text-[#D4D4D4]"}`}>
            {step > 2 ? "✓" : "2"}
          </div>
          <span className={`text-xs ${step >= 2 ? "text-[#2D2D2D] font-medium" : "text-[#9E9E9E]"}`}>创建岗位</span>
        </div>

        <div className="w-12 h-px bg-[#EBEBEB] self-start mt-5" />

        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold bg-[#F5F4F2] text-[#D4D4D4]">3</div>
          <span className="text-xs text-[#9E9E9E]">开始分析</span>
        </div>
      </div>

      {/* Primary CTA */}
      <a href={step === 1 ? "/upload" : "/jobs"}>
        <Button variant="primary" size="lg" icon={<Upload size={18} />}>
          {step === 1 ? "上传第一份简历" : "创建目标岗位"}
        </Button>
      </a>
    </div>
  );
}
