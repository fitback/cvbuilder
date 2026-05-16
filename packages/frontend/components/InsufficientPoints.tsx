"use client";

import { AlertCircle, Coins } from "./icons";
import { Button } from "./Button";

interface Props {
  needed: number;
  current: number;
  onClose: () => void;
}

export default function InsufficientPoints({ needed, current, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-[fadeIn_150ms_ease-out]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl text-center animate-[slideUp_200ms_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-full bg-[#C7953A]/10 flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={24} className="text-[#C7953A]" />
        </div>
        <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">积分不足</h3>
        <p className="text-sm text-[#6B6B6B] mb-4">
          需要 <strong className="text-[#B75C3A]">{needed}</strong> 积分，
          当前仅剩 <strong>{current}</strong> 积分
        </p>
        <div className="flex items-center justify-center gap-2 mb-5 text-xs text-[#9E9E9E]">
          <Coins size={14} />
          <span>10 积分 = 1 元</span>
        </div>
        <div className="flex gap-3 justify-center">
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <a href="/recharge">
            <Button variant="primary">
              去充值
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}
