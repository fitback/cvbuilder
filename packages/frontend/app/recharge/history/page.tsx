"use client";

import { useEffect, useState } from "react";
import { RechargeItem } from "@cvbuilder/shared";
import { Button } from "../../../components/Button";
import { Coins, ChevronLeft, Check, X, Clock } from "../../../components/icons";
import { apiFetch } from "../../../lib/auth";

const API = "http://localhost:3001";

const STATUS_MAP: Record<string, { label: string; icon: typeof Check; className: string }> = {
  pending: { label: "待审核", icon: Clock, className: "bg-[#C7953A]/10 text-[#C7953A]" },
  approved: { label: "已通过", icon: Check, className: "bg-[#5B8C5A]/10 text-[#5B8C5A]" },
  rejected: { label: "已驳回", icon: X, className: "bg-[#C75B5B]/10 text-[#C75B5B]" },
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
    <div className="animate-[slideUp_300ms_ease-out]">
      <div className="flex items-center gap-2 mb-6">
        <a href="/recharge" className="flex items-center gap-1 text-sm text-[#9E9E9E] hover:text-[#2D2D2D] transition-colors duration-150">
          <ChevronLeft size={16} />
          返回
        </a>
      </div>

      <div className="flex items-center gap-2 mb-6">
        <Coins size={22} className="text-[#B75C3A]" />
        <h2 className="text-xl font-semibold text-[#1A1A1A]">充值记录</h2>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-[#F5F4F2] rounded-lg animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Coins size={56} className="text-[#D4D4D4] mb-4" />
          <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">暂无充值记录</h3>
          <p className="text-sm text-[#6B6B6B] mb-6">还没有提交过充值申请</p>
          <a href="/recharge">
            <Button variant="primary">去充值</Button>
          </a>
        </div>
      ) : (
        <div className="space-y-1">
          {items.map((item) => {
            const status = STATUS_MAP[item.status] || { label: item.status, icon: Clock, className: "bg-[#F5F4F2] text-[#9E9E9E]" };
            const StatusIcon = status.icon;
            return (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 bg-white border border-[#EBEBEB] rounded-lg
                           hover:border-[#D4D4D4] hover:shadow-sm hover:-translate-y-[0.5px]
                           transition-all duration-200 ease-out active:scale-[0.995]"
              >
                <div>
                  <div className="text-sm font-medium text-[#2D2D2D]">{item.amount} 元 → {item.points} 积分</div>
                  <div className="text-xs text-[#9E9E9E] mt-1">
                    单号：<span className="font-mono">{item.orderNo}</span>
                    <span className="mx-1">·</span>
                    {new Date(item.createdAt).toLocaleString("zh-CN")}
                  </div>
                  {item.adminNote && (
                    <div className="text-xs text-[#9E9E9E] mt-0.5">备注：{item.adminNote}</div>
                  )}
                </div>
                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${status.className}`}>
                  <StatusIcon size={12} />
                  {status.label}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
