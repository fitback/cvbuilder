"use client";

import { useEffect, useState } from "react";
import { PendingRecharge } from "@cvbuilder/shared";
import { Button } from "./Button";
import { Check, X, AlertCircle, User as UserIcon } from "./icons";
import { useToast } from "./Toast";
import { apiFetch } from "../lib/auth";


export default function RechargeApproval() {
  const [items, setItems] = useState<PendingRecharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const { toast } = useToast();

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
    setApproving(id);
    try {
      await apiFetch(`${API}/recharges/${id}/approve`, { method: "POST" });
      toast("已通过审批", "success");
      await fetchPending();
    } catch {
      toast("审批失败", "error");
    } finally {
      setApproving(null);
    }
  }

  async function handleReject(id: string) {
    setApproving(id);
    try {
      await apiFetch(`${API}/recharges/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      toast("已驳回", "success");
      await fetchPending();
    } catch {
      toast("驳回失败", "error");
    } finally {
      setApproving(null);
    }
  }

  if (loading) return null;

  if (!error && items.length === 0) return null;

  return (
    <div className="mb-6 p-4 bg-white border border-[#B75C3A]/20 rounded-xl animate-[slideUp_300ms_ease-out]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertCircle size={16} className="text-[#B75C3A]" />
          <h3 className="text-sm font-medium text-[#1A1A1A]">待审批充值</h3>
        </div>
        <span className="text-xs px-2 py-0.5 bg-[#B75C3A] text-white rounded-full">
          {items.length} 笔
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
          <div
            key={item.id}
            className="flex items-center justify-between py-2.5 px-3 rounded-lg border border-[#EBEBEB]
                       hover:bg-[#F5F4F2] transition-colors duration-150"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-sm">
                <UserIcon size={14} className="text-[#9E9E9E] shrink-0" />
                <span className="text-[#9E9E9E] text-xs">{item.userPhone}</span>
                <span className="text-[#2D2D2D]">
                  {item.amount} 元 → {item.points} 积分
                </span>
              </div>
              <div className="text-xs text-[#9E9E9E] font-mono mt-0.5">{item.orderNo}</div>
              <div className="text-xs text-[#9E9E9E]">{new Date(item.createdAt).toLocaleString("zh-CN")}</div>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <Button
                variant="primary"
                size="sm"
                icon={<Check size={14} />}
                loading={approving === item.id}
                onClick={() => handleApprove(item.id)}
              >
                通过
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon={<X size={14} />}
                onClick={() => handleReject(item.id)}
                className="hover:text-[#C75B5B]"
              >
                驳回
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
