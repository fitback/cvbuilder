"use client";

interface Props {
  needed: number;
  current: number;
  onClose: () => void;
}

export default function InsufficientPoints({ needed, current, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-surface rounded-lg p-6 w-full max-w-sm shadow-xl text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-4xl mb-4">💡</div>
        <h3 className="text-lg font-semibold mb-2">积分不足</h3>
        <p className="text-sm text-text-secondary mb-4">
          需要 <strong className="text-accent">{needed}</strong> 积分，
          当前余额 <strong>{current}</strong> 积分
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-border rounded text-sm text-text-secondary hover:bg-surface-tertiary"
          >
            取消
          </button>
          <a
            href="/recharge"
            className="px-4 py-2 bg-accent text-white rounded text-sm font-medium hover:bg-accent-hover"
          >
            去充值 · 10积分/元
          </a>
        </div>
      </div>
    </div>
  );
}
