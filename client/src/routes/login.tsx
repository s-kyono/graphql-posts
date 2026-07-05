import {
  type LoginByEmailOrUserIdInput,
  loginByEmailOrUserIdSchema,
} from "@graphql-posts/shared";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BeamInput } from "@/components/ui/beam-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { StatusPopup } from "@/components/ui/status-popup";
import { useZodForm } from "@/hooks/useZodForm";
import { getCurrentUserQuery, loginQuery } from "@/lib/queries/auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    formAction,
    register,
    dismissPopup,
    formState: { errors, serverError, popupStatus },
  } = useZodForm<LoginByEmailOrUserIdInput>(
    loginByEmailOrUserIdSchema,
    async (data) => {
      const isEmail = data.emailOrUserId.includes("@");
      await loginQuery({
        password: data.password,
        ...(isEmail
          ? { email: data.emailOrUserId }
          : { userId: data.emailOrUserId }),
      });
      const user = await getCurrentUserQuery();
      queryClient.setQueryData(["me"], user);
    },
    { validators: { onBlur: true } },
  );

  // success のポップアップを閉じた（≒自動クローズした）タイミングでホームへ
  const handleDismiss = () => {
    const wasSuccess = popupStatus === "success";
    dismissPopup();
    if (wasSuccess) navigate({ to: "/" });
  };

  return (
    <div className="relative flex min-h-svh items-center justify-center bg-background px-4">
      <StatusPopup
        status={popupStatus}
        message={
          popupStatus === "success"
            ? "ログインに成功しました"
            : popupStatus === "error"
              ? serverError
              : undefined
        }
        description={
          popupStatus === "success"
            ? "自動的にホーム画面へ遷移します"
            : undefined
        }
        onDismiss={handleDismiss}
      />
      <div className="w-full max-w-md space-y-6 rounded-xl border border-border bg-card px-6 py-8 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">ログイン</h1>
        {/* serverError の有無に関わらず常にスロットを確保 → 出現/消滅で他要素が動かない */}
        <p className="min-h-5 text-center text-sm text-destructive">
          {serverError}
        </p>
        <div className="space-y-3">
          <Button variant="outline" className="w-full gap-2">
            <GoogleIcon />
            Google で続ける
          </Button>
          <Button variant="outline" className="w-full gap-2">
            <GitHubIcon />
            GitHub で続ける
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <hr className="flex-1 border-border" />
          <span className="text-xs text-muted-foreground">または</span>
          <hr className="flex-1 border-border" />
        </div>

        <form className="space-y-4" action={formAction}>
          <div className="space-y-2">
            <Label htmlFor="emailOrUserId">メールアドレス or ユーザーID</Label>
            <BeamInput
              id="emailOrUserId"
              type="text"
              placeholder="you@example.com or @username"
              {...register("emailOrUserId")}
            />
            <p className="min-h-4 text-xs text-destructive">
              {errors.emailOrUserId}
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">パスワード</Label>
              <Link
                to="/forgot"
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                パスワードをお忘れですか？
              </Link>
            </div>
            <BeamInput
              id="password"
              type="password"
              {...register("password")}
            />
            <p className="min-h-4 text-xs text-destructive">
              {errors.password}
            </p>
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={popupStatus === "loading"}
          >
            ログイン
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          アカウントをお持ちでないですか？{" "}
          <Link
            to="/signup"
            className="text-foreground underline-offset-4 hover:underline"
          >
            新規登録
          </Link>
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}
