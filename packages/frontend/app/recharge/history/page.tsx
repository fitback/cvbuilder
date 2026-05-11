"use client";

import { useEffect, useState } from "react";
import { RechargeItem } from "@cvbuilder/shared";
import { apiFetch } from "../../../lib/auth";

const API = "http://localhost:3001";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  pending: { label: "待审核", className: "bg-amber-50 text-amber-700" },
  approved: { label: "已通过", className: "bg-green-50 text-green-700" },
  rejected: { label: "已驳回", className: "bg-red-50 text-red-600" },
};

export default function RechargeHistoryPage() {
  const [items, setItems] = useState<RechargeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`${API}/recharges`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setItems(j.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <a href="/recharge" className="text-text-muted hover:text-text-secondary text-sm">← 返回</a>
        <h2 className="text-xl font-semibold">充值记录</h2>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-surface-tertiary rounded animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4 opacity-20">💰</div>
          <h3 className="text-lg font-semibold mb-2">暂无充值记录</h3>
          <p className="text-sm text-text-secondary mb-6">还没有提交过充值申请</p>
          <a href="/recharge" className="inline-block px-5 py-2.5 bg-accent text-white rounded text-sm font-medium hover:bg-accent-hover transition-colors">
            去充值
          </a>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="p-4 bg-surface border border-border-light rounded-md flex justify-between items-center">
              <div>
                <div className="text-sm font-medium">{item.amount} 元 → {item.points} 积分</div>
                <div className="text-xs text-text-muted mt-1">
                  单号：<span className="font-mono">{item.orderNo}</span>
                  {" · "}
                  {new Date(item.createdAt).toLocaleString("zh-CN")}
                </div>
                {item.adminNote && (
                  <div className="text-xs text-text-muted mt-1">备注：{item.adminNote}</div>
                )}
              </div>
              <div className={`text-xs px-2 py-1 rounded ${STATUS_MAP[item.status]?.className || ""}`}>
                {STATUS_MAP[item.status]?.label || item.status}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
