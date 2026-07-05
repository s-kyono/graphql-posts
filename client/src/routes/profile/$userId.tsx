import type { User as UserType } from "@graphql-posts/graphql-types";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Calendar } from "lucide-react";
import { LeftSidebar } from "@/components/layout/LeftSidebar";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getUsersQuery } from "@/lib/queries/users";

export const Route = createFileRoute("/profile/$userId")({
  component: ProfilePage,
});

function ProfilePage() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();

  const { data: users, isLoading } = useQuery<UserType[]>({
    queryKey: ["users"],
    queryFn: getUsersQuery,
  });

  const user = users?.find((u) => u.userId === userId);
  const isOwnProfile = currentUser?.userId === userId;

  return (
    <div className="flex min-h-screen bg-background">
      <div className="flex w-full max-w-7xl mx-auto">
        <LeftSidebar />
        <main className="flex-1 min-w-0 max-w-150 border-x border-border">
          {/* Sticky header */}
          <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-4">
            <button
              onClick={() => navigate({ to: "/" })}
              className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              {isLoading ? (
                <Skeleton className="h-5 w-32" />
              ) : (
                <p className="font-bold text-xl leading-none">
                  {user?.name ?? "ユーザー"}
                </p>
              )}
            </div>
          </div>

          {/* Cover */}
          <div className="h-48 bg-gradient-to-br from-primary/30 to-primary/10" />

          {/* Profile section */}
          <div className="px-4">
            <div className="flex justify-between items-start -mt-12 mb-4">
              <UserAvatar
                userId={user?.userId ?? userId}
                name={user?.name}
                avatarUrl={user?.profile?.avatarUrl}
                avatarColors={user?.profile?.avatarColors}
                className="h-24 w-24 border-4 border-background"
                textClassName="text-3xl"
              />
              {!isLoading &&
                (isOwnProfile ? (
                  <Button
                    variant="outline"
                    className="rounded-full mt-14"
                    size="sm"
                  >
                    プロフィールを編集
                  </Button>
                ) : (
                  <Button className="rounded-full mt-14" size="sm">
                    フォロー
                  </Button>
                ))}
            </div>

            {isLoading ? (
              <div className="space-y-3 mb-6">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : user ? (
              <div className="mb-6">
                <h1 className="font-bold text-2xl leading-tight">
                  {user.name}
                </h1>
                <p className="text-muted-foreground text-sm mb-3">
                  @{user.userId}
                </p>
                {user.profile?.bio && (
                  <p className="text-sm mb-3 whitespace-pre-wrap">
                    {user.profile.bio}
                  </p>
                )}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>登録済み</span>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center">
                <p className="text-muted-foreground mb-2">
                  ユーザーが見つかりません
                </p>
                <Link to="/" className="text-primary text-sm hover:underline">
                  ホームへ戻る
                </Link>
              </div>
            )}

            {user && (
              <div className="border-t border-border py-12 text-center text-muted-foreground">
                <p className="text-sm">まだ投稿がありません</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
