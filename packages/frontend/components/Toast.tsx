"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { Check, AlertCircle, X, Spinner } from "./icons";

type ToastType = "success" | "error" | "loading" | "info";

type ToastItem = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastCtx = {
  toast: (message: string, type?: ToastType, duration?: number) => void;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastCtx>({ toast: () => {}, dismiss: () => {} });

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = "info", duration = 3000) => {
      const id = nextId++;
      setItems((prev) => [...prev, { id, message, type }]);
      if (type !== "loading") {
        setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss]
  );

  const iconMap: Record<ToastType, ReactNode> = {
    success: <Check size={18} className="text-[#5B8C5A]" />,
    error: <AlertCircle size={18} className="text-[#C75B5B]" />,
    info: <AlertCircle size={18} className="text-[#2563EB]" />,
    loading: <Spinner size={18} className="text-[#B75C3A] animate-spin" />,
  };

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[999] flex flex-col gap-2 pointer-events-none">
        {items.map((item) => (
          <div
            key={item.id}
            className="pointer-events-auto flex items-center gap-2.5 px-4 py-3 bg-white rounded-lg shadow-lg border border-[#EBEBEB]
                       animate-[toastIn_200ms_ease-out] transition-all duration-200"
          >
            <span className="shrink-0">{iconMap[item.type]}</span>
            <span className="text-sm text-[#2D2D2D]">{item.message}</span>
            <button
              onClick={() => dismiss(item.id)}
              className="ml-2 p-0.5 rounded hover:bg-[#F5F4F2] transition-colors"
              aria-label="关闭"
            >
              <X size={14} className="text-[#9E9E9E]" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
