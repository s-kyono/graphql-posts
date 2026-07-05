import type { User } from "@graphql-posts/graphql-types";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { BeamInput } from "@/components/ui/beam-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { StatusPopup } from "@/components/ui/status-popup";
import { useZodForm } from "@/hooks/useZodForm";
import {
  createUserMutation,
  fetchCurrentUser,
  loginQuery,
} from "@/lib/queries/auth";

const signupFormSchema = z
  .object({
    email: z.string().email("有効なメールアドレスを入力してください"),
    password: z.string().min(8, "パスワードは8文字以上にしてください"),
    passwordConfirm: z.string().min(1, "パスワード確認は必須です"),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "パスワードが一致しません",
    path: ["passwordConfirm"],
  });

type SignupFormInput = z.infer<typeof signupFormSchema>;

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    formAction,
    register,
    dismissPopup,
    formState: { errors, serverError, popupStatus },
  } = useZodForm<SignupFormInput>(
    signupFormSchema,
    async (data) => {
      const created = await createUserMutation(data.email, data.password);
      await loginQuery({ email: created.email, password: created.password });
      const user = await fetchCurrentUser();
      queryClient.setQueryData<User | null>(["me"], user);
    },
    { validators: { onBlur: true } },
  );

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
            ? "登録が完了しました"
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
        <h1 className="text-xl font-semibold tracking-tight">新規登録</h1>
        <p className="min-h-5 text-center text-sm text-destructive">
          {serverError}
        </p>

        <form className="space-y-4" action={formAction}>
          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <BeamInput
              id="email"
              type="email"
              placeholder="you@example.com"
              {...register("email")}
            />
            <p className="min-h-4 text-xs text-destructive">{errors.email}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">パスワード</Label>
            <BeamInput
              id="password"
              type="password"
              placeholder="8文字以上"
              {...register("password")}
            />
            <p className="min-h-4 text-xs text-destructive">
              {errors.password}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="passwordConfirm">パスワード確認</Label>
            <BeamInput
              id="passwordConfirm"
              type="password"
              placeholder="もう一度入力してください"
              {...register("passwordConfirm")}
            />
            <p className="min-h-4 text-xs text-destructive">
              {errors.passwordConfirm}
            </p>
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={popupStatus === "loading"}
          >
            登録する
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          アカウントをお持ちですか？{" "}
          <Link
            to="/login"
            className="text-foreground underline-offset-4 hover:underline"
          >
            ログイン
          </Link>
        </p>
      </div>
    </div>
  );
}
