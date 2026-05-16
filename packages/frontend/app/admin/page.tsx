"use client";

import { useEffect, useState } from "react";
import { PendingRecharge, RechargeHistoryItem } from "@cvbuilder/shared";
import { Button } from "../../components/Button";
import { Check, X, AlertCircle, User as UserIcon, Clock, ShieldAlert, History } from "../../components/icons";
import { useToast } from "../../components/Toast";
import { apiFetch } from "../../lib/auth";

const API = "http://localhost:3001";

type Tab = "pending" | "history";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const [pending, setPending] = useState<PendingRecharge[]>([]);
  const [history, setHistory] = useState<RechargeHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [approving, setApproving] = useState<string | null>(null);
  const { toast } = useToast();

  async function fetchPending() {
    try {
      const res = await apiFetch(`${API}/recharges/pending`);
      const json = await res.json();
      if (json.success) setPending(json.data ?? []);
      else setError(json.error?.message ?? "加载失败");
    } catch {
      setError("加载失败");
    }
  }

  async function fetchHistory() {
    try {
      const res = await apiFetch(`${API}/recharges/history`);
      const json = await res.json();
      if (json.success) setHistory(json.data ?? []);
      else setError(json.error?.message ?? "加载失败");
    } catch {
      setError("加载失败");
    }
  }

  useEffect(() => {
    setLoading(true);
    setError("");
    Promise.all([fetchPending(), fetchHistory()]).finally(() => setLoading(false));
  }, []);

  async function handleApprove(id: string) {
    setApproving(id);
    try {
      await apiFetch(`${API}/recharges/${id}/approve`, { method: "POST" });
      toast("已通过审批", "success");
      await Promise.all([fetchPending(), fetchHistory()]);
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
      await Promise.all([fetchPending(), fetchHistory()]);
    } catch {
      toast("驳回失败", "error");
    } finally {
      setApproving(null);
    }
  }

  if (error && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-[fadeIn_200ms_ease-out]">
        <AlertCircle size={48} className="text-[#C75B5B] mb-4 opacity-50" />
        <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">加载失败</h3>
        <p className="text-sm text-[#6B6B6B] mb-6">{error}</p>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          重试
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-[slideUp_300ms_ease-out] space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#1A1A1A]">管理后台</h2>
        <p className="text-sm text-[#6B6B6B] mt-1">充值审批与记录管理</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-[#F5F4F2] rounded-lg w-fit">
        <button
          onClick={() => setTab("pending")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-150
            ${tab === "pending"
              ? "bg-white text-[#1A1A1A] shadow-sm"
              : "text-[#6B6B6B] hover:text-[#2D2D2D]"
            }`}
        >
          <Clock size={16} />
          待审批
          {pending.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-[#B75C3A] text-white rounded-full">{pending.length}</span>
          )}
        </button>
        <button
          onClick={() => setTab("history")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-150
            ${tab === "history"
              ? "bg-white text-[#1A1A1A] shadow-sm"
              : "text-[#6B6B6B] hover:text-[#2D2D2D]"
            }`}
        >
          <History size={16} />
          审批历史
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-[#F5F4F2] rounded-xl animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
          ))}
        </div>
      ) : tab === "pending" ? (
        pending.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 border border-dashed border-[#D4D4D4] rounded-xl">
            <ShieldAlert size={48} className="text-[#D4D4D4] mb-3" />
            <h3 className="text-base font-medium text-[#1A1A1A] mb-1">暂无待审批充值</h3>
            <p className="text-sm text-[#6B6B6B]">所有充值申请已处理完毕</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pending.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 bg-white border border-[#EBEBEB] rounded-xl
                           transition-all duration-200 ease-out
                           hover:border-[#D4D4D4] hover:shadow-sm"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <UserIcon size={14} className="text-[#9E9E9E] shrink-0" />
                    <span className="text-sm text-[#9E9E9E]">{item.userPhone}</span>
                    <span className="text-sm font-medium text-[#2D2D2D]">
                      {item.amount} 元 → {item.points} 积分
                    </span>
                  </div>
                  <div className="text-xs text-[#9E9E9E] font-mono mt-1">单号：{item.orderNo}</div>
                  <div className="text-xs text-[#9E9E9E] mt-0.5">{new Date(item.createdAt).toLocaleString("zh-CN")}</div>
                </div>
                <div className="flex gap-2 shrink-0 ml-4">
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
        )
      ) : (
        history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 border border-dashed border-[#D4D4D4] rounded-xl">
            <Clock size={48} className="text-[#D4D4D4] mb-3" />
            <h3 className="text-base font-medium text-[#1A1A1A] mb-1">暂无审批记录</h3>
            <p className="text-sm text-[#6B6B6B]">审批通过或驳回的记录将显示在这里</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#EBEBEB]">
                  <th className="text-left py-3 px-3 text-[#6B6B6B] font-medium">用户</th>
                  <th className="text-left py-3 px-3 text-[#6B6B6B] font-medium">金额</th>
                  <th className="text-left py-3 px-3 text-[#6B6B6B] font-medium">积分</th>
                  <th className="text-left py-3 px-3 text-[#6B6B6B] font-medium">单号</th>
                  <th className="text-left py-3 px-3 text-[#6B6B6B] font-medium">状态</th>
                  <th className="text-left py-3 px-3 text-[#6B6B6B] font-medium">备注</th>
                  <th className="text-left py-3 px-3 text-[#6B6B6B] font-medium">时间</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id} className="border-b border-[#F5F4F2] hover:bg-[#FAFAF9] transition-colors duration-100">
                    <td className="py-3 px-3 text-[#2D2D2D]">{item.userPhone}</td>
                    <td className="py-3 px-3 text-[#2D2D2D]">{item.amount} 元</td>
                    <td className="py-3 px-3 text-[#2D2D2D]">{item.points}</td>
                    <td className="py-3 px-3 text-[#9E9E9E] font-mono text-xs">{item.orderNo}</td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                        item.status === "approved"
                          ? "bg-[#5B8C5A]/10 text-[#5B8C5A]"
                          : "bg-[#C75B5B]/10 text-[#C75B5B]"
                      }`}>
                        {item.status === "approved" ? "已通过" : "已驳回"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs text-[#9E9E9E]">{item.adminNote || "-"}</td>
                    <td className="py-3 px-3 text-xs text-[#9E9E9E]">
                      {new Date(item.approvedAt || item.createdAt).toLocaleString("zh-CN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
