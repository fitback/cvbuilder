"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../components/Button";
import { User, Sparkles, AlertCircle, Target, FileText, Download } from "../components/icons";
import { setToken, isLoggedIn, API_BASE } from "../lib/auth";
import { getErrorMessage } from "../lib/error-codes";
import { useEffect } from "react";

const API = API_BASE;

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [giftNotice, setGiftNotice] = useState("");

  useEffect(() => {
    if (isLoggedIn()) router.replace("/dashboard");
  }, [router]);

  async function submit() {
    setError("");
    setLoading(true);
    try {
      const endpoint = tab === "login" ? "login" : "register";
      const res = await fetch(`${API}/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(getErrorMessage(json));
        return;
      }
      setToken(json.data.token);
      if (tab === "register") {
        setGiftNotice("注册成功！已赠送 50 积分");
        setTimeout(() => setGiftNotice(""), 4000);
      }
      // Navigate to dashboard on success
      router.push("/dashboard");
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-[fadeIn_200ms_ease-out] min-h-[calc(100vh-3rem)] flex items-center justify-center -mx-4 md:-mx-6 -mt-4 md:-mt-6">
      <div className="flex flex-col md:flex-row w-full max-w-4xl mx-auto md:min-h-[600px]">
        {/* Left: Branding / Features */}
        <div className="md:w-1/2 bg-gradient-to-br from-[#B75C3A] to-[#9A4E31] p-8 md:p-12 flex flex-col justify-between text-white md:rounded-l-xl">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl font-bold mb-3 leading-tight">
              ResumeMatcher
            </h1>
            <p className="text-white/80 text-sm md:text-base leading-relaxed mb-8">
              AI 驱动的简历优化平台，帮你匹配理想岗位
            </p>
            <div className="space-y-4">
              {[
                { icon: Target, text: "AI 智能分析匹配度" },
                { icon: Sparkles, text: "一键生成优化简历" },
                { icon: FileText, text: "在线编辑 · PDF 导出" },
                { icon: Download, text: "免费分析 3 次，无需信用卡" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                    <Icon size={16} className="text-white" />
                  </div>
                  <span className="text-sm text-white/90">{text}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-white/50 mt-8">为求职者打造的智能简历工具</p>
        </div>

        {/* Right: Auth Form */}
        <div className="md:w-1/2 bg-white p-8 md:p-12 flex flex-col justify-center md:rounded-r-xl border border-[#EBEBEB] md:border-l-0">
          <div className="max-w-sm mx-auto w-full">
            <div className="flex items-center gap-2 mb-6">
              <User size={20} className="text-[#B75C3A]" />
              <h2 className="text-xl font-semibold text-[#1A1A1A]">
                {tab === "login" ? "欢迎回来" : "创建账号"}
              </h2>
            </div>

            {giftNotice && (
              <div className="mb-4 flex items-center gap-2 p-3 bg-[#5B8C5A]/5 border border-[#5B8C5A]/20 rounded-lg">
                <Sparkles size={16} className="shrink-0 text-[#5B8C5A]" />
                <span className="text-sm text-[#5B8C5A]">{giftNotice}</span>
              </div>
            )}

            <div className="flex mb-6 bg-[#F5F4F2] rounded-lg p-1">
              <button
                onClick={() => { setTab("login"); setError(""); }}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-150 ${
                  tab === "login" ? "bg-white text-[#B75C3A] shadow-sm" : "text-[#9E9E9E] hover:text-[#6B6B6B]"
                }`}
              >
                登录
              </button>
              <button
                onClick={() => { setTab("register"); setError(""); }}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-150 ${
                  tab === "register" ? "bg-white text-[#B75C3A] shadow-sm" : "text-[#9E9E9E] hover:text-[#6B6B6B]"
                }`}
              >
                注册
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#2D2D2D] mb-1.5">手机号</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="输入手机号"
                  className="w-full px-3 py-2.5 border border-[#D4D4D4] rounded-lg text-sm focus:border-[#B75C3A] focus:ring-2 focus:ring-[#B75C3A]/15 outline-none transition-all duration-150"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#2D2D2D] mb-1.5">密码</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="至少 6 位"
                  className="w-full px-3 py-2.5 border border-[#D4D4D4] rounded-lg text-sm focus:border-[#B75C3A] focus:ring-2 focus:ring-[#B75C3A]/15 outline-none transition-all duration-150"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
                  <AlertCircle size={16} className="shrink-0 text-[#C75B5B]" />
                  <span className="text-sm text-[#C75B5B]">{error}</span>
                </div>
              )}

              <Button
                variant="primary"
                size="lg"
                className="w-full"
                loading={loading}
                disabled={!phone || !password}
                onClick={submit}
              >
                {tab === "login" ? "登录" : "注册"}
              </Button>

              {tab === "register" && (
                <p className="text-xs text-[#9E9E9E] text-center">
                  注册即赠送 <strong className="text-[#B75C3A]">50</strong> 积分
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
