import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react";
import type { Toast, ToastType } from "../../hooks/useToast";

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={16} className="text-emerald-500 shrink-0" />,
  error: <XCircle size={16} className="text-red-500 shrink-0" />,
  warning: <AlertCircle size={16} className="text-amber-500 shrink-0" />,
  info: <Info size={16} className="text-blue-500 shrink-0" />,
};

const BG: Record<ToastType, string> = {
  success: "bg-white border-emerald-200",
  error: "bg-white border-red-200",
  warning: "bg-white border-amber-200",
  info: "bg-white border-blue-200",
};

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export default function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className={`pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-xl border shadow-lg max-w-sm ${BG[t.type]}`}
          >
            {ICONS[t.type]}
            <span className="text-sm text-slate-800 font-medium flex-1 leading-snug">{t.message}</span>
            <button
              onClick={() => onRemove(t.id)}
              className="text-slate-400 hover:text-slate-600 transition-colors shrink-0 mt-px"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
