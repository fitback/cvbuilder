"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "../components/Button";
import AuthModal from "../components/AuthModal";
import PointsBalance from "../components/PointsBalance";
import PointsModal from "../components/PointsModal";
import { ToastProvider } from "../components/Toast";
import { LayoutDashboard, Upload, Briefcase, Coins, User, LogOut, ShieldAlert } from "../components/icons";
import { isLoggedIn, clearToken, apiFetch, API_BASE } from "../lib/auth";
import { useModalA11y } from "../lib/useModalA11y";
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
  const [parsingCount, setParsingCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState<{ state: "idle" | "saving" | "error"; time: string } | null>(null);
  const [showMobileAccount, setShowMobileAccount] = useState(false);
  const logoutDialogRef = useModalA11y(showLogoutConfirm, () => setShowLogoutConfirm(false));
  const accountDialogRef = useModalA11y(showMobileAccount, () => setShowMobileAccount(false));

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

  useEffect(() => {
    if (!loggedIn) { setParsingCount(0); return; }
    const check = () => {
      apiFetch(`${API}/resumes`).then(r => r.json()).then(j => {
        if (j.success && Array.isArray(j.data)) {
          setParsingCount(j.data.filter((r: any) => r.parseStatus === "parsing").length);
        }
      }).catch(() => {});
    };
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [loggedIn]);

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      setSaveStatus(e.detail);
    };
    window.addEventListener("save-status" as any, handler as any);
    return () => window.removeEventListener("save-status" as any, handler as any);
  }, []);

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
    <html lang="zh-CN" suppressHydrationWarning>
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
              <div ref={logoutDialogRef} role="dialog" aria-modal="true" aria-labelledby="logout-dialog-title" className="bg-white rounded-xl p-6 w-full max-w-sm mx-4 shadow-xl animate-[slideUp_200ms_ease-out]" onClick={(e) => e.stopPropagation()}>
                <h3 id="logout-dialog-title" className="text-lg font-semibold text-[#1A1A1A] mb-2">确认退出</h3>
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
          {showMobileAccount && (
            <div className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end z-[60] animate-[fadeIn_150ms_ease-out]" onClick={() => setShowMobileAccount(false)}>
              <div ref={accountDialogRef} role="dialog" aria-modal="true" aria-labelledby="mobile-account-title" className="bg-white w-full rounded-t-2xl p-5 pb-8 shadow-xl animate-[slideUp_200ms_ease-out]" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                  <h2 id="mobile-account-title" className="text-lg font-semibold text-[#1A1A1A]">我的</h2>
                  <button onClick={() => setShowMobileAccount(false)} className="text-sm text-[#9E9E9E] hover:text-[#2D2D2D]" aria-label="关闭我的面板">关闭</button>
                </div>
                {userPhone && <p className="text-sm text-[#6B6B6B] mb-4">{userPhone}</p>}
                {userPhone ? (
                  <button
                    onClick={() => { setShowMobileAccount(false); setShowLogoutConfirm(true); }}
                    className="flex items-center gap-2 w-full min-h-[44px] mt-3 px-3 py-2.5 text-sm text-[#C75B5B] border border-[#F1D0D0] rounded-lg"
                  >
                    <LogOut size={16} />退出登录
                  </button>
                ) : (
                  <button
                    onClick={() => { setShowMobileAccount(false); setShowAuth(true); }}
                    className="flex items-center gap-2 w-full min-h-[44px] mt-3 px-3 py-2.5 text-sm text-[#B75C3A] border border-[#D4D4D4] rounded-lg"
                  >
                    <User size={16} />登录 / 注册
                  </button>
                )}
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
                    <Link
                      key={href}
                      href={href}
                      prefetch={false}
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
                      <span className="relative">
                        <Icon size={18} />
                        {href === "/dashboard" && parsingCount > 0 && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#C75B5B] rounded-full" />
                        )}
                      </span>
                      {label}
                    </Link>
                  );
                })}
              </nav>
              {loggedIn && userRole !== "admin" && <PointsBalance onOpenModal={() => setShowPoints(true)} />}
              {saveStatus && (
                <div className="flex items-center gap-1.5 px-1 py-1.5 mt-1">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${saveStatus.state === "saving" ? "bg-[#C7953A] animate-pulse" : saveStatus.state === "error" ? "bg-[#C75B5B]" : "bg-[#5B8C5A]"}`} />
                  <span className={`text-[10px] ${saveStatus.state === "saving" ? "text-[#C7953A]" : saveStatus.state === "error" ? "text-[#C75B5B]" : "text-[#9E9E9E]"}`}>
                    {saveStatus.state === "saving" ? "保存中..." : saveStatus.state === "error" ? "保存失败" : `已保存 ${saveStatus.time}`}
                  </span>
                </div>
              )}
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
            <main className="flex-1 w-full mx-auto p-4 md:p-6 max-w-[960px] min-w-0">
              <div key={pathname} className="animate-[fadeIn_200ms_ease-out]">{children}</div>
            </main>
          </div>

          <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-[#EBEBEB] flex justify-around items-center py-1 z-50 safe-area-bottom">
            {allNavItems.map(({ href, label, icon: Icon }) => {
              const active = isActive(href);
              return (
                  <Link
                    key={href}
                    href={href}
                    prefetch={false}
                    className={`flex flex-col items-center gap-0.5 px-3 pt-[4px] pb-1.5 min-w-[56px] text-xs
                      border-t-2 border-transparent
                      transition-colors duration-150
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B75C3A]/30 focus-visible:ring-inset
                      ${active ? "text-[#B75C3A] border-[#B75C3A]" : "text-[#9E9E9E] hover:text-[#6B6B6B]"}`}
                    aria-current={active ? "page" : undefined}
                  >
                    <span className="relative">
                      <Icon size={20} />
                      {href === "/dashboard" && parsingCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#C75B5B] rounded-full" />
                      )}
                    </span>
                    <span className="leading-tight">{label}</span>
                  </Link>
              );
            })}
            <button
              onClick={() => setShowMobileAccount(true)}
              className="flex flex-col items-center gap-0.5 px-3 pt-[4px] pb-1.5 min-w-[56px] text-xs text-[#9E9E9E] hover:text-[#2D2D2D] border-t-2 border-transparent transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B75C3A]/30 focus-visible:ring-inset"
              aria-label="打开我的面板"
            >
              <User size={20} />
              <span className="leading-tight">我的</span>
            </button>
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
