import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/forgot")({
  component: () => <div>Forgot password</div>,
});
