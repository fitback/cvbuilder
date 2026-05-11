"use client";

import { useEffect, useState } from "react";
import { PendingRecharge } from "@cvbuilder/shared";
import { apiFetch, API_BASE } from "../lib/auth";


export default function RechargeApproval() {
  const [items, setItems] = useState<PendingRecharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function fetchPending() {
    setError(false);
    try {
      const res = await apiFetch(`${API_BASE}/recharges/pending`);
      const json = await res.json();
      if (json.success) setItems(json.data ?? []);
      if (!json.success && json.error?.code === "UNAUTHORIZED") {
        // Not an admin, don't show anything
        setItems([]);
      }
    } catch {
      setError(true);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchPending();
  }, []);

  async function handleApprove(id: string) {
    await apiFetch(`${API_BASE}/recharges/${id}/approve`, { method: "POST" });
    await fetchPending();
  }

  async function handleReject(id: string) {
    const note = prompt("驳回原因（可选）：");
    await apiFetch(`${API_BASE}/recharges/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: note || undefined }),
    });
    await fetchPending();
  }

  if (loading) return null;

  if (!error && items.length === 0) return null;

  return (
    <div className="mb-6 p-4 bg-surface border border-accent/20 rounded-md">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium">充值审批</h3>
        <span className="text-xs px-2 py-0.5 bg-accent text-white rounded-full">
          {items.length} 笔待处理
        </span>
      </div>
      {error && (
        <p className="text-xs text-error">加载失败，请刷新页面重试</p>
      )}
      {!error && items.length === 0 && (
        <p className="text-xs text-text-muted">暂无待审批的充值</p>
      )}
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between items-center py-2 border-b border-border-light last:border-0">
            <div>
              <div className="text-sm">
                <span className="text-text-muted text-xs">{item.userPhone}</span>
                {" · "}
                {item.amount} 元 → {item.points} 积分
              </div>
              <div className="text-xs text-text-muted font-mono">{item.orderNo}</div>
              <div className="text-xs text-text-muted">{new Date(item.createdAt).toLocaleString("zh-CN")}</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleApprove(item.id)}
                className="px-3 py-1 text-xs text-white bg-accent rounded hover:bg-accent-hover"
              >
                通过
              </button>
              <button
                onClick={() => handleReject(item.id)}
                className="px-3 py-1 text-xs text-text-muted border border-border rounded hover:text-error"
              >
                驳回
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
