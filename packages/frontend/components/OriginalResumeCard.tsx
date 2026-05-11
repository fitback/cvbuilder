"use client";

import { ParseResult } from "@cvbuilder/shared";

export default function OriginalResumeCard({ data }: { data: ParseResult }) {
  return (
    <div className="bg-surface border border-border-light rounded-md p-4 text-sm space-y-3 max-h-[600px] overflow-y-auto">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-text-muted uppercase tracking-wide">原始简历</span>
        <div className="flex-1 h-px bg-border-light" />
      </div>

      {data.name && (
        <div>
          <div className="text-xs text-text-muted mb-1">姓名</div>
          <div className="font-medium">{data.name}</div>
        </div>
      )}

      {data.contact && (data.contact.phone || data.contact.email || data.contact.location) && (
        <div>
          <div className="text-xs text-text-muted mb-1">联系方式</div>
          <div className="text-text-secondary">
            {[data.contact.phone, data.contact.email, data.contact.location].filter(Boolean).join(" · ")}
          </div>
        </div>
      )}

      {data.summary && (
        <div>
          <div className="text-xs text-text-muted mb-1">个人摘要</div>
          <div className="text-text-secondary">{data.summary}</div>
        </div>
      )}

      {data.workExperience && data.workExperience.length > 0 && (
        <div>
          <div className="text-xs text-text-muted mb-2">工作经历</div>
          <div className="space-y-2">
            {data.workExperience.map((exp, i) => (
              <div key={i} className="border-l-2 border-border-light pl-3">
                <div className="font-medium text-sm">{exp.company} · {exp.position}</div>
                <div className="text-xs text-text-muted">{exp.duration}</div>
                <div className="text-xs text-text-secondary mt-0.5">{exp.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.projectExperience && data.projectExperience.length > 0 && (
        <div>
          <div className="text-xs text-text-muted mb-2">项目经历</div>
          <div className="space-y-2">
            {data.projectExperience.map((proj, i) => (
              <div key={i} className="border-l-2 border-border-light pl-3">
                <div className="font-medium text-sm">{proj.name} · {proj.role}</div>
                <div className="text-xs text-text-muted">{proj.duration}</div>
                <div className="text-xs text-text-secondary mt-0.5">{proj.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.education && data.education.length > 0 && (
        <div>
          <div className="text-xs text-text-muted mb-2">教育背景</div>
          {data.education.map((edu, i) => (
            <div key={i} className="text-sm text-text-secondary">
              {edu.school} · {edu.major} · {edu.degree} · {edu.duration}
            </div>
          ))}
        </div>
      )}

      {data.skills && data.skills.length > 0 && (
        <div>
          <div className="text-xs text-text-muted mb-1">技能</div>
          <div className="flex flex-wrap gap-1">
            {data.skills.map((s, i) => (
              <span key={i} className="text-xs px-2 py-0.5 bg-surface-tertiary rounded">{s}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
