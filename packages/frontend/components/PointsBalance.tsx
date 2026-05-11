"use client";

import { useEffect, useState } from "react";
import { apiFetch, API_BASE } from "../lib/auth";


export default function PointsBalance({ onOpenModal }: { onOpenModal: () => void }) {
  const [balance, setBalance] = useState<number | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    apiFetch(`${API_BASE}/points/balance`)
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled && j.success) setBalance(j.data.balance);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [refreshKey]);

  useEffect(() => {
    const handler = () => setRefreshKey((k) => k + 1);
    window.addEventListener("points-updated", handler);
    return () => window.removeEventListener("points-updated", handler);
  }, []);

  if (balance === null) return null;

  return (
    <div className="mt-3 p-3 bg-surface-tertiary rounded-md">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-text-muted">我的积分</span>
        <a href="/recharge" className="text-xs text-accent hover:underline">
          充值
        </a>
      </div>
      <div className="font-[family-name:var(--font-display)] text-xl font-bold text-accent">
        {balance}
      </div>
      <div className="text-[10px] text-text-muted">
        ≈ {Math.round(balance / 10 * 100) / 100} 元
      </div>
      <button
        onClick={onOpenModal}
        className="mt-2 text-xs text-text-muted hover:text-text-secondary w-full text-left"
      >
        积分明细 →
      </button>
    </div>
  );
}
