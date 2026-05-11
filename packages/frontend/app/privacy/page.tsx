"use client";

import { useState } from "react";

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <a href="/dashboard" className="text-text-muted hover:text-text-secondary text-sm">← 返回</a>
        <h2 className="text-xl font-semibold">隐私协议</h2>
      </div>

      <div className="bg-surface border border-border-light rounded-md p-6 space-y-4 text-sm leading-relaxed text-text-secondary">
        <section>
          <h3 className="text-base font-semibold text-text-primary mb-2">一、信息收集</h3>
          <p>我们仅收集提供服务所必需的信息：</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>手机号码 — 用于账号注册和登录</li>
            <li>简历文件 — 您上传的简历内容，仅用于 AI 分析和生成优化建议</li>
            <li>岗位描述 — 您创建的 JD 内容，仅用于匹配分析</li>
          </ul>
        </section>

        <section>
          <h3 className="text-base font-semibold text-text-primary mb-2">二、信息使用</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>简历文件仅用于 AI 分析和生成优化简历，不会用于其他目的</li>
            <li>手机号仅用于账号识别和登录验证</li>
            <li>我们不会将您的信息出售或共享给第三方</li>
          </ul>
        </section>

        <section>
          <h3 className="text-base font-semibold text-text-primary mb-2">三、数据存储与安全</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>您的数据存储在加密的数据库中</li>
            <li>简历文件通过 UUID 命名，无法通过 URL 直接访问</li>
            <li>文件访问需要登录验证</li>
            <li>我们采用行业标准的安全措施保护您的数据</li>
          </ul>
        </section>

        <section>
          <h3 className="text-base font-semibold text-text-primary mb-2">四、数据删除</h3>
          <p>您可以随时在仪表盘删除已上传的简历和 JD，系统会同时删除关联的分析记录和文件。如需彻底注销账号，请联系管理员。</p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-text-primary mb-2">五、AI 服务说明</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>简历分析和生成功能由 DeepSeek AI 模型提供</li>
            <li>分析过程中，简历内容和 JD 会被发送到 AI 服务进行处理</li>
            <li>AI 服务不会将您的数据用于模型训练</li>
          </ul>
        </section>

        <section>
          <h3 className="text-base font-semibold text-text-primary mb-2">六、联系我们</h3>
          <p>如对隐私协议有任何疑问，请联系管理员。本协议可能不定期更新，更新后会在页面显著位置提示。</p>
        </section>

        <p className="text-xs text-text-muted pt-4 border-t border-border-light">最后更新：2026-05-11</p>
      </div>
    </div>
  );
}
