"use client";

import { useEffect, useState } from "react";
import { PointTransactionItem } from "@cvbuilder/shared";
import { apiFetch, API_BASE } from "../lib/auth";


const TYPE_LABELS: Record<string, string> = {
  credit: "充值",
  debit: "消费",
  refund: "退还",
};

const TYPE_COLORS: Record<string, string> = {
  credit: "text-green-600",
  debit: "text-text-secondary",
  refund: "text-amber-600",
};

export default function PointsModal({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<PointTransactionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`${API_BASE}/points/transactions`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setItems(j.data.items ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-surface rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">积分明细</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-secondary text-lg leading-none">
            ×
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-surface-tertiary rounded animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-8">暂无积分记录</p>
        ) : (
          <div className="space-y-1">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between items-center py-2 border-b border-border-light last:border-0">
                <div>
                  <div className="text-sm">{item.description}</div>
                  <div className="text-xs text-text-muted">
                    {new Date(item.createdAt).toLocaleString("zh-CN")}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-medium ${TYPE_COLORS[item.type] || "text-text-secondary"}`}>
                    {item.type === "debit" ? "-" : "+"}{item.amount}
                  </div>
                  <div className="text-xs text-text-muted">余额 {item.balance}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
