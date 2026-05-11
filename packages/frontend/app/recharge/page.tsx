"use client";

import { useState } from "react";
import { apiFetch } from "../../lib/auth";

const API = "http://localhost:3001";

export default function RechargePage() {
  const [amount, setAmount] = useState("");
  const [orderNo, setOrderNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit() {
    setError("");
    setSuccess("");
    if (!amount || parseInt(amount) < 1) {
      setError("请输入有效的充值金额");
      return;
    }
    if (!orderNo.trim()) {
      setError("请填写微信转账单号");
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch(`${API}/recharges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parseInt(amount), orderNo: orderNo.trim() }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "提交失败");
        return;
      }
      setSuccess(`充值申请已提交，等待管理员审核。到账 ${amount} 元 × 10 = ${parseInt(amount) * 10} 积分`);
      setAmount("");
      setOrderNo("");
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <a href="/dashboard" className="text-text-muted hover:text-text-secondary text-sm">← 返回</a>
        <h2 className="text-xl font-semibold">积分充值</h2>
      </div>

      <div className="flex gap-8 flex-col md:flex-row">
        <div className="flex-1 md:max-w-[280px]">
          <div className="bg-surface border border-border-light rounded-md p-6 text-center">
            <div className="w-40 h-40 bg-surface-tertiary rounded mx-auto mb-4 flex items-center justify-center">
              <span className="text-text-muted text-sm">微信收款码</span>
            </div>
            <p className="text-sm text-text-secondary">
              微信扫码转账后，填写下方信息提交审核
            </p>
            <p className="text-xs text-text-muted mt-1">10积分 = 1元</p>
          </div>
        </div>

        <div className="flex-1">
          <div className="bg-surface border border-border-light rounded-md p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">充值金额（元）</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="输入充值金额"
                  className="w-full px-3 py-2 border border-border rounded text-sm focus:border-accent focus:ring-2 focus:ring-accent/15 outline-none"
                />
                {amount && parseInt(amount) >= 1 && (
                  <p className="text-xs text-text-muted mt-1">
                    到账积分：{parseInt(amount) * 10}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">微信转账单号</label>
                <input
                  value={orderNo}
                  onChange={(e) => setOrderNo(e.target.value)}
                  placeholder="从微信支付记录复制转账单号"
                  className="w-full px-3 py-2 border border-border rounded text-sm focus:border-accent focus:ring-2 focus:ring-accent/15 outline-none"
                />
              </div>

              {error && <div className="text-sm text-error p-3 bg-red-50 rounded">{error}</div>}
              {success && <div className="text-sm text-green-700 p-3 bg-green-50 rounded">{success}</div>}

              <button
                onClick={submit}
                disabled={loading || !amount || !orderNo}
                className="w-full py-2.5 bg-accent text-white rounded text-sm font-medium hover:bg-accent-hover disabled:opacity-40 transition-colors"
              >
                {loading ? "提交中..." : "提交审核"}
              </button>
            </div>
          </div>

          <div className="mt-4 text-center">
            <a href="/recharge/history" className="text-sm text-accent hover:underline">
              查看充值记录 →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
