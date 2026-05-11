"use client";

import { useEffect, useState } from "react";
import { PendingRecharge } from "@cvbuilder/shared";
import { apiFetch } from "../lib/auth";

const API = "http://localhost:3001";

export default function RechargeApproval() {
  const [items, setItems] = useState<PendingRecharge[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchPending() {
    try {
      const res = await apiFetch(`${API}/recharges/pending`);
      const json = await res.json();
      if (json.success) setItems(json.data ?? []);
    } catch {}
  }

  useEffect(() => {
    fetchPending().finally(() => setLoading(false));
  }, []);

  async function handleApprove(id: string) {
    await apiFetch(`${API}/recharges/${id}/approve`, { method: "POST" });
    await fetchPending();
  }

  async function handleReject(id: string) {
    const note = prompt("驳回原因（可选）：");
    await apiFetch(`${API}/recharges/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: note || undefined }),
    });
    await fetchPending();
  }

  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <div className="mb-6 p-4 bg-surface border border-accent/20 rounded-md">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium">待审批充值</h3>
        <span className="text-xs px-2 py-0.5 bg-accent text-white rounded-full">
          {items.length} 笔
        </span>
      </div>
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
