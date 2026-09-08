"use client";

import { useEffect, useState, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { ResumeDetail, ParseResult } from "@cvbuilder/shared";
import { Button } from "../../../components/Button";
import VersionHistoryModal from "../../../components/VersionHistoryModal";
import {
  FileText, AlertCircle, RefreshCw, Check, Sparkles, Plus, Trash2, ChevronLeft, ChevronDown, ChevronRight, Columns, History, X,
} from "../../../components/icons";
import { useToast } from "../../../components/Toast";
import { apiFetch, API_BASE } from "../../../lib/auth";

const API = API_BASE;

const COLLAPSE_KEY = "resume-editor-collapsed";

function renderResumePreview(form: ParseResult): string {
  if (!form.name) return "";
  const { contact, summary, workExperience, projectExperience, education, skills } = form;
  const items = (arr: any[], key: string) => arr.map((i) => i[key]).filter(Boolean).join("、");
  const section = (title: string, body: string) =>
    body ? `<div style="margin-top:0.6cm"><h2 style="font-size:13pt;font-weight:600;margin-bottom:0.2cm;border-bottom:1px solid #D4D4D4;padding-bottom:0.1cm;color:#2D2D2D">${title}</h2>${body}</div>` : "";

  let html = `<div style="max-width:21cm;margin:0 auto;padding:1.5cm 2cm;font-family:'PingFang SC','Microsoft YaHei','Noto Sans SC',sans-serif;font-size:10.5pt;line-height:1.5;color:#2D2D2D">`;

  html += `<h1 style="font-size:22pt;font-weight:700;margin:0 0 0.2cm;color:#1A1A1A">${escHtml(form.name)}</h1>`;
  const contacts = [contact.phone, contact.email, contact.location].filter(Boolean);
  if (contacts.length) html += `<div style="font-size:9pt;color:#6B6B6B;margin-bottom:0.1cm">${contacts.map(escHtml).join(" · ")}</div>`;

  html += section("个人摘要", summary ? `<p style="margin:0.15cm 0;font-size:10pt;color:#4A4A4A">${escHtml(summary)}</p>` : "");

  if (workExperience.length) {
    let body = "";
    for (const w of workExperience) {
      body += `<div style="margin-top:0.3cm"><div style="display:flex;justify-content:space-between"><strong>${escHtml(w.company)}</strong><span style="color:#6B6B6B;font-size:9pt">${escHtml(w.duration)}</span></div>`;
      if (w.position) body += `<div style="font-size:9pt;color:#9E9E9E;margin:0.05cm 0">${escHtml(w.position)}</div>`;
      if (w.description) body += `<p style="margin:0.1cm 0;font-size:10pt;color:#4A4A4A">${escHtml(w.description)}</p>`;
      body += `</div>`;
    }
    html += section("工作经历", body);
  }

  // Project Experience
  if (projectExperience.length) {
    let body = "";
    for (const p of projectExperience) {
      body += `<div style="margin-top:0.3cm"><div style="display:flex;justify-content:space-between"><strong>${escHtml(p.name)}</strong><span style="color:#6B6B6B;font-size:9pt">${escHtml(p.duration)}</span></div>`;
      if (p.role) body += `<div style="font-size:9pt;color:#9E9E9E;margin:0.05cm 0">${escHtml(p.role)}</div>`;
      if (p.description) body += `<p style="margin:0.1cm 0;font-size:10pt;color:#4A4A4A">${escHtml(p.description)}</p>`;
      body += `</div>`;
    }
    html += section("项目经历", body);
  }

  // Education
  if (education.length) {
    let body = "";
    for (const e of education) {
      body += `<div style="margin-top:0.3cm"><div style="display:flex;justify-content:space-between"><strong>${escHtml(e.school)}</strong><span style="color:#6B6B6B;font-size:9pt">${escHtml(e.duration)}</span></div>`;
      const detail = [e.major, e.degree].filter(Boolean).join(" · ");
      if (detail) body += `<div style="font-size:9pt;color:#9E9E9E;margin:0.05cm 0">${escHtml(detail)}</div>`;
      body += `</div>`;
    }
    html += section("教育背景", body);
  }

  // Skills
  if (skills.length) {
    html += section("专业技能", `<p style="margin:0.15cm 0;font-size:10pt;color:#4A4A4A">${skills.map(escHtml).join("、")}</p>`);
  }

  html += `</div>`;
  return html;
}

function escHtml(s: string | undefined): string {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function emptyParseResult(): ParseResult {
  return {
    name: "",
    contact: { phone: "", email: "", location: "" },
    summary: "",
    workExperience: [],
    projectExperience: [],
    education: [],
    skills: [],
  };
}

/** Sort array items newest-first by the start year/month in their `duration` field (stable). */
function sortByStartDate(items: Array<{ duration?: string }>): any[] {
  const keyOf = (d: string | undefined): number => {
    if (!d) return -1;
    const m = d.match(/(\d{4})[.\-/年]?\s*(\d{1,2})?/);
    if (!m) return -1;
    const year = parseInt(m[1], 10);
    const month = m[2] ? parseInt(m[2], 10) : 0;
    return year * 100 + month;
  };
  return [...items].sort((a, b) => keyOf(b.duration) - keyOf(a.duration));
}

export default function ResumeEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [resume, setResume] = useState<ResumeDetail | null>(null);
  const [form, setForm] = useState<ParseResult>(emptyParseResult());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [splitView, setSplitView] = useState(false);
  const lastSavedSnapshot = useRef("");
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const splitViewInitialized = useRef(false);
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState<{ id: string; label?: string; source: "auto" | "manual" | "before_restore"; createdAt: string }[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionSaving, setVersionSaving] = useState(false);
  const [versionRestoring, setVersionRestoring] = useState(false);
  // Section collapse state persisted in sessionStorage
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(sessionStorage.getItem(COLLAPSE_KEY) || "{}"); } catch { return {}; }
  });
  const [expandedDesc, setExpandedDesc] = useState<Record<string, boolean>>({});
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (splitViewInitialized.current) return;
    splitViewInitialized.current = true;
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
      setSplitView(true);
    }
  }, []);

  // Save on Ctrl/Cmd+S
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (resume) handleSave();
      }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [resume, form]);

  useEffect(() => {
    if (!resume || loading || resume.parseStatus !== "parsed") return;
    const snapshot = JSON.stringify(form);
    if (!lastSavedSnapshot.current || snapshot === lastSavedSnapshot.current) return;

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => { void handleSave(true); }, 2000);

    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = null;
      }
    };
  }, [form, loading, resume]);

  useEffect(() => () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
  }, []);

  useEffect(() => {
    apiFetch(`${API}/resumes/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          setResume(json.data);
          const pr = json.data.parseResult;
          if (pr && pr.name) {
            const parsedForm = {
              name: pr.name || "",
              contact: { phone: pr.contact?.phone || "", email: pr.contact?.email || "", location: pr.contact?.location || "" },
              summary: pr.summary || "",
              workExperience: sortByStartDate(pr.workExperience || []),
              projectExperience: sortByStartDate(pr.projectExperience || []),
              education: sortByStartDate(pr.education || []),
              skills: pr.skills || [],
            };
            setForm(parsedForm);
            lastSavedSnapshot.current = JSON.stringify(parsedForm);
          } else {
            lastSavedSnapshot.current = JSON.stringify(emptyParseResult());
          }
        } else {
          setError(json.error?.message ?? "加载失败");
        }
      })
      .catch(() => setError("加载失败，请重试"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave(isAutoSave = false) {
    const snapshot = JSON.stringify(form);
    if (isAutoSave && snapshot === lastSavedSnapshot.current) return;
    setSaving(true);
    setSaveStatus("saving");
    try {
      const res = await apiFetch(`${API}/resumes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parseResult: form }),
      });
      const json = await res.json();
      if (!json.success) {
        toast("保存失败", "error");
        setSaveStatus("error");
        return;
      }
      lastSavedSnapshot.current = snapshot;
      setLastSavedAt(new Date());
      setSaveStatus("saved");
      if (!isAutoSave) toast("保存成功", "success");
    } catch {
      toast("网络错误", "error");
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  }

  function toggleCollapse(key: string) {
    setCollapsed((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try { sessionStorage.setItem(COLLAPSE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  function toggleDesc(key: string) {
    setExpandedDesc((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // Completeness calculation
  const completenessChecks = [
    { key: "name", label: "姓名", done: !!form.name?.trim() },
    { key: "phone", label: "手机", done: !!form.contact?.phone?.trim() },
    { key: "email", label: "邮箱", done: !!form.contact?.email?.trim() },
    { key: "summary", label: "个人摘要", done: !!form.summary?.trim() },
    { key: "work", label: "工作经历", done: form.workExperience.length > 0 },
    { key: "project", label: "项目经历", done: form.projectExperience.length > 0 },
    { key: "education", label: "教育背景", done: form.education.length > 0 },
    { key: "skills", label: "专业技能", done: form.skills.length > 0 },
  ];
  const completedCount = completenessChecks.filter((c) => c.done).length;
  const completeness = Math.round((completedCount / completenessChecks.length) * 100);
  const missingLabels = completenessChecks.filter((c) => !c.done).map((c) => c.label);

  function updateContact(field: "phone" | "email" | "location", value: string) {
    setForm((prev) => ({ ...prev, contact: { ...prev.contact, [field]: value } }));
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

  // ----- Version history handlers -----

  async function loadVersions() {
    setVersionsLoading(true);
    try {
      const res = await apiFetch(`${API}/resumes/${id}/versions`);
      const json = await res.json();
      if (json.success) setVersions(json.data ?? []);
    } catch { /* ignore */ }
    finally { setVersionsLoading(false); }
  }

  useEffect(() => {
    if (showVersions) loadVersions();
  }, [showVersions]);

  async function handleCreateVersion(label: string) {
    setVersionSaving(true);
    try {
      const res = await apiFetch(`${API}/resumes/${id}/versions`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      const json = await res.json();
      if (json.success) { toast("已保存命名版本", "success"); await loadVersions(); }
      else toast(json.error?.message ?? "保存失败", "error");
    } catch { toast("网络错误", "error"); }
    finally { setVersionSaving(false); }
  }

  async function handleRestoreVersion(versionId: string) {
    setVersionRestoring(true);
    try {
      const res = await apiFetch(`${API}/resumes/${id}/versions/${versionId}/restore`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        // Reload the resume so editor reflects restored content
        const detail = await apiFetch(`${API}/resumes/${id}`).then(r => r.json());
        if (detail.success && detail.data?.parseResult) {
          const pr = detail.data.parseResult;
          const restoredForm = {
            name: pr.name || "",
            contact: { phone: pr.contact?.phone || "", email: pr.contact?.email || "", location: pr.contact?.location || "" },
            summary: pr.summary || "",
            workExperience: pr.workExperience || [],
            projectExperience: pr.projectExperience || [],
            education: pr.education || [],
            skills: pr.skills || [],
          };
          setForm(restoredForm);
          lastSavedSnapshot.current = JSON.stringify(restoredForm);
        }
        toast("已恢复到所选版本", "success");
        await loadVersions();
        setShowVersions(false);
      } else toast(json.error?.message ?? "恢复失败", "error");
    } catch { toast("网络错误", "error"); }
    finally { setVersionRestoring(false); }
  }

  function handlePreviewVersion(versionId: string) {
    // Open version detail in a new tab (read-only preview)
    window.open(`/resumes/${id}?version=${versionId}`, "_blank");
  }


  function addArrayItem(field: "workExperience" | "projectExperience" | "education") {
    const defaults: Record<string, any> = {
      workExperience: { company: "", position: "", duration: "", description: "" },
      projectExperience: { name: "", role: "", duration: "", description: "" },
      education: { school: "", major: "", degree: "", duration: "" },
    };
    setForm((prev) => ({ ...prev, [field]: [...prev[field], { ...defaults[field] }] }));
  }

  function updateArrayItem(
    field: "workExperience" | "projectExperience" | "education",
    index: number,
    key: string,
    value: string,
  ) {
    setForm((prev) => {
      const arr = [...prev[field]];
      arr[index] = { ...arr[index], [key]: value };
      return { ...prev, [field]: arr };
    });
  }

  function removeArrayItem(field: "workExperience" | "projectExperience" | "education", index: number) {
    setForm((prev) => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));
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

  if (loading || !resume) {
    return (
      <div className="animate-[fadeIn_200ms_ease-out] space-y-6">
        <div className="h-7 w-48 bg-[#F5F4F2] rounded animate-pulse" />
        <div className="h-[600px] bg-[#F5F4F2] rounded-xl animate-pulse" />
      </div>
    );
  }

  const notParsed = resume.parseStatus !== "parsed" || !resume.parseResult;

  return (
    <div className={`animate-[slideUp_300ms_ease-out] space-y-6 ${splitView ? "" : "max-w-3xl"}`}>
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-sm text-[#9E9E9E] hover:text-[#2D2D2D] flex items-center gap-1 mb-1 transition-colors"
          >
            <ChevronLeft size={14} />
            返回仪表盘
          </button>
          <h2 className="text-xl font-semibold text-[#1A1A1A]">
            {form.name || resume.fileNameOriginal}
          </h2>
          <p className="text-sm text-[#6B6B6B] mt-1">
            {resume.parseStatus === "parsed" ? "解析完成" : resume.parseStatus === "parsing" ? "解析中..." : "解析失败"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<Columns size={14} />}
            onClick={() => setSplitView(!splitView)}
          >
            {splitView ? "单栏" : "分屏"}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<History size={14} />}
            onClick={() => setShowVersions(true)}
          >
            版本
          </Button>
          <Button variant="primary" size="sm" icon={<Check size={14} />} loading={saving} onClick={() => void handleSave()}>
            保存
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Sparkles size={14} />}
            onClick={() => router.push(`/analyze/${id}`)}
          >
            简历分析
          </Button>
        </div>
      </div>

      {notParsed ? (
        resume.parseStatus === "parsing" ? (
          <div className="space-y-6 animate-[fadeIn_200ms_ease-out]">
            {/* Simulated skeleton form */}
            <SkeletonSection>
              <div className="grid grid-cols-2 gap-3">
                <SkeletonField />
                <SkeletonField />
                <SkeletonField />
                <SkeletonField />
              </div>
              <div className="mt-3">
                <div className="h-3 w-16 bg-[#E8E6E3] rounded mb-2" />
                <div className="h-20 bg-[#F0EFED] rounded-lg" />
              </div>
            </SkeletonSection>
            <SkeletonSection>
              <div className="space-y-3">
                <div className="h-3 w-20 bg-[#E8E6E3] rounded mb-3" />
                <div className="grid grid-cols-2 gap-3">
                  <SkeletonField />
                  <SkeletonField />
                  <SkeletonField />
                </div>
                <div className="h-16 bg-[#F0EFED] rounded-lg" />
              </div>
            </SkeletonSection>
            <SkeletonSection>
              <div className="space-y-3">
                <div className="h-3 w-20 bg-[#E8E6E3] rounded mb-3" />
                <div className="grid grid-cols-2 gap-3">
                  <SkeletonField />
                  <SkeletonField />
                  <SkeletonField />
                </div>
                <div className="h-16 bg-[#F0EFED] rounded-lg" />
              </div>
            </SkeletonSection>
            <SkeletonSection>
              <div className="space-y-3">
                <div className="h-3 w-20 bg-[#E8E6E3] rounded mb-3" />
                <div className="grid grid-cols-2 gap-3">
                  <SkeletonField />
                  <SkeletonField />
                  <SkeletonField />
                  <SkeletonField />
                </div>
              </div>
            </SkeletonSection>
            <SkeletonSection>
              <div className="h-3 w-16 bg-[#E8E6E3] rounded mb-2" />
              <div className="h-9 bg-[#F0EFED] rounded-lg" />
            </SkeletonSection>
            <div className="flex justify-center pt-2">
              <div className="w-8 h-8 border-2 border-[#B75C3A] border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        ) : (
          <div className="p-8 bg-white border border-[#EBEBEB] rounded-xl text-center">
            <FileText size={48} className="text-[#D4D4D4] mx-auto mb-3" />
            <p className="text-sm text-[#6B6B6B]">简历尚未解析完成</p>
            <p className="text-xs text-[#9E9E9E] mt-2">上传完成后请等待解析</p>
          </div>
        )
      ) : (
        <div className={splitView ? "grid grid-cols-1 lg:grid-cols-2 gap-6" : "space-y-6"}>
          <div className="space-y-5">
            {/* Status bar: save status + completeness */}
            <div className="flex items-center justify-between px-1 gap-3 flex-wrap">
              <SaveStatusBadge status={saveStatus} lastSavedAt={lastSavedAt} />
              <CompletenessBar percent={completeness} missingLabels={missingLabels} />
            </div>

            <Section
              title="基本信息"
              collapsed={!!collapsed["basic"]}
              onToggle={() => toggleCollapse("basic")}
            >
            <div className="grid grid-cols-2 gap-3">
              <Field label="姓名" value={form.name} onChange={(v) => setForm((p) => ({ ...p, name: v }))} placeholder="张三" />
              <Field label="手机" value={form.contact.phone} onChange={(v) => updateContact("phone", v)} placeholder="138-0000-0000" />
              <Field label="邮箱" value={form.contact.email} onChange={(v) => updateContact("email", v)} placeholder="zhangsan@example.com" />
              <Field label="地点" value={form.contact.location} onChange={(v) => updateContact("location", v)} placeholder="北京 · 朝阳" />
            </div>
            <div className="mt-3">
              <label className="block text-xs font-medium text-[#6B6B6B] mb-1">个人摘要</label>
              <textarea
                value={form.summary}
                onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))}
                rows={3}
                placeholder="一句话介绍你的核心优势与职业方向…"
                className="w-full px-3 py-2 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#B75C3A]/30 focus:border-[#B75C3A] resize-none"
              />
            </div>
          </Section>

          {/* Work Experience */}
          <Section
            title="工作经历"
            count={form.workExperience.length}
            collapsed={!!collapsed["work"]}
            onToggle={() => toggleCollapse("work")}
            onAdd={() => addArrayItem("workExperience")}
            addLabel="+ 添加工作经历"
          >
            {form.workExperience.length === 0 ? (
              <EmptyHint text="还没有工作经历，点击右上角添加" />
            ) : form.workExperience.map((item, i) => {
              const key = `work-${i}`;
              const title = [item.company, item.position].filter(Boolean).join(" · ") || `工作经历 ${i + 1}`;
              return (
              <ArrayCard
                key={key}
                label={title}
                onRemove={() => removeArrayItem("workExperience", i)}
              >
                <div className="grid grid-cols-2 gap-3">
                  <Field label="公司" value={item.company} onChange={(v) => updateArrayItem("workExperience", i, "company", v)} placeholder="字节跳动" />
                  <Field label="职位" value={item.position} onChange={(v) => updateArrayItem("workExperience", i, "position", v)} placeholder="前端工程师" />
                  <TimeField label="时间" value={item.duration} onChange={(v) => updateArrayItem("workExperience", i, "duration", v)} placeholder="2022.03 - 2024.06" />
                </div>
                <DescriptionField
                  expanded={!!expandedDesc[key] || !!item.description}
                  onToggle={() => toggleDesc(key)}
                  value={item.description}
                  onChange={(v) => updateArrayItem("workExperience", i, "description", v)}
                />
              </ArrayCard>
              );
            })}
          </Section>

          {/* Project Experience */}
          <Section
            title="项目经历"
            count={form.projectExperience.length}
            collapsed={!!collapsed["project"]}
            onToggle={() => toggleCollapse("project")}
            onAdd={() => addArrayItem("projectExperience")}
            addLabel="+ 添加项目经历"
          >
            {form.projectExperience.length === 0 ? (
              <EmptyHint text="还没有项目经历，点击右上角添加" />
            ) : form.projectExperience.map((item, i) => {
              const key = `project-${i}`;
              const title = [item.name, item.role].filter(Boolean).join(" · ") || `项目经历 ${i + 1}`;
              return (
              <ArrayCard
                key={key}
                label={title}
                onRemove={() => removeArrayItem("projectExperience", i)}
              >
                <div className="grid grid-cols-2 gap-3">
                  <Field label="项目名称" value={item.name} onChange={(v) => updateArrayItem("projectExperience", i, "name", v)} placeholder="企业内部工具平台" />
                  <Field label="角色" value={item.role} onChange={(v) => updateArrayItem("projectExperience", i, "role", v)} placeholder="技术负责人" />
                  <TimeField label="时间" value={item.duration} onChange={(v) => updateArrayItem("projectExperience", i, "duration", v)} placeholder="2023.01 - 2023.06" />
                </div>
                <DescriptionField
                  expanded={!!expandedDesc[key] || !!item.description}
                  onToggle={() => toggleDesc(key)}
                  value={item.description}
                  onChange={(v) => updateArrayItem("projectExperience", i, "description", v)}
                />
              </ArrayCard>
              );
            })}
          </Section>

          {/* Education */}
          <Section
            title="教育背景"
            count={form.education.length}
            collapsed={!!collapsed["education"]}
            onToggle={() => toggleCollapse("education")}
            onAdd={() => addArrayItem("education")}
            addLabel="+ 添加教育经历"
          >
            {form.education.length === 0 ? (
              <EmptyHint text="还没有教育经历，点击右上角添加" />
            ) : form.education.map((item, i) => {
              const title = [item.school, item.degree].filter(Boolean).join(" · ") || `教育经历 ${i + 1}`;
              return (
              <ArrayCard
                key={`edu-${i}`}
                label={title}
                onRemove={() => removeArrayItem("education", i)}
              >
                <div className="grid grid-cols-2 gap-3">
                  <Field label="学校" value={item.school} onChange={(v) => updateArrayItem("education", i, "school", v)} placeholder="北京大学" />
                  <Field label="专业" value={item.major} onChange={(v) => updateArrayItem("education", i, "major", v)} placeholder="计算机科学" />
                  <Field label="学历" value={item.degree} onChange={(v) => updateArrayItem("education", i, "degree", v)} placeholder="本科" />
                  <TimeField label="时间" value={item.duration} onChange={(v) => updateArrayItem("education", i, "duration", v)} placeholder="2018.09 - 2022.06" />
                </div>
              </ArrayCard>
              );
            })}
          </Section>

          {/* Skills */}
          <Section
            title="专业技能"
            collapsed={!!collapsed["skills"]}
            onToggle={() => toggleCollapse("skills")}
          >
            <SkillInput skills={form.skills} onChange={(skills) => setForm((p) => ({ ...p, skills }))} />
          </Section>

          {/* Bottom actions - sticky */}
          <div className="sticky bottom-3 z-20 flex items-center justify-between gap-3 px-4 py-3 bg-white/90 backdrop-blur border border-[#E5E2DC] rounded-xl shadow-lg">
            <span className="text-xs text-[#9E9E9E] hidden sm:block">
              {saveStatus === "saved" && lastSavedAt
                ? `已自动保存 · ${lastSavedAt.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`
                : saveStatus === "saving" ? "保存中…" : saveStatus === "error" ? "保存失败，请重试" : "内容自动保存"}
            </span>
            <div className="flex gap-2 ml-auto">
              <Button variant="primary" size="sm" icon={<Check size={14} />} loading={saving} onClick={() => void handleSave()}>
                保存
              </Button>
              <Button variant="secondary" size="sm" icon={<Sparkles size={14} />} onClick={() => router.push(`/analyze/${id}`)}>
                简历分析
              </Button>
            </div>
          </div>
        </div>
          {splitView && (
            <div className="hidden lg:block">
              <div className="bg-white border border-[#EBEBEB] rounded-xl overflow-hidden sticky top-6">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-[#EBEBEB] bg-[#FAFAF9]">
                  <FileText size={14} className="text-[#6B6B6B]" />
                  <span className="text-xs font-medium text-[#6B6B6B]">A4 实时预览</span>
                </div>
                <div
                  className="overflow-y-auto"
                  style={{ maxHeight: "calc(100vh - 200px)" }}
                  dangerouslySetInnerHTML={{ __html: renderResumePreview(form) }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Version history modal */}
      {showVersions && (
        <VersionHistoryModal
          resourceLabel={form.name || resume.fileNameOriginal}
          versions={versions}
          loading={versionsLoading}
          saving={versionSaving}
          restoring={versionRestoring}
          onCreate={handleCreateVersion}
          onPreview={handlePreviewVersion}
          onRestore={handleRestoreVersion}
          onClose={() => setShowVersions(false)}
        />
      )}
    </div>
  );
}

/* ---- Sub-components ---- */

function Section({
  title,
  count,
  collapsed,
  onToggle,
  children,
  onAdd,
  addLabel,
}: {
  title: string;
  count?: number;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  onAdd?: () => void;
  addLabel?: string;
}) {
  return (
    <div className="bg-white border border-[#EBEBEB] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 group flex-1 text-left"
          aria-expanded={!collapsed}
        >
          <ChevronDown
            size={14}
            className={`text-[#9E9E9E] transition-transform duration-200 ${collapsed ? "-rotate-90" : ""} group-hover:text-[#6B6B6B]`}
          />
          <h3 className="text-sm font-semibold text-[#2D2D2D]">{title}</h3>
          {count !== undefined && count > 0 && (
            <span className="text-xs text-[#9E9E9E]">({count})</span>
          )}
        </button>
        {onAdd && (
          <button
            onClick={onAdd}
            className="flex items-center gap-1 text-xs text-[#B75C3A] hover:text-[#9A4E31] transition-colors shrink-0"
          >
            <Plus size={14} />
            {addLabel}
          </button>
        )}
      </div>
      {!collapsed && <div className="px-5 pb-5 space-y-3">{children}</div>}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#6B6B6B] mb-1">{label}</label>
      <input
        type="text"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-[#EBEBEB] rounded-lg text-sm text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#B75C3A]/30 focus:border-[#B75C3A]"
      />
    </div>
  );
}

/* ---- Time field with on-blur normalization (YYYY.MM) ---- */

function normalizeTimePart(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  // Handle "至今"/"now"/"present"
  if (/至今|现在|now|present/i.test(s)) return "至今";
  // Extract year and optional month: supports 2022.3 / 2022-3 / 2022/3 / 2022年3月 / 2022.03
  const m = s.match(/^(\d{4})[.\-/年]?\s*(\d{1,2})?/);
  if (!m) return s;
  const year = m[1];
  const month = m[2];
  if (!month) return year;
  const mm = month.padStart(2, "0");
  return `${year}.${mm}`;
}

function normalizeTime(value: string): string {
  // Split range by " - " / "–" / "至" / "~"
  const parts = value.split(/\s*[-–~至]\s*/);
  if (parts.length === 2) {
    const a = normalizeTimePart(parts[0]);
    const b = normalizeTimePart(parts[1]);
    if (a && b) return `${a} - ${b}`;
  }
  return normalizeTimePart(value);
}

function TimeField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#6B6B6B] mb-1">{label}</label>
      <input
        type="text"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => {
          const normalized = normalizeTime(e.target.value);
          if (normalized !== e.target.value) onChange(normalized);
        }}
        placeholder={placeholder ?? "2022.03 - 2024.06"}
        className="w-full px-3 py-2 border border-[#EBEBEB] rounded-lg text-sm text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#B75C3A]/30 focus:border-[#B75C3A]"
      />
    </div>
  );
}

function ArrayCard({
  label,
  onRemove,
  children,
}: {
  label: string;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="p-4 bg-[#FAFAF9] rounded-lg border border-[#EBEBEB] group">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-[#2D2D2D] truncate pr-2">{label}</span>
        <button
          onClick={onRemove}
          className="text-[#C75B5B] hover:text-[#A94848] transition-colors opacity-60 hover:opacity-100 shrink-0"
          aria-label={`删除${label}`}
        >
          <Trash2 size={14} />
        </button>
      </div>
      {children}
    </div>
  );
}

/* ---- Save status badge ---- */

function SaveStatusBadge({
  status,
  lastSavedAt,
}: {
  status: "idle" | "saving" | "saved" | "error";
  lastSavedAt: Date | null;
}) {
  const config = {
    idle: { text: "内容自动保存", color: "text-[#9E9E9E]", dot: "bg-[#D4D4D4]" },
    saving: { text: "保存中…", color: "text-[#C7953A]", dot: "bg-[#C7953A] animate-pulse" },
    saved: {
      text: lastSavedAt ? `已保存 · ${lastSavedAt.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}` : "已保存",
      color: "text-[#5B8C5A]",
      dot: "bg-[#5B8C5A]",
    },
    error: { text: "保存失败", color: "text-[#C75B5B]", dot: "bg-[#C75B5B]" },
  }[status];

  return (
    <div className={`flex items-center gap-1.5 text-xs ${config.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.text}
    </div>
  );
}

/* ---- Completeness progress bar ---- */

function CompletenessBar({ percent, missingLabels }: { percent: number; missingLabels: string[] }) {
  const color = percent >= 80 ? "bg-[#5B8C5A]" : percent >= 50 ? "bg-[#C7953A]" : "bg-[#C75B5B]";
  const text = percent >= 80 ? "text-[#5B8C5A]" : percent >= 50 ? "text-[#C7953A]" : "text-[#C75B5B]";
  return (
    <div className="flex items-center gap-2 group relative">
      <div className="w-28 h-1.5 bg-[#F0EFED] rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-300`} style={{ width: `${percent}%` }} />
      </div>
      <span className={`text-xs font-medium ${text}`}>{percent}%</span>
      {missingLabels.length > 0 && (
        <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity absolute right-0 top-full mt-1 z-30 bg-[#2D2D2D] text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
          还缺：{missingLabels.join("、")}
        </div>
      )}
    </div>
  );
}

/* ---- Collapsible description field ---- */

function DescriptionField({
  expanded,
  onToggle,
  value,
  onChange,
}: {
  expanded: boolean;
  onToggle: () => void;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mt-2">
      {expanded ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder="描述你的职责、成果与亮点…"
          className="w-full px-3 py-2 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#B75C3A]/30 focus:border-[#B75C3A] resize-none"
        />
      ) : (
        <button
          onClick={onToggle}
          className="text-xs text-[#9E9E9E] hover:text-[#6B6B6B] flex items-center gap-1 transition-colors"
        >
          <Plus size={12} />
          添加描述
        </button>
      )}
    </div>
  );
}

/* ---- Empty hint for list sections ---- */

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="py-6 text-center text-xs text-[#9E9E9E]">
      {text}
    </div>
  );
}

/* ---- Skill chip input ---- */

function SkillInput({ skills, onChange }: { skills: string[]; onChange: (skills: string[]) => void }) {
  const [input, setInput] = useState("");

  function commit(raw: string) {
    const parts = raw
      .split(/[,，\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    const merged = [...new Set([...skills, ...parts])];
    onChange(merged);
    setInput("");
  }

  function removeSkill(index: number) {
    onChange(skills.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 p-2 border border-[#EBEBEB] rounded-lg bg-white focus-within:border-[#B75C3A] focus-within:ring-2 focus-within:ring-[#B75C3A]/15">
        {skills.map((skill, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F5F4F2] rounded text-xs text-[#2D2D2D]"
          >
            {skill}
            <button
              onClick={() => removeSkill(i)}
              className="text-[#9E9E9E] hover:text-[#C75B5B] transition-colors"
              aria-label={`删除技能 ${skill}`}
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "," || e.key === "，") {
              e.preventDefault();
              commit(input);
            } else if (e.key === "Backspace" && input === "" && skills.length > 0) {
              removeSkill(skills.length - 1);
            }
          }}
          onBlur={() => commit(input)}
          placeholder={skills.length === 0 ? "输入技能后回车确认，如：React" : "添加更多…"}
          className="flex-1 min-w-[120px] px-1 py-0.5 text-sm border-0 outline-none bg-transparent text-[#2D2D2D]"
        />
      </div>
      <p className="text-xs text-[#9E9E9E] mt-1">支持回车、逗号分隔；Backspace 删除最后一个</p>
    </div>
  );
}

function SkeletonSection({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#EBEBEB] rounded-xl p-5">
      {children}
    </div>
  );
}

function SkeletonField() {
  return (
    <div>
      <div className="h-3 w-14 bg-[#E8E6E3] rounded mb-2" />
      <div className="h-9 bg-[#F0EFED] rounded-lg" />
    </div>
  );
}
