"use client";

import { useState } from "react";
import { setToken, API_BASE } from "../lib/auth";


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
      const res = await fetch(`${API_BASE}/auth/${endpoint}`, {
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-surface rounded-lg p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
        {giftNotice && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded">
            {giftNotice}
          </div>
        )}
        <div className="flex mb-6">
          <button
            onClick={() => setTab("login")}
            className={`flex-1 pb-2 text-sm font-medium border-b-2 transition-colors ${tab === "login" ? "border-accent text-accent" : "border-border-light text-text-muted"}`}
          >
            登录
          </button>
          <button
            onClick={() => setTab("register")}
            className={`flex-1 pb-2 text-sm font-medium border-b-2 transition-colors ${tab === "register" ? "border-accent text-accent" : "border-border-light text-text-muted"}`}
          >
            注册
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">手机号</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="输入手机号"
              className="w-full px-3 py-2 border border-border rounded text-sm focus:border-accent focus:ring-2 focus:ring-accent/15 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少6位"
              className="w-full px-3 py-2 border border-border rounded text-sm focus:border-accent focus:ring-2 focus:ring-accent/15 outline-none"
            />
          </div>

          {error && <div className="text-sm text-error">{error}</div>}

          <button
            onClick={submit}
            disabled={loading || !phone || !password}
            className="w-full py-2.5 bg-accent text-white rounded text-sm font-medium hover:bg-accent-hover disabled:opacity-40 transition-colors"
          >
            {loading ? "请稍候..." : tab === "login" ? "登录" : "注册"}
          </button>
        </div>
      </div>
    </div>
  );
}
