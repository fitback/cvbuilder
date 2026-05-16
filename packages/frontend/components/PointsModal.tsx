"use client";

import { useEffect, useState } from "react";
import { PointTransactionItem } from "@cvbuilder/shared";
import { X, Spinner, Coins, ArrowUpRight, ArrowDownRight, RotateCcw } from "./icons";
import { apiFetch } from "../lib/auth";

const API = "http://localhost:3001";

const TYPE_LABELS: Record<string, string> = {
  credit: "充值",
  debit: "消费",
  refund: "退还",
};

const TYPE_COLORS: Record<string, string> = {
  credit: "text-[#5B8C5A]",
  debit: "text-[#6B6B6B]",
  refund: "text-[#C7953A]",
};

function TransactionIcon({ type }: { type: string }) {
  const cls = "w-9 h-9 rounded-full flex items-center justify-center shrink-0";
  if (type === "credit")
    return <div className={`${cls} bg-[#5B8C5A]/10`}><ArrowUpRight size={16} className="text-[#5B8C5A]" /></div>;
  if (type === "refund")
    return <div className={`${cls} bg-[#C7953A]/10`}><RotateCcw size={16} className="text-[#C7953A]" /></div>;
  return <div className={`${cls} bg-[#6B6B6B]/10`}><ArrowDownRight size={16} className="text-[#6B6B6B]" /></div>;
}

export default function PointsModal({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<PointTransactionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`${API}/points/transactions`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setItems(j.data.items ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-[fadeIn_150ms_ease-out]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto shadow-xl
                   animate-[slideUp_200ms_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Coins size={20} className="text-[#B75C3A]" />
            <h3 className="text-lg font-semibold text-[#1A1A1A]">积分明细</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#F5F4F2] active:scale-[0.95] transition-all duration-150"
            aria-label="关闭"
          >
            <X size={18} className="text-[#9E9E9E]" />
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-[#F5F4F2] rounded-lg animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center">
            <Coins size={36} className="mx-auto text-[#D4D4D4] mb-3" />
            <p className="text-sm text-[#9E9E9E]">暂无积分记录</p>
          </div>
        ) : (
          <div className="space-y-1">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 py-3 px-2 rounded-lg hover:bg-[#F5F4F2] transition-colors duration-150"
              >
                <TransactionIcon type={item.type} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[#2D2D2D]">{item.description}</div>
                  <div className="text-xs text-[#9E9E9E]">
                    {new Date(item.createdAt).toLocaleString("zh-CN")}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-sm font-medium ${TYPE_COLORS[item.type] || "text-[#6B6B6B]"}`}>
                    {item.type === "debit" ? "-" : "+"}{item.amount}
                  </div>
                  <div className="text-xs text-[#9E9E9E]">余额 {item.balance}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
