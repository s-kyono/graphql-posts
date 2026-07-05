import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import SuccessIcon from "@/assets/icons/success.svg?react";
import FailureIcon from "@/assets/icons/failure.svg?react";

type ToastType = "success" | "error";
type ToastData = { id: number; type: ToastType; message: string };

type ToastContextValue = {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

// 自動で閉じるまでの時間
const AUTO_DISMISS_MS = 4000;

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast は <ToastProvider> の内側で呼んでください");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((type: ToastType, message: string) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      showSuccess: (message) => show("success", message),
      showError: (message) => show("error", message),
    }),
    [show]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* ページ単位ではなくアプリ全体で常駐するビューポート → 画面遷移を挟んでも表示が続く */}
      <div className="fixed top-4 right-4 z-50 flex w-80 flex-col gap-2">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastData; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);
  const rafRef = useRef<number>(0);

  // mount 後に double-RAF で初期状態を確実に paint してから visible にする
  useEffect(() => {
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(() => setVisible(true));
    });
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // 一定時間後に自動クローズ
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, []);

  const Icon = toast.type === "success" ? SuccessIcon : FailureIcon;
  const colorClass = toast.type === "success" ? "text-green-500" : "text-destructive";

  return (
    <div
      role="status"
      className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-lg"
      style={{
        transition: "transform 0.3s ease, opacity 0.3s ease",
        transform: visible ? "translateX(0)" : "translateX(1rem)",
        opacity: visible ? 1 : 0,
      }}
      onClick={() => setVisible(false)}
      // クローズのトランジションが完了したタイミングでリストから取り除く
      onTransitionEnd={(e) => {
        if (e.propertyName === "opacity" && !visible) onDismiss();
      }}
    >
      <Icon className={`h-6 w-6 shrink-0 ${colorClass}`} />
      <p className="pt-0.5 text-sm text-foreground">{toast.message}</p>
    </div>
  );
}
