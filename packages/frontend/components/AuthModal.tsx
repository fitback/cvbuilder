"use client";

import { useState } from "react";
import { Button } from "./Button";
import { User, X, Sparkles, AlertCircle, Check } from "./icons";
import { setToken } from "../lib/auth";

const API = "http://localhost:3001";

export default function AuthModal({ onClose, onLogin }: { onClose: () => void; onLogin: (phone: string) => void }) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [giftNotice, setGiftNotice] = useState("");

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
        setError(json.error?.message ?? "操作失败");
        return;
      }
      setToken(json.data.token);
      if (tab === "register") {
        setGiftNotice("注册成功！已赠送 30 积分，快去试试 AI 分析吧");
        setTimeout(() => setGiftNotice(""), 4000);
      }
      onLogin(json.data.userId);
      onClose();
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-[fadeIn_150ms_ease-out]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl animate-[slideUp_200ms_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <User size={20} className="text-[#B75C3A]" />
            <h3 className="text-lg font-semibold text-[#1A1A1A]">{tab === "login" ? "登录" : "注册"}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#F5F4F2] active:scale-[0.95] transition-all duration-150"
            aria-label="关闭"
          >
            <X size={18} className="text-[#9E9E9E]" />
          </button>
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
              注册即赠送 <strong className="text-[#B75C3A]">30</strong> 积分
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
