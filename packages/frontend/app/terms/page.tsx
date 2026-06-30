import { ChevronLeft } from "../../components/icons";

export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center gap-2 mb-6">
        <a href="/" className="flex items-center gap-1 text-sm text-[#9E9E9E] hover:text-[#2D2D2D] transition-colors">
          <ChevronLeft size={16} /> 返回
        </a>
      </div>

      <h1 className="text-xl font-semibold text-[#1A1A1A] mb-6">ResumeMatcher 生成式人工智能服务协议</h1>

      <div className="prose prose-sm text-[#4A4A4A] space-y-4">
        <p className="text-sm text-[#9E9E9E]">生效日期：2026年6月30日</p>

        <p>欢迎使用 ResumeMatcher（以下简称"本服务"）。请您在使用本服务前仔细阅读本协议全部内容。您通过页面勾选"我已阅读并同意"或使用本服务，即表示您已充分理解并同意接受本协议的约束。</p>

        <h2 className="text-base font-semibold text-[#1A1A1A] mt-6 mb-2">一、服务说明</h2>
        <p>本服务是一款基于生成式人工智能技术的简历优化与岗位匹配工具，主要功能包括：简历内容分析与匹配度评估、基于 AI 的简历优化建议与生成、简历 Markdown 编辑与 PDF/DOCX 导出。</p>
        <p>本服务输出的内容由 AI 模型自动生成，仅供用户参考，不构成任何形式的职业建议或雇佣承诺。</p>

        <h2 className="text-base font-semibold text-[#1A1A1A] mt-6 mb-2">二、用户权利与义务</h2>
        <p className="font-medium">用户权利：</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>在遵守本协议的前提下，使用本服务提供的各项功能</li>
          <li>对个人账户信息享有查阅、更正、删除的权利</li>
          <li>按照平台规则获取积分、申请退款</li>
        </ul>
        <p className="font-medium mt-3">用户义务：</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>注册时提供真实、准确、完整的个人信息</li>
          <li>妥善保管账户和密码，对账户下的所有操作承担责任</li>
          <li>不得利用本服务上传违法内容、生成虚假简历、反向工程或批量调用接口</li>
        </ul>
        <p>用户对其上传的简历、岗位描述等内容的合法性、真实性承担全部责任。</p>

        <h2 className="text-base font-semibold text-[#1A1A1A] mt-6 mb-2">三、AI 生成内容声明</h2>
        <p>用户知悉并同意：本服务输出的分析结果、优化建议和生成简历由 AI 模型自动生成，可能存在不准确、不完整或不适用的情况。用户应在使用前进行独立判断和核实。</p>
        <p>AI 生成内容的著作权归用户所有，但用户不得声称该内容完全由人类创作。</p>

        <h2 className="text-base font-semibold text-[#1A1A1A] mt-6 mb-2">四、知识产权</h2>
        <p>本服务所含的软件、代码、算法、商标、界面设计等知识产权归我们所有。用户上传的简历、岗位描述等内容的著作权归用户所有，用户授予我们在提供服务目的范围内使用上述内容的权利。</p>

        <h2 className="text-base font-semibold text-[#1A1A1A] mt-6 mb-2">五、个人信息保护</h2>
        <p>我们严格遵守《个人信息保护法》《数据安全法》等相关法律法规，采取加密、脱敏等技术措施保护用户个人信息。详细信息请参阅《隐私政策》。</p>

        <h2 className="text-base font-semibold text-[#1A1A1A] mt-6 mb-2">六、免责声明</h2>
        <p>本服务按"现状"提供。因不可抗力、第三方服务故障或用户自身原因导致的服务中断或数据丢失，我们不承担责任。累计赔偿限额不超过用户在事故发生前 12 个月内支付的费用总额。</p>

        <h2 className="text-base font-semibold text-[#1A1A1A] mt-6 mb-2">七、争议解决</h2>
        <p>本协议适用中华人民共和国法律。因本协议引起的争议，双方应友好协商解决；协商不成的，任何一方有权向服务提供者所在地有管辖权的人民法院提起诉讼。</p>

        <p className="text-sm text-[#9E9E9E] mt-8">如对本协议有任何疑问，请联系：support@cvbuilder.ltd</p>
      </div>
    </div>
  );
}
