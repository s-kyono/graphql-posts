import { createRootRoute, Outlet } from "@tanstack/react-router";
import { AppControls } from "@/components/AppControls";
import { ToastProvider } from "@/components/ui/toast";
import { ThemeProvider } from "@/lib/theme";

export const Route = createRootRoute({
  component: () => (
    <ThemeProvider>
      <ToastProvider>
        <Outlet />
        <AppControls />
      </ToastProvider>
    </ThemeProvider>
  ),
});
