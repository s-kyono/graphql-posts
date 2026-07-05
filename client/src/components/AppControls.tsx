import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { logoutMutation } from "@/lib/queries/auth";

export function AppControls() {
  const { data: currentUser } = useCurrentUser();
  const navigate = useNavigate();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const queryClient = useQueryClient();
  const isAuthRoute = ["/login", "/signup"].includes(pathname);

  const handleLogout = async () => {
    try {
      await logoutMutation();
    } finally {
      queryClient.setQueryData(["me"], null);
      navigate({ to: "/login" });
    }
  };

  if (isAuthRoute && currentUser) return null;

  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-2 rounded-xl border border-border bg-card/95 p-2 shadow-lg backdrop-blur">
      <ThemeSwitcher />
      {currentUser && (
        <Button
          type="button"
          variant="destructive"
          className="w-full justify-start gap-2 rounded-lg"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          ログアウト
        </Button>
      )}
    </div>
  );
}
