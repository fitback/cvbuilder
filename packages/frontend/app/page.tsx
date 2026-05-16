"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Target, FileText, Download, BarChart3 } from "../components/icons";
import { isLoggedIn } from "../lib/auth";

export default function HomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isLoggedIn()) router.replace("/dashboard");
  }, [router]);

  if (!mounted) return null;

  return (
    <div className="animate-[fadeIn_300ms_ease-out] -mx-4 md:-mx-6 -mt-4 md:-mt-6">
      {/* Hero */}
      <div className="bg-gradient-to-b from-[#FAFAF9] to-white px-6 md:px-12 py-16 md:py-24 border-b border-[#EBEBEB]">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-4 leading-tight">
            用 AI 优化简历
            <br />
            匹配理想岗位
          </h1>
          <p className="text-base md:text-lg text-[#6B6B6B] mb-8 leading-relaxed max-w-lg mx-auto">
            上传简历，AI 自动分析匹配度，生成针对性优化方案。
            面向国内求职者的专业简历工具。
          </p>
          <a
            href="/upload"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#B75C3A] text-white rounded-lg text-sm font-medium
                       hover:brightness-110 active:scale-[0.97] transition-all duration-150 ease-out
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B75C3A]/30"
          >
            <FileText size={18} />
            开始使用
          </a>
          <p className="text-xs text-[#9E9E9E] mt-3">免费分析 3 次，无需信用卡</p>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-3xl mx-auto px-6 md:px-12 py-16 space-y-12">
        <div className="grid md:grid-cols-2 gap-6">
          <FeatureCard
            icon={<BarChart3 size={24} />}
            title="智能匹配分析"
            description="上传简历和目标岗位，AI 深度分析匹配度，精准定位差距与优化方向"
          />
          <FeatureCard
            icon={<Target size={24} />}
            title="优化建议"
            description="从 JD 核心解码到排雷清单，逐项给出可执行改进方案"
          />
          <FeatureCard
            icon={<Sparkles size={24} />}
            title="AI 简历重写"
            description="一键生成针对目标岗位优化的简历，内容可在线编辑微调"
          />
          <FeatureCard
            icon={<Download size={24} />}
            title="PDF 导出"
            description="支持导出为 A4 格式 PDF，可直接投递使用"
          />
        </div>

        {/* How it works */}
        <div className="text-center">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#1A1A1A] mb-8">如何使用</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Step number="01" title="上传简历" desc="支持 PDF / Word 格式，AI 自动解析" />
            <Step number="02" title="选择岗位" desc="填写或粘贴 JD，AI 分析匹配度" />
            <Step number="03" title="优化导出" desc="生成优化简历，编辑确认后导出 PDF" />
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="border-t border-[#EBEBEB] px-6 py-12 text-center">
        <p className="text-sm text-[#9E9E9E]">开始你的简历优化之旅</p>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-6 bg-white border border-[#EBEBEB] rounded-xl transition-all duration-200 ease-out hover:border-[#D4D4D4] hover:shadow-sm hover:-translate-y-[1px]">
      <div className="w-10 h-10 rounded-lg bg-[#B75C3A]/5 flex items-center justify-center mb-4 text-[#B75C3A]">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-[#1A1A1A] mb-2">{title}</h3>
      <p className="text-sm text-[#6B6B6B] leading-relaxed">{description}</p>
    </div>
  );
}

function Step({ number, title, desc }: { number: string; title: string; desc: string }) {
  return (
    <div className="text-center">
      <div className="w-10 h-10 rounded-full bg-[#B75C3A]/5 flex items-center justify-center mx-auto mb-3">
        <span className="text-sm font-bold text-[#B75C3A]">{number}</span>
      </div>
      <h3 className="text-sm font-semibold text-[#1A1A1A] mb-1">{title}</h3>
      <p className="text-xs text-[#6B6B6B]">{desc}</p>
    </div>
  );
}
