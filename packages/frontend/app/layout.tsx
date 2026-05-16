"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import AuthModal from "../components/AuthModal";
import PointsBalance from "../components/PointsBalance";
import PointsModal from "../components/PointsModal";
import { ToastProvider } from "../components/Toast";
import { LayoutDashboard, Upload, Briefcase, Coins, User, LogOut } from "../components/icons";
import { isLoggedIn, clearToken, apiFetch } from "../lib/auth";
import "./globals.css";


const navItems = [
  { href: "/dashboard", label: "仪表盘", icon: LayoutDashboard },
  { href: "/upload", label: "上传简历", icon: Upload },
  { href: "/jobs", label: "我的 JD", icon: Briefcase },
  { href: "/recharge", label: "充值", icon: Coins },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [showAuth, setShowAuth] = useState(false);
  const [userPhone, setUserPhone] = useState("");
  const [showPoints, setShowPoints] = useState(false);

  useEffect(() => {
    if (isLoggedIn()) {
      apiFetch(`${API_BASE}/auth/me`).then((r) => r.json()).then((j) => {
        if (j.success) setUserPhone(j.data.phone);
      });
    }
  }, []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <html lang="zh-CN">
      <body className="min-h-screen">
        <ToastProvider>
          {showPoints && <PointsModal onClose={() => setShowPoints(false)} />}
          {showAuth && <AuthModal onClose={() => setShowAuth(false)} onLogin={() => {
            apiFetch(`${API}/auth/me`).then((r) => r.json()).then((j) => {
              if (j.success) setUserPhone(j.data.phone);
            });
          }} />}

          <div className="flex min-h-screen pb-16 md:pb-0">
            <aside className="hidden md:flex flex-col w-[220px] bg-white border-r border-[#EBEBEB] p-4 shrink-0">
              <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold mb-8 text-[#1A1A1A] tracking-tight">
                ResumeMatcher
              </h1>
              <nav className="flex flex-col gap-1 flex-1">
                {navItems.map(({ href, label, icon: Icon }) => {
                  const active = isActive(href);
                  return (
                    <a
                      key={href}
                      href={href}
                      className={`flex items-center gap-2.5 pl-[9px] pr-3 py-2.5 rounded-r-lg text-sm
                        border-l-[3px] border-transparent
                        transition-all duration-150 ease-out
                        active:scale-[0.98]
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B75C3A]/30
                        ${active
                          ? "bg-[#F5F4F2] text-[#B75C3A] font-medium border-[#B75C3A]"
                          : "text-[#6B6B6B] hover:bg-[#F5F4F2] hover:text-[#2D2D2D]"
                        }`}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon size={18} />
                      {label}
                    </a>
                  );
                })}
              </nav>
              <PointsBalance onOpenModal={() => setShowPoints(true)} />
              <div className="pt-4 border-t border-[#EBEBEB] mt-4">
                {userPhone ? (
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs text-[#6B6B6B] truncate max-w-[120px]">{userPhone}</span>
                    <button
                      onClick={() => { clearToken(); setUserPhone(""); }}
                      className="flex items-center gap-1 text-xs text-[#9E9E9E] hover:text-[#C75B5B] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C75B5B]/30 focus-visible:rounded"
                    >
                      <LogOut size={14} />
                      退出
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAuth(true)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm text-[#B75C3A] border border-[#D4D4D4] rounded-lg
                               hover:bg-[#F5F4F2] active:scale-[0.98] transition-all duration-150 ease-out
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B75C3A]/30"
                  >
                    <User size={16} />
                    登录 / 注册
                  </button>
                )}
              </div>
            </aside>
            <main className="flex-1 p-4 md:p-6 max-w-[960px] min-w-0">
              <div key={pathname} className="animate-[fadeIn_200ms_ease-out]">{children}</div>
            </main>
          </div>

          <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-[#EBEBEB] flex justify-around items-center py-1 z-50 safe-area-bottom">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = isActive(href);
              return (
                <a
                  key={href}
                  href={href}
                  className={`flex flex-col items-center gap-0.5 px-3 pt-[4px] pb-1.5 min-w-[56px] text-xs
                    border-t-2 border-transparent
                    transition-colors duration-150
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B75C3A]/30 focus-visible:ring-inset
                    ${active ? "text-[#B75C3A] border-[#B75C3A]" : "text-[#9E9E9E] hover:text-[#6B6B6B]"}`}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon size={20} />
                  <span className="leading-tight">{label}</span>
                </a>
              );
            })}
            {userPhone ? (
              <button
                onClick={() => { clearToken(); setUserPhone(""); }}
                className="flex flex-col items-center gap-0.5 px-3 pt-[4px] pb-1.5 min-w-[56px] text-xs text-[#9E9E9E] hover:text-[#C75B5B] border-t-2 border-transparent transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C75B5B]/30 focus-visible:ring-inset"
              >
                <LogOut size={20} />
                <span className="leading-tight">退出</span>
              </button>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="flex flex-col items-center gap-0.5 px-3 pt-[4px] pb-1.5 min-w-[56px] text-xs text-[#B75C3A] border-t-2 border-transparent transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B75C3A]/30 focus-visible:ring-inset"
              >
                <User size={20} />
                <span className="leading-tight">登录</span>
              </button>
            )}
          </nav>
        </ToastProvider>
      </body>
    </html>
  );
}
