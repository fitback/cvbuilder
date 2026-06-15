"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "../../components/Button";
import { Coins, ChevronLeft, Check, AlertCircle } from "../../components/icons";
import { useToast } from "../../components/Toast";
import { apiFetch, API_BASE } from "../../lib/auth";

const API = API_BASE;

const PLANS = [
  { amount: 10, points: 100, label: "10 元", desc: "100 积分" },
  { amount: 20, points: 200, label: "20 元", desc: "200 积分", popular: true },
  { amount: 50, points: 500, label: "50 元", desc: "500 积分" },
];

export default function RechargePage() {
  const [selected, setSelected] = useState(20);
  const [step, setStep] = useState<"select" | "pay" | "done">("select");
  const [paymentPage, setPaymentPage] = useState("");
  const [outTradeNo, setOutTradeNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [credits, setCredits] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const payWindowRef = useRef<Window | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  async function createOrder(amount: number) {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch(`${API}/recharges/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "创建订单失败");
        return;
      }
      const d = json.data;
      setPaymentPage(d.codeUrl);
      setOutTradeNo(d.outTradeNo);
      setCredits(d.points);
      setStep("pay");
      startPolling(d.outTradeNo);
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  function openPayment() {
    if (payWindowRef.current && !payWindowRef.current.closed) {
      payWindowRef.current.focus();
      return;
    }
    // 打开新窗口并写入支付宝支付表单 HTML，表单会自动提交
    payWindowRef.current = window.open("", "_blank");
    if (payWindowRef.current) {
      payWindowRef.current.document.write(paymentPage);
      payWindowRef.current.document.close();
    }
  }

  useEffect(() => {
    if (step === "pay" && paymentPage) {
      // 自动打开支付窗口
      const timer = setTimeout(() => openPayment(), 500);
      return () => clearTimeout(timer);
    }
  }, [step, paymentPage]);

  function startPolling(tradeNo: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await apiFetch(`${API}/recharges/status/${tradeNo}`);
        const json = await res.json();
        if (json.success && json.data?.status === "approved") {
          clearInterval(pollRef.current!);
          setStep("done");
          window.dispatchEvent(new Event("points-updated"));
          toast(`充值成功！到账 ${json.data.points} 积分`, "success");
        }
      } catch {}
    }, 3000);
  }

  function reset() {
    setStep("select");
    setPaymentPage("");
    setOutTradeNo("");
    setError("");
  }

  if (step === "pay") {
    return (
      <div className="animate-[fadeIn_200ms_ease-out] max-w-md mx-auto py-8">
        <div className="flex items-center gap-2 mb-6">
          <button onClick={reset} className="flex items-center gap-1 text-sm text-[#9E9E9E] hover:text-[#2D2D2D] transition-colors">
            <ChevronLeft size={16} /> 返回
          </button>
        </div>
        <div className="bg-white border border-[#EBEBEB] rounded-xl p-6 text-center">
          <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">支付宝网页支付</h3>
          <p className="text-sm text-[#6B6B6B] mb-6">已为您打开支付宝支付页面，请在页面中完成支付</p>
          <div className="w-16 h-16 rounded-full bg-[#B75C3A]/10 flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 border-2 border-[#B75C3A] border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-lg font-bold text-[#B75C3A] mb-2">
            ¥{PLANS.find(p => p.amount === selected)?.amount}
          </p>
          <p className="text-xs text-[#9E9E9E] mb-4">支付完成后自动到账，无需等待审核</p>
          <p className="text-xs text-[#6B6B6B] mb-4">订单号：{outTradeNo}</p>
          <Button variant="secondary" size="sm" onClick={openPayment}>
            重新打开支付页面
          </Button>
        </div>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="animate-[fadeIn_200ms_ease-out] max-w-md mx-auto py-8">
        <div className="bg-white border border-[#EBEBEB] rounded-xl p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-[#5B8C5A]/10 flex items-center justify-center mx-auto mb-4">
            <Check size={28} className="text-[#5B8C5A]" />
          </div>
          <h3 className="text-xl font-semibold text-[#1A1A1A] mb-2">充值成功</h3>
          <p className="text-sm text-[#6B6B6B] mb-4">积分已到账</p>
          <div className="flex items-baseline justify-center gap-2 mb-6">
            <Coins size={20} className="text-[#B75C3A]" />
            <span className="text-3xl font-bold text-[#B75C3A]">+{credits}</span>
          </div>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" size="sm" onClick={reset}>
              继续充值
            </Button>
            <a href="/dashboard">
              <Button variant="primary" size="sm">返回仪表盘</Button>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-[slideUp_300ms_ease-out] max-w-md mx-auto py-8">
      <div className="flex items-center gap-2 mb-6">
        <a href="/dashboard" className="flex items-center gap-1 text-sm text-[#9E9E9E] hover:text-[#2D2D2D] transition-colors">
          <ChevronLeft size={16} /> 返回
        </a>
      </div>

      <h2 className="text-xl font-semibold text-[#1A1A1A] mb-1">充值积分</h2>
      <p className="text-sm text-[#6B6B6B] mb-6">选择充值金额，跳转支付宝完成支付后自动到账</p>

      <div className="space-y-3 mb-6">
        {PLANS.map((plan) => (
          <label
            key={plan.amount}
            className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-150 relative
              ${selected === plan.amount
                ? "border-[#B75C3A] bg-[#B75C3A]/5"
                : "border-[#EBEBEB] hover:border-[#D4D4D4] hover:bg-[#FAFAF9]"
              }`}
          >
            <input
              type="radio"
              name="plan"
              value={plan.amount}
              checked={selected === plan.amount}
              onChange={() => setSelected(plan.amount)}
              className="accent-[#B75C3A] mr-3"
            />
            <div className="flex-1">
              <div className="text-base font-semibold text-[#2D2D2D]">{plan.label}</div>
              <div className="text-sm text-[#6B6B6B]">获得 {plan.desc}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-[#9E9E9E]">
                ¥{plan.amount} = {plan.points} 积分
              </div>
            </div>
            {plan.popular && (
              <span className="absolute -top-2 right-3 px-2 py-0.5 bg-[#B75C3A] text-white text-xs rounded-full">
                推荐
              </span>
            )}
          </label>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-[#C75B5B]/10 rounded-lg text-sm text-[#C75B5B]">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <Button
        variant="primary"
        size="lg"
        icon={<Coins size={18} />}
        loading={loading}
        onClick={() => createOrder(selected)}
        className="w-full"
      >
        确认充值 ¥{selected}
      </Button>

      <p className="text-xs text-[#9E9E9E] text-center mt-4">
        充值比例 1 元 = 10 积分 · 支付完成后自动到账
      </p>

      <div className="mt-8">
        <a href="/recharge/history" className="text-sm text-[#B75C3A] hover:underline">
          查看充值记录 →
        </a>
      </div>
    </div>
  );
}
