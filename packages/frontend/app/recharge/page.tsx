"use client";

import { useState } from "react";
import { Button } from "../../components/Button";
import { Coins, ChevronLeft, Check, AlertCircle, Sparkles } from "../../components/icons";
import { useToast } from "../../components/Toast";
import { apiFetch } from "../../lib/auth";

const API = "http://localhost:3001";

export default function RechargePage() {
  const [amount, setAmount] = useState("");
  const [orderNo, setOrderNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { toast } = useToast();

  async function submit() {
    setError("");
    setSuccess("");
    if (!amount || parseInt(amount) < 1) {
      toast("请输入有效的充值金额", "error");
      return;
    }
    if (!orderNo.trim()) {
      toast("请填写微信转账单号", "error");
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
      const points = parseInt(amount) * 10;
      setSuccess(`充值申请已提交，等待管理员审核。到账 ${amount} 元 × 10 = ${points} 积分`);
      toast("充值申请已提交", "success");
      setAmount("");
      setOrderNo("");
    } catch {
      toast("网络错误，请重试", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-[slideUp_300ms_ease-out]">
      <div className="flex items-center gap-2 mb-6">
        <a href="/dashboard" className="flex items-center gap-1 text-sm text-[#9E9E9E] hover:text-[#2D2D2D] transition-colors duration-150">
          <ChevronLeft size={16} />
          返回
        </a>
      </div>

      <div className="flex gap-8 flex-col md:flex-row">
        <div className="flex-1 md:max-w-[280px]">
          <div className="bg-white border border-[#EBEBEB] rounded-xl p-6 text-center">
            <div className="w-40 h-40 bg-[#F5F4F2] rounded-xl mx-auto mb-4 flex items-center justify-center">
              <Coins size={48} className="text-[#D4D4D4]" />
            </div>
            <p className="text-sm text-[#6B6B6B]">
              微信扫码转账后，填写下方信息提交审核
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#B75C3A]/5 rounded-full text-xs text-[#B75C3A] font-medium">
              <Sparkles size={14} />
              <span>10 积分 = 1 元</span>
            </div>
          </div>
        </div>

        <div className="flex-1">
          <div className="bg-white border border-[#EBEBEB] rounded-xl p-6">
            <h2 className="text-xl font-semibold text-[#1A1A1A] mb-6">积分充值</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#2D2D2D] mb-1.5">充值金额（元）</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="输入充值金额"
                  className="w-full px-3 py-2.5 border border-[#D4D4D4] rounded-lg text-sm focus:border-[#B75C3A] focus:ring-2 focus:ring-[#B75C3A]/15 outline-none transition-all duration-150"
                />
                {amount && parseInt(amount) >= 1 && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-[#5B8C5A]">
                    <Check size={14} />
                    <span>到账积分：{parseInt(amount) * 10}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2D2D2D] mb-1.5">微信转账单号</label>
                <input
                  value={orderNo}
                  onChange={(e) => setOrderNo(e.target.value)}
                  placeholder="从微信支付记录复制转账单号"
                  className="w-full px-3 py-2.5 border border-[#D4D4D4] rounded-lg text-sm focus:border-[#B75C3A] focus:ring-2 focus:ring-[#B75C3A]/15 outline-none transition-all duration-150"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
                  <AlertCircle size={16} className="shrink-0 text-[#C75B5B]" />
                  <span className="text-sm text-[#C75B5B]">{error}</span>
                </div>
              )}
              {success && (
                <div className="flex items-center gap-2 p-3 bg-[#5B8C5A]/5 border border-[#5B8C5A]/20 rounded-lg">
                  <Check size={16} className="shrink-0 text-[#5B8C5A]" />
                  <span className="text-sm text-[#5B8C5A]">{success}</span>
                </div>
              )}

              <Button
                variant="primary"
                size="lg"
                className="w-full"
                loading={loading}
                disabled={!amount || !orderNo}
                onClick={submit}
              >
                提交审核
              </Button>
            </div>
          </div>

          <div className="mt-4 text-center">
            <a href="/recharge/history" className="inline-flex items-center gap-1 text-sm text-[#B75C3A] hover:text-[#9A4E31] transition-colors duration-150">
              查看充值记录
              <ChevronLeft size={14} className="rotate-180" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
