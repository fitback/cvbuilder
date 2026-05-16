"use client";

import { useEffect, useState } from "react";
import { Coins, ChevronRight } from "./icons";
import { apiFetch } from "../lib/auth";

const API = "http://localhost:3001";

export default function PointsBalance({ onOpenModal }: { onOpenModal: () => void }) {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    apiFetch(`${API}/points/balance`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setBalance(j.data.balance);
      })
      .catch(() => {});
  }, []);

  if (balance === null) return null;

  return (
    <div className="mt-3 p-3 bg-[#F5F4F2] rounded-lg transition-colors duration-200">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-[#9E9E9E]">我的积分</span>
        <a href="/recharge" className="text-xs text-[#B75C3A] hover:text-[#9A4E31] transition-colors duration-150">
          充值
        </a>
      </div>
      <div className="flex items-baseline gap-2">
        <Coins size={18} className="text-[#B75C3A]" />
        <span className="text-xl font-bold text-[#B75C3A]">{balance}</span>
      </div>
      <div className="text-[10px] text-[#9E9E9E] mt-0.5">
        ≈ {Math.round((balance / 10) * 100) / 100} 元
      </div>
      <button
        onClick={onOpenModal}
        className="mt-2 flex items-center gap-1 text-xs text-[#9E9E9E] hover:text-[#2D2D2D] transition-colors duration-150 w-full"
      >
        积分明细
        <ChevronRight size={12} />
      </button>
    </div>
  );
}
