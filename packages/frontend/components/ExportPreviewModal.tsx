"use client";

import { useEffect, useState } from "react";
import { X, Download, Spinner, AlertCircle, CheckCircle } from "./icons";
import { useModalA11y } from "../lib/useModalA11y";
import TemplateSelector from "./TemplateSelector";

export type ExportFormat = "pdf" | "docx";

interface Props {
  /** Pre-rendered HTML to show in the A4 preview pane. */
  html: string;
  /** True while parent is re-rendering HTML (e.g. preview API in flight). */
  previewLoading?: boolean;
  fileName: string;
  isEmpty: boolean;
  warnings: string[];
  exporting: boolean;
  error: string;
  /** Currently selected template id. */
  templateId: string;
  /** Called when user picks a different template in the modal. */
  onTemplateChange: (id: string) => void;
  onExport: (format: ExportFormat) => Promise<void> | void;
  onClose: () => void;
}

export function buildExportWarnings(content: string): { isEmpty: boolean; warnings: string[] } {
  const trimmed = content.trim();
  if (!trimmed) return { isEmpty: true, warnings: [] };
  const warnings: string[] = [];
  const hasH1 = /^#\s+\S/m.test(trimmed);
  if (!hasH1) warnings.push("缺少一级标题（# 名字）— 导出 PDF 后顶部会留白");
  const charCount = trimmed.replace(/\s/g, "").length;
  if (charCount < 100) warnings.push(`正文较短（${charCount} 字），简历可能信息量不够`);
  if (charCount > 3000) warnings.push(`正文较长（${charCount} 字），PDF 可能超出单页`);
  return { isEmpty: false, warnings };
}

export default function ExportPreviewModal({
  html,
  previewLoading,
  fileName,
  isEmpty,
  warnings,
  exporting,
  error,
  templateId,
  onTemplateChange,
  onExport,
  onClose,
}: Props) {
  const [format, setFormat] = useState<ExportFormat>("pdf");
  const dialogRef = useModalA11y(true, exporting ? () => {} : onClose);

  useEffect(() => {
    if (!exporting) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") e.preventDefault();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [exporting]);

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-[fadeIn_150ms_ease-out]"
      onClick={exporting ? undefined : onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-preview-title"
        className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col
                   animate-[slideUp_200ms_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EBEBEB]">
          <h3 id="export-preview-title" className="text-lg font-semibold text-[#1A1A1A]">导出预览</h3>
          <button
            onClick={onClose}
            disabled={exporting}
            className="p-1.5 rounded-lg hover:bg-[#F5F4F2] active:scale-[0.95] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="关闭"
          >
            <X size={18} className="text-[#9E9E9E]" />
          </button>
        </div>

        {/* Pre-export checks + template picker */}
        <div className="px-6 py-3 border-b border-[#EBEBEB] space-y-2.5">
          <div className="space-y-1.5">
            {isEmpty ? (
              <p className="text-sm text-[#C75B5B] flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                内容为空，无法导出
              </p>
            ) : warnings.length === 0 ? (
              <p className="text-sm text-[#5B8C5A] flex items-center gap-2">
                <CheckCircle size={14} className="shrink-0" />
                内容检查通过
              </p>
            ) : (
              warnings.map((w, i) => (
                <p key={i} className="text-sm text-[#C7953A] flex items-start gap-2">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{w}</span>
                </p>
              ))
            )}
            {error ? (
              <p className="text-sm text-[#C75B5B] flex items-center gap-2 mt-1">
                <AlertCircle size={14} className="shrink-0" />
                <span>导出失败：{error}。可重试。</span>
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-[#6B6B6B] font-medium">模板</span>
            <TemplateSelector value={templateId} onChange={onTemplateChange} compact />
          </div>
        </div>

        {/* A4 preview — iframe with backend-rendered HTML (1:1 with PDF) */}
        <div className="flex-1 overflow-auto p-6 bg-[#FAFAF9] relative">
          {previewLoading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-10 pointer-events-none">
              <div className="w-8 h-8 border-2 border-[#B75C3A] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <iframe
            title="简历预览"
            srcDoc={html}
            className="mx-auto bg-white shadow-md w-full h-[80vh] border-0"
            sandbox="allow-same-origin"
          />
        </div>

        {/* Footer: format selection + export */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-[#EBEBEB] bg-white">
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#9E9E9E]">导出格式</span>
            <div className="flex rounded-lg border border-[#E5E2DC] overflow-hidden">
              <button
                onClick={() => setFormat("pdf")}
                disabled={exporting}
                className={`px-3 py-1.5 text-sm transition-colors duration-150 ${
                  format === "pdf"
                    ? "bg-[#B75C3A] text-white"
                    : "bg-white text-[#6B6B6B] hover:bg-[#F5F4F2]"
                } disabled:cursor-not-allowed`}
                aria-pressed={format === "pdf"}
              >
                PDF
              </button>
              <button
                onClick={() => setFormat("docx")}
                disabled={exporting}
                className={`px-3 py-1.5 text-sm transition-colors duration-150 ${
                  format === "docx"
                    ? "bg-[#B75C3A] text-white"
                    : "bg-white text-[#6B6B6B] hover:bg-[#F5F4F2]"
                } disabled:cursor-not-allowed`}
                aria-pressed={format === "docx"}
              >
                DOCX
              </button>
            </div>
            <span className="text-xs text-[#9E9E9E] hidden sm:inline">文件名：{fileName || "resume"}</span>
          </div>
          <button
            onClick={() => onExport(format)}
            disabled={isEmpty || exporting}
            className="px-4 py-2 text-sm font-medium text-white bg-[#B75C3A] rounded-lg hover:bg-[#A0502F]
                       active:scale-[0.97] transition-all duration-150
                       disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            aria-label={`导出 ${format.toUpperCase()}`}
          >
            {exporting ? <Spinner size={14} /> : <Download size={14} />}
            <span>导出</span>
          </button>
        </div>
      </div>
    </div>
  );
}
