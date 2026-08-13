"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "../components/Button";
import AuthModal from "../components/AuthModal";
import PointsBalance from "../components/PointsBalance";
import PointsModal from "../components/PointsModal";
import { ToastProvider } from "../components/Toast";
import { LayoutDashboard, Upload, Briefcase, Coins, User, LogOut, ShieldAlert } from "../components/icons";
import { isLoggedIn, clearToken, apiFetch, API_BASE } from "../lib/auth";
import "./globals.css";

const API = API_BASE;

const adminNavItem = { href: "/admin", label: "管理", icon: ShieldAlert };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [showAuth, setShowAuth] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [userPhone, setUserPhone] = useState("");
  const [userRole, setUserRole] = useState("");
  const [showPoints, setShowPoints] = useState(false);

  const isPublicPage = pathname === "/" || pathname === "/privacy";
  const loggedIn = isLoggedIn();

  // Route guard: redirect to login page if not authenticated
  useEffect(() => {
    if (!loggedIn && !isPublicPage) {
      router.replace("/");
    }
  }, [loggedIn, isPublicPage, router]);

  const navItems = [
    { href: "/dashboard", label: "仪表盘", icon: LayoutDashboard },
    { href: "/upload", label: "上传简历", icon: Upload },
    { href: "/jobs", label: "我的 JD", icon: Briefcase },
    ...(userRole !== "admin" ? [{ href: "/recharge", label: "充值", icon: Coins }] : []),
  ];

  const allNavItems = userRole === "admin" ? [...navItems, adminNavItem] : navItems;

  useEffect(() => {
    if (loggedIn) {
      apiFetch(`${API}/auth/me`).then((r) => r.json()).then((j) => {
        if (j.success) {
          setUserPhone(j.data.phone);
          setUserRole(j.data.role);
        }
      });
    } else {
      setUserPhone("");
      setUserRole("");
    }
  }, [loggedIn]);

  // 会话过期（apiFetch 收到 401 后触发）：清空用户信息，路由守卫自动跳转登录页
  useEffect(() => {
    const handler = () => {
      setUserPhone("");
      setUserRole("");
    };
    window.addEventListener("auth-expired", handler);
    return () => window.removeEventListener("auth-expired", handler);
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
          {showLogoutConfirm && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-[fadeIn_150ms_ease-out]" onClick={() => setShowLogoutConfirm(false)}>
              <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4 shadow-xl animate-[slideUp_200ms_ease-out]" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">确认退出</h3>
                <p className="text-sm text-[#6B6B6B] mb-6">确定要退出登录吗？</p>
                <div className="flex gap-3 justify-end">
                  <Button variant="secondary" size="sm" onClick={() => setShowLogoutConfirm(false)}>
                    取消
                  </Button>
                  <Button variant="danger" size="sm" icon={<LogOut size={14} />} onClick={() => {
                    clearToken();
                    setUserPhone("");
                    setUserRole("");
                    setShowLogoutConfirm(false);
                    router.push("/");
                  }}>
                    确认退出
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="flex min-h-screen pb-16 md:pb-0">
            <aside className="hidden md:flex flex-col w-[220px] bg-white border-r border-[#EBEBEB] p-4 shrink-0">
              <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold mb-8 text-[#1A1A1A] tracking-tight">
                ResumeMatcher
              </h1>
              <nav className="flex flex-col gap-1 flex-1">
                {allNavItems.map(({ href, label, icon: Icon }) => {
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
              {userRole !== "admin" && <PointsBalance onOpenModal={() => setShowPoints(true)} />}
              <div className="pt-4 border-t border-[#EBEBEB] mt-4">
                {userPhone ? (
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs text-[#6B6B6B] truncate max-w-[120px]">{userPhone}</span>
                    <button
                      onClick={() => setShowLogoutConfirm(true)}
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
            {allNavItems.map(({ href, label, icon: Icon }) => {
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
                onClick={() => setShowLogoutConfirm(true)}
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

          <footer className="py-3 text-center text-xs text-[#9E9E9E]">
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#6B6B6B] transition-colors duration-150"
            >
              沪ICP备2026028917号-1
            </a>
          </footer>
        </ToastProvider>
      </body>
    </html>
  );
}
