"use client";

import { useEffect, useState, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { ResumeDetail, ParseResult } from "@cvbuilder/shared";
import { Button } from "../../../components/Button";
import {
  FileText, AlertCircle, RefreshCw, Check, Sparkles, Plus, Trash2, ChevronLeft, Columns,
} from "../../../components/icons";
import { useToast } from "../../../components/Toast";
import { apiFetch, API_BASE } from "../../../lib/auth";

const API = API_BASE;

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
  const { toast } = useToast();
  const router = useRouter();

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
              workExperience: pr.workExperience || [],
              projectExperience: pr.projectExperience || [],
              education: pr.education || [],
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
    window.dispatchEvent(new CustomEvent("save-status", { detail: { state: "saving", time: "" } }));
    try {
      const res = await apiFetch(`${API}/resumes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parseResult: form }),
      });
      const json = await res.json();
      if (!json.success) {
        toast("保存失败", "error");
        window.dispatchEvent(new CustomEvent("save-status", { detail: { state: "error", time: "" } }));
        setTimeout(() => window.dispatchEvent(new CustomEvent("save-status", { detail: { state: "idle", time: "" } })), 5000);
        return;
      }
      lastSavedSnapshot.current = snapshot;
      if (!isAutoSave) toast("保存成功", "success");
      const time = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
      window.dispatchEvent(new CustomEvent("save-status", { detail: { state: "idle", time } }));
    } catch {
      toast("网络错误", "error");
      window.dispatchEvent(new CustomEvent("save-status", { detail: { state: "error", time: "" } }));
      setTimeout(() => window.dispatchEvent(new CustomEvent("save-status", { detail: { state: "idle", time: "" } })), 5000);
    } finally {
      setSaving(false);
    }
  }

  function updateContact(field: "phone" | "email" | "location", value: string) {
    setForm((prev) => ({ ...prev, contact: { ...prev.contact, [field]: value } }));
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

  function setSkills(skillsStr: string) {
    setForm((prev) => ({ ...prev, skills: skillsStr.split(/[,，]/).map((s) => s.trim()).filter(Boolean) }));
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
          <div className="space-y-6">
            <Section title="基本信息">
            <div className="grid grid-cols-2 gap-3">
              <Field label="姓名" value={form.name} onChange={(v) => setForm((p) => ({ ...p, name: v }))} />
              <Field label="手机" value={form.contact.phone} onChange={(v) => updateContact("phone", v)} />
              <Field label="邮箱" value={form.contact.email} onChange={(v) => updateContact("email", v)} />
              <Field label="地点" value={form.contact.location} onChange={(v) => updateContact("location", v)} />
            </div>
            <div className="mt-3">
              <label className="block text-xs font-medium text-[#6B6B6B] mb-1">个人摘要</label>
              <textarea
                value={form.summary}
                onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#B75C3A]/30 focus:border-[#B75C3A] resize-none"
              />
            </div>
          </Section>

          {/* Work Experience */}
          <Section
            title="工作经历"
            onAdd={() => addArrayItem("workExperience")}
            addLabel="+ 添加工作经历"
          >
            {form.workExperience.map((item, i) => (
              <ArrayCard
                key={i}
                label={`工作经历 ${i + 1}`}
                onRemove={() => removeArrayItem("workExperience", i)}
              >
                <div className="grid grid-cols-2 gap-3">
                  <Field label="公司" value={item.company} onChange={(v) => updateArrayItem("workExperience", i, "company", v)} />
                  <Field label="职位" value={item.position} onChange={(v) => updateArrayItem("workExperience", i, "position", v)} />
                  <Field label="时间" value={item.duration} onChange={(v) => updateArrayItem("workExperience", i, "duration", v)} />
                </div>
                <div className="mt-2">
                  <label className="block text-xs font-medium text-[#6B6B6B] mb-1">描述</label>
                  <textarea
                    value={item.description}
                    onChange={(e) => updateArrayItem("workExperience", i, "description", e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#B75C3A]/30 focus:border-[#B75C3A] resize-none"
                  />
                </div>
              </ArrayCard>
            ))}
          </Section>

          {/* Project Experience */}
          <Section
            title="项目经历"
            onAdd={() => addArrayItem("projectExperience")}
            addLabel="+ 添加项目经历"
          >
            {form.projectExperience.map((item, i) => (
              <ArrayCard
                key={i}
                label={`项目经历 ${i + 1}`}
                onRemove={() => removeArrayItem("projectExperience", i)}
              >
                <div className="grid grid-cols-2 gap-3">
                  <Field label="项目名称" value={item.name} onChange={(v) => updateArrayItem("projectExperience", i, "name", v)} />
                  <Field label="角色" value={item.role} onChange={(v) => updateArrayItem("projectExperience", i, "role", v)} />
                  <Field label="时间" value={item.duration} onChange={(v) => updateArrayItem("projectExperience", i, "duration", v)} />
                </div>
                <div className="mt-2">
                  <label className="block text-xs font-medium text-[#6B6B6B] mb-1">描述</label>
                  <textarea
                    value={item.description}
                    onChange={(e) => updateArrayItem("projectExperience", i, "description", e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#B75C3A]/30 focus:border-[#B75C3A] resize-none"
                  />
                </div>
              </ArrayCard>
            ))}
          </Section>

          {/* Education */}
          <Section
            title="教育背景"
            onAdd={() => addArrayItem("education")}
            addLabel="+ 添加教育经历"
          >
            {form.education.map((item, i) => (
              <ArrayCard
                key={i}
                label={`教育经历 ${i + 1}`}
                onRemove={() => removeArrayItem("education", i)}
              >
                <div className="grid grid-cols-2 gap-3">
                  <Field label="学校" value={item.school} onChange={(v) => updateArrayItem("education", i, "school", v)} />
                  <Field label="专业" value={item.major} onChange={(v) => updateArrayItem("education", i, "major", v)} />
                  <Field label="学历" value={item.degree} onChange={(v) => updateArrayItem("education", i, "degree", v)} />
                  <Field label="时间" value={item.duration} onChange={(v) => updateArrayItem("education", i, "duration", v)} />
                </div>
              </ArrayCard>
            ))}
          </Section>

          {/* Skills */}
          <Section title="专业技能">
            <Field
              label="技能（逗号分隔）"
              value={form.skills.join(", ")}
              onChange={(v) => setSkills(v)}
              placeholder="如：Python, React, TypeScript"
            />
          </Section>

          {/* Bottom actions */}
          <div className="flex items-center justify-between pt-4 border-t border-[#EBEBEB]">
            <span className="text-xs text-[#9E9E9E]">
              编辑完成后请保存，再进行简历分析
            </span>
            <div className="flex gap-2">
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
    </div>
  );
}

/* ---- Sub-components ---- */

function Section({
  title,
  children,
  onAdd,
  addLabel,
}: {
  title: string;
  children: React.ReactNode;
  onAdd?: () => void;
  addLabel?: string;
}) {
  return (
    <div className="bg-white border border-[#EBEBEB] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#2D2D2D]">{title}</h3>
        {onAdd && (
          <button
            onClick={onAdd}
            className="flex items-center gap-1 text-xs text-[#B75C3A] hover:text-[#9A4E31] transition-colors"
          >
            <Plus size={14} />
            {addLabel}
          </button>
        )}
      </div>
      <div className="space-y-3">{children}</div>
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
    <div className="p-4 bg-[#FAFAF9] rounded-lg border border-[#EBEBEB]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-[#6B6B6B]">{label}</span>
        <button
          onClick={onRemove}
          className="text-[#C75B5B] hover:text-[#A94848] transition-colors"
          aria-label={`删除${label}`}
        >
          <Trash2 size={14} />
        </button>
      </div>
      {children}
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
