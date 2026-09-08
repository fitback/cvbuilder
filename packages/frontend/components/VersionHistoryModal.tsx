"use client";

import { useEffect, useState } from "react";
import { VersionSource } from "@cvbuilder/shared";
import { X, History, RotateCcw, Spinner } from "./icons";
import { useModalA11y } from "../lib/useModalA11y";

export interface VersionListItem {
  id: string;
  label?: string;
  source: VersionSource;
  createdAt: string;
}

interface Props {
  resourceLabel: string;
  versions: VersionListItem[];
  loading: boolean;
  saving: boolean;
  restoring: boolean;
  onCreate: (label: string) => Promise<void> | void;
  onPreview: (versionId: string) => void;
  onRestore: (versionId: string) => Promise<void> | void;
  onClose: () => void;
}

const SOURCE_LABELS: Record<VersionSource, string> = {
  auto: "自动",
  manual: "手动",
  before_restore: "恢复前",
};

const SOURCE_COLORS: Record<VersionSource, string> = {
  auto: "text-[#9E9E9E]",
  manual: "text-[#5B8C5A]",
  before_restore: "text-[#C7953A]",
};

export default function VersionHistoryModal({
  resourceLabel,
  versions,
  loading,
  saving,
  restoring,
  onCreate,
  onPreview,
  onRestore,
  onClose,
}: Props) {
  const [label, setLabel] = useState("");
  // While a save or restore is in flight, disable Escape + overlay click to avoid mid-action close.
  const busy = saving || restoring;
  const dialogRef = useModalA11y(true, busy ? () => {} : onClose);

  useEffect(() => {
    if (!busy) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") e.preventDefault();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [busy]);

  const handleCreate = async () => {
    const trimmed = label.trim();
    if (!trimmed || saving) return;
    await onCreate(trimmed);
    setLabel("");
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-[fadeIn_150ms_ease-out]"
      onClick={busy ? undefined : onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="version-history-title"
        className="bg-white rounded-xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto shadow-xl
                   animate-[slideUp_200ms_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2 min-w-0">
            <History size={20} className="text-[#B75C3A] shrink-0" />
            <h3 id="version-history-title" className="text-lg font-semibold text-[#1A1A1A] truncate">
              版本记录 · {resourceLabel}
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="p-1.5 rounded-lg hover:bg-[#F5F4F2] active:scale-[0.95] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="关闭"
          >
            <X size={18} className="text-[#9E9E9E]" />
          </button>
        </div>

        {/* Save current as named snapshot */}
        <div className="flex gap-2 mb-5">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreate();
              }
            }}
            placeholder="为当前版本命名…"
            disabled={saving}
            className="flex-1 min-w-0 px-3 py-2 text-sm rounded-lg border border-[#E5E2DC] bg-white text-[#1A1A1A]
                       focus:outline-none focus:border-[#B75C3A] focus:ring-2 focus:ring-[#B75C3A]/15
                       disabled:bg-[#F5F4F2] disabled:cursor-not-allowed"
            maxLength={60}
            aria-label="版本名称"
          />
          <button
            onClick={handleCreate}
            disabled={saving || !label.trim()}
            className="px-3 py-2 text-sm font-medium text-white bg-[#B75C3A] rounded-lg hover:bg-[#A0502F]
                       active:scale-[0.97] transition-all duration-150
                       disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
            aria-label="保存当前版本"
          >
            {saving ? <Spinner size={14} /> : null}
            <span>保存当前</span>
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-[#F5F4F2] rounded-lg animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
            ))}
          </div>
        ) : versions.length === 0 ? (
          <div className="py-12 text-center">
            <History size={36} className="mx-auto text-[#D4D4D4] mb-3" />
            <p className="text-sm text-[#9E9E9E]">还没有版本快照</p>
            <p className="text-xs text-[#B5B5B5] mt-1">编辑后会自动记录</p>
          </div>
        ) : (
          <ol className="space-y-1.5">
            {versions.map((v) => (
              <li
                key={v.id}
                className="flex items-start gap-3 py-2.5 px-2 rounded-lg hover:bg-[#F5F4F2] transition-colors duration-150"
              >
                <div className="flex flex-col items-center pt-0.5 shrink-0">
                  <div className="w-2 h-2 rounded-full bg-[#B75C3A]" />
                  <div className="w-px h-full bg-[#E5E2DC] mt-1" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-sm text-[#1A1A1A] truncate">
                      {v.label || (v.source === "auto" ? "自动快照" : v.source === "before_restore" ? "恢复前快照" : "命名快照")}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full bg-[#F5F4F2] ${SOURCE_COLORS[v.source]}`}>
                      {SOURCE_LABELS[v.source]}
                    </span>
                  </div>
                  <div className="text-xs text-[#9E9E9E] mt-0.5">
                    {new Date(v.createdAt).toLocaleString("zh-CN")}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <button
                      onClick={() => onPreview(v.id)}
                      disabled={busy}
                      className="text-xs text-[#B75C3A] hover:underline disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
                      aria-label={`预览版本 ${v.label || v.id}`}
                    >
                      预览
                    </button>
                    <button
                      onClick={() => onRestore(v.id)}
                      disabled={busy}
                      className="text-xs text-[#6B6B6B] hover:underline flex items-center gap-1
                                 disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
                      aria-label={`恢复版本 ${v.label || v.id}`}
                    >
                      <RotateCcw size={11} />
                      恢复
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}

        {busy ? (
          <p className="mt-4 text-xs text-[#9E9E9E] text-center">
            {restoring ? "正在恢复版本…" : "正在保存版本…"}
          </p>
        ) : null}
      </div>
    </div>
  );
}
