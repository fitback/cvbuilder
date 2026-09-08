"use client";

import { useEffect, useState } from "react";
import { TemplateMetadata } from "@cvbuilder/shared";
import { apiFetch, API_BASE } from "../lib/auth";

const API = API_BASE;

interface Props {
  value: string;
  onChange: (id: string) => void;
  /** Optional compact mode for inline toolbars (smaller thumbnails). */
  compact?: boolean;
}

/**
 * Inline 4-thumbnail picker. Fetches template metadata from `GET /templates`
 * (public, no auth) on mount and renders a horizontal row of cards. The
 * selected card has an accent border. Falls back gracefully if the API call
 * fails — the parent's `value` is preserved and the picker just hides.
 */
export default function TemplateSelector({ value, onChange, compact = false }: Props) {
  const [templates, setTemplates] = useState<TemplateMetadata[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch(`${API}/templates`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.success && Array.isArray(json.data)) setTemplates(json.data);
      })
      .catch(() => { /* picker stays empty; backend may be down */ })
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  if (!loaded || templates.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {templates.map((t) => {
        const selected = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            aria-pressed={selected}
            title={t.description}
            className={`group relative rounded-lg overflow-hidden border transition-all duration-150 ${
              compact ? "w-20 h-12" : "w-24 h-14"
            } ${
              selected
                ? "border-[#B75C3A] ring-2 ring-[#B75C3A]/30 shadow-sm"
                : "border-[#E5E2DC] hover:border-[#B75C3A]/50 hover:shadow-sm"
            }`}
          >
            <img
              src={t.thumbnailDataUri}
              alt={t.name}
              className="w-full h-full object-cover"
              draggable={false}
            />
            <span
              className={`absolute bottom-0 left-0 right-0 px-1 py-0.5 text-[10px] text-center font-medium truncate ${
                selected ? "bg-[#B75C3A] text-white" : "bg-white/80 text-[#6B6B6B]"
              }`}
            >
              {t.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
