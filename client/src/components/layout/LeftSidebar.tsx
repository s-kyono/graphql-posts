import { Link } from "@tanstack/react-router";
import {
  Bell,
  Bookmark,
  Feather,
  Hash,
  Home,
  List,
  Mail,
  MoreHorizontal,
  Newspaper,
  User,
} from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const NAV_ITEMS = [
  { icon: Home, label: "ホーム", to: "/" },
  { icon: Hash, label: "話題を検索", to: "/" },
  { icon: Bell, label: "通知", to: "/" },
  { icon: Mail, label: "メッセージ", to: "/" },
  { icon: Newspaper, label: "掲示板", to: "/board" },
  { icon: Bookmark, label: "ブックマーク", to: "/" },
  { icon: List, label: "リスト", to: "/" },
  { icon: MoreHorizontal, label: "もっと見る", to: "/" },
] as const;

export function LeftSidebar() {
  const { data: currentUser } = useCurrentUser();

  return (
    <aside className="w-16 xl:w-64 shrink-0 sticky top-0 h-screen flex flex-col py-2 px-1 xl:px-3">
      <div className="p-3 mb-1 flex justify-center xl:justify-start">
        <Feather className="h-8 w-8 text-primary" />
      </div>

      <nav className="flex flex-col gap-0.5 flex-1">
        {NAV_ITEMS.map(({ icon: Icon, label, to }) => (
          <Link
            key={label}
            to={to}
            activeOptions={{ exact: true }}
            className="flex items-center justify-center xl:justify-start gap-5 px-3 py-3 rounded-full transition-colors hover:bg-muted"
            activeProps={{ className: "font-bold" }}
            inactiveProps={{ className: "font-normal" }}
          >
            <Icon className="h-6 w-6 shrink-0" />
            <span className="text-[1.1rem] hidden xl:inline">{label}</span>
          </Link>
        ))}
        {currentUser ? (
          <Link
            to="/profile/$userId"
            params={{ userId: currentUser.userId }}
            className="flex items-center justify-center xl:justify-start gap-5 px-3 py-3 rounded-full transition-colors hover:bg-muted font-normal"
          >
            <User className="h-6 w-6 shrink-0" />
            <span className="text-[1.1rem] hidden xl:inline">プロフィール</span>
          </Link>
        ) : (
          <Link
            to="/login"
            className="flex items-center justify-center xl:justify-start gap-5 px-3 py-3 rounded-full transition-colors hover:bg-muted font-normal"
          >
            <User className="h-6 w-6 shrink-0" />
            <span className="text-[1.1rem] hidden xl:inline">プロフィール</span>
          </Link>
        )}
      </nav>

      <div className="pb-4 px-1 xl:px-2 flex flex-col gap-3">
        <Button className="w-10 h-10 xl:w-full xl:h-12 rounded-full text-base font-bold p-0 xl:p-auto mx-auto">
          <Feather className="h-5 w-5 xl:hidden" />
          <span className="hidden xl:inline">ツイート</span>
        </Button>
        {currentUser && (
          <Link
            to="/profile/$userId"
            params={{ userId: currentUser.userId }}
            className="flex items-center justify-center xl:justify-start gap-3 px-2 py-2 rounded-full hover:bg-muted transition-colors"
          >
            <UserAvatar
              userId={currentUser.userId}
              name={currentUser.name}
              avatarUrl={currentUser.profile?.avatarUrl}
              avatarColors={currentUser.profile?.avatarColors}
              className="h-9 w-9 shrink-0"
              textClassName="text-sm"
            />
            <div className="min-w-0 hidden xl:block">
              <p className="text-sm font-bold truncate">{currentUser.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                @{currentUser.userId}
              </p>
            </div>
          </Link>
        )}
      </div>
    </aside>
  );
}
