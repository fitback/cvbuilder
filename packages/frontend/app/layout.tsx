"use client";

import { useState, useEffect } from "react";
import AuthModal from "../components/AuthModal";
import PointsBalance from "../components/PointsBalance";
import PointsModal from "../components/PointsModal";
import { isLoggedIn, clearToken, apiFetch } from "../lib/auth";
import "./globals.css";

const API = "http://localhost:3001";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [showAuth, setShowAuth] = useState(false);
  const [userPhone, setUserPhone] = useState("");
  const [showPoints, setShowPoints] = useState(false);

  useEffect(() => {
    if (isLoggedIn()) {
      apiFetch(`${API}/auth/me`).then((r) => r.json()).then((j) => {
        if (j.success) setUserPhone(j.data.phone);
      });
    }
  }, []);

  return (
    <html lang="zh-CN">
      <body className="min-h-screen">
        {showPoints && <PointsModal onClose={() => setShowPoints(false)} />}
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} onLogin={() => {
          apiFetch(`${API}/auth/me`).then((r) => r.json()).then((j) => {
            if (j.success) setUserPhone(j.data.phone);
          });
        }} />}

        <div className="flex min-h-screen pb-14 md:pb-0">
          <aside className="hidden md:flex flex-col w-[200px] bg-surface border-r border-border-light p-4 shrink-0">
            <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold mb-8">ResumeMatcher</h1>
            <nav className="flex flex-col gap-1 flex-1">
              <a href="/dashboard" className="px-3 py-2 rounded text-sm text-accent bg-surface-tertiary font-medium">仪表盘</a>
              <a href="/upload" className="px-3 py-2 rounded text-sm text-text-secondary hover:bg-surface-tertiary">上传简历</a>
              <a href="/jobs" className="px-3 py-2 rounded text-sm text-text-secondary hover:bg-surface-tertiary">我的 JD</a>
              <a href="/recharge" className="px-3 py-2 rounded text-sm text-text-secondary hover:bg-surface-tertiary">充值</a>
            </nav>
            <PointsBalance onOpenModal={() => setShowPoints(true)} />
            <a href="/privacy" className="text-[10px] text-text-muted hover:text-text-secondary px-1 py-1">隐私协议</a>
            <div className="pt-4 border-t border-border-light">
              {userPhone ? (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-secondary">{userPhone}</span>
                  <button
                    onClick={() => { clearToken(); setUserPhone(""); }}
                    className="text-xs text-text-muted hover:text-error"
                  >
                    退出
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuth(true)}
                  className="w-full px-3 py-2 text-sm text-accent border border-accent rounded hover:bg-accent/5 transition-colors"
                >
                  登录 / 注册
                </button>
              )}
            </div>
          </aside>
          <main className="flex-1 p-4 md:p-6 max-w-[960px]">{children}</main>
        </div>

        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-surface border-t border-border-light flex justify-around py-2 z-50">
          <a href="/dashboard" className="flex flex-col items-center text-xs text-accent">📄 仪表盘</a>
          <a href="/upload" className="flex flex-col items-center text-xs text-text-secondary">📤 上传</a>
          <a href="/jobs" className="flex flex-col items-center text-xs text-text-secondary">📋 JD</a>
          {userPhone ? (
            <button onClick={() => { clearToken(); setUserPhone(""); }} className="flex flex-col items-center text-xs text-text-muted">
              👤 退出
            </button>
          ) : (
            <button onClick={() => setShowAuth(true)} className="flex flex-col items-center text-xs text-accent">
              👤 登录
            </button>
          )}
        </nav>
      </body>
    </html>
  );
}
