"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "../../components/Button";
import { AlertCircle, ShieldAlert, Upload, Image } from "../../components/icons";
import { useToast } from "../../components/Toast";
import { apiFetch, API_BASE } from "../../lib/auth";

const API = API_BASE;

type AdminUser = {
  id: string;
  phone: string;
  role: string;
  points: number;
  createdAt: string;
};

export default function AdminPage() {
  const [recharges, setRecharges] = useState<any[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [qrExists, setQrExists] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [health, setHealth] = useState<Record<string, any> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  async function fetchHealth() {
    try {
      const res = await apiFetch(`${API}/health`);
      const json = await res.json();
      if (json.data) setHealth(json.data);
    } catch {}
  }

  async function fetchRecharges() {
    const res = await apiFetch(`${API}/recharges/all`);
    const json = await res.json();
    if (json.success) setRecharges(json.data ?? []);
  }

  async function fetchUsers() {
    const res = await apiFetch(`${API}/auth/users`);
    const json = await res.json();
    if (json.success) setUsers(json.data ?? []);
  }

  async function fetchQrStatus() {
    try {
      const res = await apiFetch(`${API}/payment/qr-code`);
      const json = await res.json();
      if (json.success) setQrExists(json.data.exists);
    } catch {}
  }

  useEffect(() => {
    setLoading(true);
    setError("");
    Promise.all([fetchRecharges(), fetchUsers(), fetchQrStatus(), fetchHealth()]).finally(() => setLoading(false));
  }, []);

  async function handleUploadQr(file: File) {
    if (!file.type.startsWith("image/")) {
      toast("仅支持图片格式", "error");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast("图片不能超过 2MB", "error");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await apiFetch(`${API}/payment/qr-code`, { method: "POST", body: form });
      const json = await res.json();
      if (json.success) {
        toast("付款码已更新", "success");
        setQrExists(true);
      } else {
        toast(json.error?.message ?? "上传失败", "error");
      }
    } catch {
      toast("上传失败，请重试", "error");
    } finally {
      setUploading(false);
    }
  }

  if (error && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-[fadeIn_200ms_ease-out]">
        <AlertCircle size={48} className="text-[#C75B5B] mb-4 opacity-50" />
        <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">加载失败</h3>
        <p className="text-sm text-[#6B6B6B] mb-6">{error}</p>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          重试
        </Button>
      </div>
    );
  }

  const statusTag = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      approved: { label: "已支付", cls: "bg-[#5B8C5A]/10 text-[#5B8C5A]" },
      pending: { label: "待支付", cls: "bg-[#C7953A]/10 text-[#C7953A]" },
      rejected: { label: "已关闭", cls: "bg-[#C75B5B]/10 text-[#C75B5B]" },
    };
    const m = map[status] ?? { label: status, cls: "" };
    return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${m.cls}`}>{m.label}</span>;
  };

  return (
    <div className="animate-[slideUp_300ms_ease-out] space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#1A1A1A]">管理后台</h2>
        <p className="text-sm text-[#6B6B6B] mt-1">充值记录与付款码管理</p>
      </div>

      {/* QR Code */}
      <div className="bg-white border border-[#EBEBEB] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Image size={18} className="text-[#B75C3A]" />
            <h3 className="text-sm font-semibold text-[#1A1A1A]">付款码管理</h3>
          </div>
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadQr(f); }} />
            <Button variant="secondary" size="sm" icon={<Upload size={14} />}
              loading={uploading} onClick={() => fileRef.current?.click()}>
              上传付款码
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {qrExists ? (
            <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-[#EBEBEB] bg-[#F5F4F2]">
              <img src={`${API}/payment/qr-code-image?t=${Date.now()}`} alt="付款二维码" className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="w-32 h-32 rounded-xl border border-dashed border-[#D4D4D4] flex items-center justify-center bg-[#FAFAF9]">
              <div className="text-center">
                <Image size={28} className="mx-auto text-[#D4D4D4] mb-1" />
                <p className="text-xs text-[#9E9E9E]">暂无</p>
              </div>
            </div>
          )}
          <div className="text-xs text-[#6B6B6B] space-y-1">
            <p>建议尺寸：300 × 300 像素 | 格式：PNG、JPG | 上限：2MB</p>
          </div>
        </div>
      </div>

      {/* Service Health */}
      {health && (
        <div className="bg-white border border-[#EBEBEB] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[#1A1A1A] mb-4">
            服务状态
            <span className={`ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${health.status === "ok" ? "bg-[#5B8C5A]/10 text-[#5B8C5A]" : health.status === "degraded" ? "bg-[#C7953A]/10 text-[#C7953A]" : "bg-[#C75B5B]/10 text-[#C75B5B]"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${health.status === "ok" ? "bg-[#5B8C5A]" : health.status === "degraded" ? "bg-[#C7953A]" : "bg-[#C75B5B]"}`} />
              {health.status === "ok" ? "正常" : health.status === "degraded" ? "降级" : "异常"}
            </span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(health.checks as Record<string, any>).map(([key, check], i) => (
              <div key={key} className="p-3 bg-[#FAFAF9] rounded-lg animate-[staggerIn_250ms_ease-out_both]" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`w-2 h-2 rounded-full ${check.status === "ok" ? "bg-[#5B8C5A]" : check.status === "degraded" ? "bg-[#C7953A]" : "bg-[#C75B5B]"}`} />
                  <span className="text-xs font-medium text-[#2D2D2D]">{key}</span>
                </div>
                <p className="text-[11px] text-[#6B6B6B] truncate">{check.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Registered users */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[#1A1A1A]">注册用户</h3>
          <span className="text-xs text-[#9E9E9E]">共 {users.length} 位用户</span>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-[#F5F4F2] rounded-xl animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 border border-dashed border-[#D4D4D4] rounded-xl">
            <ShieldAlert size={32} className="text-[#D4D4D4] mb-2" />
            <p className="text-sm text-[#9E9E9E]">暂无注册用户</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto bg-white border border-[#EBEBEB] rounded-xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#EBEBEB] bg-[#FAFAF9]">
                    <th className="text-left py-3 px-3 text-[#6B6B6B] font-medium">手机号</th>
                    <th className="text-left py-3 px-3 text-[#6B6B6B] font-medium">角色</th>
                    <th className="text-left py-3 px-3 text-[#6B6B6B] font-medium">积分</th>
                    <th className="text-left py-3 px-3 text-[#6B6B6B] font-medium">注册时间</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, i) => (
                    <tr key={user.id} className="border-b border-[#F5F4F2] hover:bg-[#FAFAF9] transition-colors animate-[staggerIn_300ms_ease-out_both]" style={{ animationDelay: `${i * 40}ms` }}>
                      <td className="py-3 px-3 text-[#2D2D2D] font-mono">{user.phone}</td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${user.role === "admin" ? "bg-[#B75C3A]/10 text-[#B75C3A]" : "bg-[#F5F4F2] text-[#6B6B6B]"}`}>
                          {user.role === "admin" ? "管理员" : "普通用户"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[#2D2D2D]">{user.points}</td>
                      <td className="py-3 px-3 text-xs text-[#9E9E9E]">{new Date(user.createdAt).toLocaleString("zh-CN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden space-y-2">
              {users.map((user, i) => (
                <div key={user.id} className="bg-white border border-[#EBEBEB] rounded-xl p-4 animate-[staggerIn_300ms_ease-out_both]" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-[#2D2D2D] font-mono">{user.phone}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${user.role === "admin" ? "bg-[#B75C3A]/10 text-[#B75C3A]" : "bg-[#F5F4F2] text-[#6B6B6B]"}`}>
                      {user.role === "admin" ? "管理员" : "普通用户"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#6B6B6B]">
                    <span>积分 {user.points}</span>
                    <span>{new Date(user.createdAt).toLocaleString("zh-CN")}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Recharge Records */}
      <div>
        <h3 className="text-sm font-semibold text-[#1A1A1A] mb-3">充值记录</h3>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-[#F5F4F2] rounded-xl animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
            ))}
          </div>
        ) : recharges.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 border border-dashed border-[#D4D4D4] rounded-xl animate-[fadeIn_300ms_ease-out]">
            <svg width="80" height="64" viewBox="0 0 80 64" fill="none" className="mb-4 opacity-60">
              <rect x="8" y="12" width="64" height="40" rx="6" stroke="#D4D4D4" strokeWidth="2" fill="#FAFAF9" />
              <rect x="18" y="22" width="44" height="3" rx="1.5" fill="#D4D4D4" />
              <rect x="18" y="30" width="36" height="3" rx="1.5" fill="#EBEBEB" />
              <rect x="18" y="38" width="28" height="3" rx="1.5" fill="#EBEBEB" />
              <circle cx="68" cy="10" r="8" stroke="#B75C3A" strokeWidth="2" fill="#B75C3A/10" />
              <path d="M68 6v8M64 10h8" stroke="#B75C3A" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <h3 className="text-base font-medium text-[#1A1A1A] mb-2">暂无充值记录</h3>
            <p className="text-sm text-[#6B6B6B] text-center max-w-xs">用户完成充值后，记录会显示在这里，你可以在后台进行审核</p>
          </div>
        ) : (
          <>
            {/* Desktop: table */}
            <div className="hidden md:block overflow-x-auto bg-white border border-[#EBEBEB] rounded-xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#EBEBEB] bg-[#FAFAF9]">
                    <th className="text-left py-3 px-3 text-[#6B6B6B] font-medium">用户</th>
                    <th className="text-left py-3 px-3 text-[#6B6B6B] font-medium">金额</th>
                    <th className="text-left py-3 px-3 text-[#6B6B6B] font-medium">积分</th>
                    <th className="text-left py-3 px-3 text-[#6B6B6B] font-medium">商户单号</th>
                    <th className="text-left py-3 px-3 text-[#6B6B6B] font-medium">微信单号</th>
                    <th className="text-left py-3 px-3 text-[#6B6B6B] font-medium">状态</th>
                    <th className="text-left py-3 px-3 text-[#6B6B6B] font-medium">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {recharges.map((item: any, i: number) => (
                    <tr key={item.id} className="border-b border-[#F5F4F2] hover:bg-[#FAFAF9] transition-colors animate-[staggerIn_300ms_ease-out_both]" style={{ animationDelay: `${i * 40}ms` }}>
                      <td className="py-3 px-3 text-[#2D2D2D]">{item.userPhone}</td>
                      <td className="py-3 px-3 text-[#2D2D2D]">{item.amount} 元</td>
                      <td className="py-3 px-3 text-[#2D2D2D]">{item.points}</td>
                      <td className="py-3 px-3 text-[#9E9E9E] font-mono text-xs">{item.outTradeNo || "-"}</td>
                      <td className="py-3 px-3 text-[#9E9E9E] font-mono text-xs">{item.transactionId || "-"}</td>
                      <td className="py-3 px-3">{statusTag(item.status)}</td>
                      <td className="py-3 px-3 text-xs text-[#9E9E9E]">
                        {item.approvedAt
                          ? new Date(item.approvedAt).toLocaleString("zh-CN")
                          : new Date(item.createdAt).toLocaleString("zh-CN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile: card list */}
            <div className="md:hidden space-y-2">
              {recharges.map((item: any, i: number) => (
                <div key={item.id} className="bg-white border border-[#EBEBEB] rounded-xl p-4 animate-[staggerIn_300ms_ease-out_both]" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-[#2D2D2D]">{item.userPhone}</span>
                    {statusTag(item.status)}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-[#9E9E9E]">金额</span><span className="ml-1 text-[#2D2D2D]">{item.amount} 元</span></div>
                    <div><span className="text-[#9E9E9E]">积分</span><span className="ml-1 text-[#2D2D2D]">{item.points}</span></div>
                    <div className="col-span-2"><span className="text-[#9E9E9E]">商户单号</span><span className="ml-1 text-[#2D2D2D] font-mono">{item.outTradeNo || "-"}</span></div>
                    <div className="col-span-2"><span className="text-[#9E9E9E]">微信单号</span><span className="ml-1 text-[#2D2D2D] font-mono">{item.transactionId || "-"}</span></div>
                    <div className="col-span-2"><span className="text-[#9E9E9E]">时间</span><span className="ml-1 text-[#2D2D2D]">{item.approvedAt ? new Date(item.approvedAt).toLocaleString("zh-CN") : new Date(item.createdAt).toLocaleString("zh-CN")}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
