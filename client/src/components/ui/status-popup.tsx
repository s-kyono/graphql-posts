import { useEffect, useRef, useState } from "react";
import FailureIcon from "@/assets/icons/failure.svg?react";
import SuccessIcon from "@/assets/icons/success.svg?react";

type PopupStatus = "idle" | "loading" | "error" | "success";

type Props = {
  status: PopupStatus;
  message?: string;
  // message の下に小さく添える補足テキスト（例: 自動遷移の案内）
  description?: string;
  onDismiss?: () => void;
};

const DOTS = [
  { gradient: "linear-gradient(135deg, #D839FF, #7A1BFF)", top: 0, right: 0 },
  { gradient: "linear-gradient(135deg, #FF745D, #FF3A96)", bottom: 0, right: 0 },
  { gradient: "linear-gradient(135deg, #3B98FF, #5F00FF)", bottom: 0, left: 0 },
  { gradient: "linear-gradient(135deg, #CAF875, #26CD11)", top: 0, left: 0 },
] as const;

function LoadingAnimation() {
  return (
    <div
      className="animate-spin relative"
      style={{ width: 80, height: 80, animationDuration: "2s", animationTimingFunction: "linear" }}
    >
      {DOTS.map(({ gradient, ...pos }, i) => (
        <span
          key={i}
          style={{ position: "absolute", width: 24, height: 24, borderRadius: "50%", background: gradient, ...pos }}
        />
      ))}
    </div>
  );
}

// success 表示の自動クローズまでの時間
const AUTO_DISMISS_MS = 2000;

export function StatusPopup({ status, message, description, onDismiss }: Props) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const rafRef = useRef<number>(0);

  // mount / unmount
  useEffect(() => {
    if (status !== "idle") {
      setMounted(true);
    } else {
      setVisible(false);
    }
  }, [status]);

  // enter: mount 後に double-RAF で初期状態を確実に paint してから visible にする
  useEffect(() => {
    if (!mounted || status === "idle") return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(() => setVisible(true));
    });
    return () => cancelAnimationFrame(rafRef.current);
  }, [mounted, status]);

  // success は AUTO_DISMISS_MS 後に自動クローズ
  useEffect(() => {
    if (status !== "success") return;
    const t = setTimeout(() => onDismiss?.(), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [status, onDismiss]);

  if (!mounted) return null;

  const dismissable = status === "success" || status === "error";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{
        background: "rgba(0,0,0,0.5)",
        transition: "opacity 0.5s ease",
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
      }}
      onClick={dismissable ? onDismiss : undefined}
    >
      <div
        className="flex w-full max-w-xs flex-col items-center rounded-2xl bg-card px-6 py-8 shadow-2xl ring-1 ring-black/5"
        style={{
          transition: "transform 0.75s cubic-bezier(0.68, -0.55, 0.265, 1.55), opacity 0.5s ease",
          transform: visible ? "scale(1)" : "scale(0.5)",
          opacity: visible ? 1 : 0,
          willChange: "transform, opacity",
        }}
        onClick={(e) => e.stopPropagation()}
        // CSS transition が完了したタイミングでアンマウント
        onTransitionEnd={(e) => {
          if (e.propertyName === "transform" && !visible) {
            setMounted(false);
          }
        }}
      >
        {status === "loading" && <LoadingAnimation />}
        {status === "success" && (
          <>
            <SuccessIcon className="h-16 w-16 text-green-500" />
            {message && <p className="mt-4 text-sm font-medium text-foreground text-center">{message}</p>}
            {description && <p className="mt-1.5 text-xs text-muted-foreground text-center">{description}</p>}
          </>
        )}
        {status === "error" && (
          <>
            <FailureIcon className="h-16 w-16 text-destructive" />
            {message && <p className="mt-4 text-sm font-medium text-foreground text-center">{message}</p>}
            {description && <p className="mt-1.5 text-xs text-muted-foreground text-center">{description}</p>}
          </>
        )}
      </div>
    </div>
  );
}
