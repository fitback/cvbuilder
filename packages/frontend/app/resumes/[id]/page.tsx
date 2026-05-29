"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ResumeDetail, ParseResult } from "@cvbuilder/shared";
import { Button } from "../../../components/Button";
import {
  FileText, AlertCircle, RefreshCw, Check, Sparkles, Plus, Trash2, ChevronLeft,
} from "../../../components/icons";
import { useToast } from "../../../components/Toast";
import { apiFetch, API_BASE } from "../../../lib/auth";

const API = API_BASE;

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
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    apiFetch(`${API}/resumes/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          setResume(json.data);
          const pr = json.data.parseResult;
          if (pr && pr.name) {
            setForm({
              name: pr.name || "",
              contact: { phone: pr.contact?.phone || "", email: pr.contact?.email || "", location: pr.contact?.location || "" },
              summary: pr.summary || "",
              workExperience: pr.workExperience || [],
              projectExperience: pr.projectExperience || [],
              education: pr.education || [],
              skills: pr.skills || [],
            });
          }
        } else {
          setError(json.error?.message ?? "加载失败");
        }
      })
      .catch(() => setError("加载失败，请重试"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await apiFetch(`${API}/resumes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parseResult: form }),
      });
      const json = await res.json();
      if (!json.success) {
        toast("保存失败", "error");
        return;
      }
      toast("保存成功", "success");
    } catch {
      toast("网络错误", "error");
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
    <div className="animate-[slideUp_300ms_ease-out] space-y-6 max-w-3xl">
      {/* Header */}
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
            {resume.freeAnalysisCount > 0 && ` · 剩余免费分析 ${resume.freeAnalysisCount} 次`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={<Check size={14} />} loading={saving} onClick={handleSave}>
            保存
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Sparkles size={14} />}
            onClick={() => router.push(`/analyze/${id}`)}
          >
            简历分析
          </Button>
        </div>
      </div>

      {notParsed ? (
        <div className="p-8 bg-white border border-[#EBEBEB] rounded-xl text-center">
          <FileText size={48} className="text-[#D4D4D4] mx-auto mb-3" />
          <p className="text-sm text-[#6B6B6B]">
            {resume.parseStatus === "parsing" ? "正在解析中，请稍候..." : "简历尚未解析完成"}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Basic Info */}
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
              <Button variant="secondary" size="sm" icon={<Check size={14} />} loading={saving} onClick={handleSave}>
                保存
              </Button>
              <Button variant="primary" size="sm" icon={<Sparkles size={14} />} onClick={() => router.push(`/analyze/${id}`)}>
                简历分析
              </Button>
            </div>
          </div>
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
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#6B6B6B] mb-1">{label}</label>
      <input
        type="text"
        value={value}
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
        >
          <Trash2 size={14} />
        </button>
      </div>
      {children}
    </div>
  );
}
