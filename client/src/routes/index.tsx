import type { Board, Post, User as UserType } from "@graphql-posts/graphql-types";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarDays,
  Feather,
  ImageIcon,
  MapPin,
  Search,
  Settings,
  Smile,
} from "lucide-react";
import { LeftSidebar } from "@/components/layout/LeftSidebar";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getUsersQuery } from "@/lib/queries/users";
import { getBoardsQuery, getRecentPostsQuery } from "@/lib/queries/posts";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="flex w-full max-w-7xl mx-auto">
        <LeftSidebar />
        <main className="flex-1 min-w-0 max-w-150 border-x border-border">
          <MainFeed />
        </main>
        <RightSidebar />
      </div>
    </div>
  );
}

// ─── Main Feed ───────────────────────────────────────────────────────────────

function MainFeed() {
  return (
    <div>
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold">最新ツイート</h1>
          <button className="p-2 rounded-full hover:bg-muted transition-colors">
            <Settings className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      <ComposeArea />

      <div className="border-b border-border" />

      <FeedEmpty />
    </div>
  );
}

function ComposeArea() {
  return (
    <div className="border-b border-border px-4 py-3">
      <div className="flex gap-3">
        <div className="h-10 w-10 rounded-full bg-muted shrink-0" />
        <div className="flex-1">
          <textarea
            className="w-full resize-none bg-transparent text-xl placeholder:text-muted-foreground outline-none py-2 min-h-14"
            placeholder="いまどうしてる？"
            rows={2}
          />
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex text-primary">
              <button className="p-2 rounded-full hover:bg-primary/10 transition-colors">
                <ImageIcon className="h-5 w-5" />
              </button>
              <button className="p-2 rounded-full hover:bg-primary/10 transition-colors">
                <Smile className="h-5 w-5" />
              </button>
              <button className="p-2 rounded-full hover:bg-primary/10 transition-colors">
                <CalendarDays className="h-5 w-5" />
              </button>
              <button className="p-2 rounded-full hover:bg-primary/10 transition-colors">
                <MapPin className="h-5 w-5" />
              </button>
            </div>
            <Button className="rounded-full px-5 font-bold h-9">
              ツイート
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeedEmpty() {
  return (
    <div className="flex flex-col items-center py-20 text-center px-8">
      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Feather className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-2xl font-bold mb-2">まだ投稿がありません</h3>
      <p className="text-muted-foreground text-sm">
        最初の投稿を作成してみましょう
      </p>
    </div>
  );
}

// ─── Right Sidebar ────────────────────────────────────────────────────────────

const TRENDS = [
  { category: "テクノロジー", tag: "#React" },
  { category: "テクノロジー", tag: "#TypeScript" },
  { category: "テクノロジー", tag: "#GraphQL" },
  { category: "テクノロジー", tag: "#TailwindCSS" },
];

function useBbsStats() {
  const { data: boards } = useQuery<Board[]>({ queryKey: ["boards"], queryFn: getBoardsQuery });
  const { data: recentPosts } = useQuery<Post[]>({
    queryKey: ["recentPosts"],
    queryFn: () => getRecentPostsQuery(100),
    staleTime: 30_000,
  });

  if (!boards || !recentPosts) return null;

  const boardMap = new Map(boards.map((b) => [b.id, b]));
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  // 板ごとの直近24h投稿数を集計 → 勢い
  const countMap = new Map<string, number>();
  for (const post of recentPosts) {
    if (now - new Date(post.createdAt).getTime() < oneDay) {
      countMap.set(post.threadId, (countMap.get(post.threadId) ?? 0) + 1);
    }
  }

  // 勢いTOP3
  const hotBoards = [...countMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, count]) => ({ board: boardMap.get(id), count }))
    .filter((x) => x.board);

  // 最新書き込み5件（重複板は除く）
  const seen = new Set<string>();
  const recentBoards: { board: Board; post: Post }[] = [];
  for (const post of recentPosts) {
    if (seen.has(post.threadId)) continue;
    const board = boardMap.get(post.threadId);
    if (!board) continue;
    seen.add(post.threadId);
    recentBoards.push({ board, post });
    if (recentBoards.length >= 5) break;
  }

  return { hotBoards, recentBoards };
}

function BbsWidget() {
  const stats = useBbsStats();

  const bbsFont = '"MS Gothic", "Osaka", Meiryo, monospace, sans-serif';
  const lnk: React.CSSProperties = { color: "#0000cc", textDecoration: "underline", fontSize: "12px" };

  return (
    <div style={{ fontFamily: bbsFont, border: "1px solid #999999", backgroundColor: "#ffffff", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ backgroundColor: "#99cc99", padding: "4px 8px", borderBottom: "1px solid #669966", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: "bold", fontSize: "13px" }}>▼ 掲示板</span>
        <Link to="/board" style={{ ...lnk, color: "#003300" }}>[一覧へ]</Link>
      </div>

      {/* 勢いスレ */}
      <div style={{ padding: "4px 8px 0", borderBottom: "1px solid #dddddd" }}>
        <div style={{ fontSize: "11px", fontWeight: "bold", color: "#cc3300", marginBottom: "2px" }}>🔥 勢いスレ</div>
        {!stats ? (
          <div style={{ fontSize: "11px", color: "#999", paddingBottom: "4px" }}>読み込み中...</div>
        ) : stats.hotBoards.length === 0 ? (
          <div style={{ fontSize: "11px", color: "#999", paddingBottom: "4px" }}>データなし</div>
        ) : (
          stats.hotBoards.map(({ board, count }, i) => (
            <div key={board!.id} style={{ fontSize: "12px", paddingBottom: "4px", display: "flex", gap: "4px", alignItems: "center" }}>
              <span style={{ color: i === 0 ? "#cc3300" : i === 1 ? "#cc6600" : "#999900", fontWeight: "bold" }}>
                {["▲", "△", "▽"][i]}
              </span>
              <Link to="/board/$threadId" params={{ threadId: board!.id }} style={lnk}>
                {board!.name}
              </Link>
              <span style={{ fontSize: "11px", color: "#999999" }}>({count})</span>
            </div>
          ))
        )}
      </div>

      {/* 最新書き込み */}
      <div style={{ padding: "4px 8px 4px" }}>
        <div style={{ fontSize: "11px", fontWeight: "bold", color: "#006600", marginBottom: "2px" }}>🕐 最新書き込み</div>
        {!stats ? (
          <div style={{ fontSize: "11px", color: "#999" }}>読み込み中...</div>
        ) : stats.recentBoards.length === 0 ? (
          <div style={{ fontSize: "11px", color: "#999" }}>投稿がありません</div>
        ) : (
          stats.recentBoards.map(({ board, post }) => (
            <div key={board.id} style={{ fontSize: "12px", paddingBottom: "3px" }}>
              <Link to="/board/$threadId" params={{ threadId: board.id }} style={lnk}>
                {board.name}
              </Link>
              <span style={{ fontSize: "11px", color: "#666666", marginLeft: "4px" }}>
                「{(post.content ?? "").slice(0, 12)}{(post.content ?? "").length > 12 ? "…" : ""}」
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function RightSidebar() {
  const { data: users, isLoading } = useQuery<UserType[]>({
    queryKey: ["users"],
    queryFn: getUsersQuery,
  });

  return (
    <aside className="hidden lg:block w-64 xl:w-80 shrink-0 sticky top-0 h-screen overflow-y-auto pl-4 xl:pl-6 py-4 space-y-4">
      {/* BBS Widget */}
      <BbsWidget />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="キーワード検索"
          className="w-full bg-muted rounded-full py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary transition-shadow"
        />
      </div>

      {/* Trends */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="font-bold text-lg">おすすめトレンド</h2>
          <button className="p-1.5 rounded-full hover:bg-muted transition-colors">
            <Settings className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        {TRENDS.map(({ category, tag }, i) => (
          <div
            key={tag}
            className={`px-4 py-3 hover:bg-muted cursor-pointer transition-colors ${i < TRENDS.length - 1 ? "border-b border-border" : ""}`}
          >
            <p className="text-xs text-muted-foreground">{category}</p>
            <p className="font-bold text-sm">{tag}</p>
          </div>
        ))}
        <div className="px-4 py-3 text-primary text-sm hover:bg-muted cursor-pointer transition-colors">
          さらに表示
        </div>
      </div>

      {/* Suggested Users */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="font-bold text-lg">おすすめユーザー</h2>
        </div>
        {isLoading
          ? [0, 1, 2].map((i) => (
              <div
                key={i}
                className={`flex items-center justify-between px-4 py-3 ${i < 2 ? "border-b border-border" : ""}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="flex flex-col gap-1.5 flex-1">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-7 w-16 rounded-full shrink-0 ml-3" />
              </div>
            ))
          : (users ?? [])
              .slice(0, 3)
              .map(({ userId, name, profile }: UserType, i: number) => (
                <div
                  key={userId}
                  className={`flex items-center justify-between px-4 py-3 hover:bg-muted cursor-pointer transition-colors ${i < Math.min((users ?? []).length, 3) - 1 ? "border-b border-border" : ""}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar
                      userId={userId}
                      name={name}
                      avatarUrl={profile?.avatarUrl}
                      avatarColors={profile?.avatarColors}
                      className="h-10 w-10 shrink-0"
                      textClassName="text-sm"
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate">{name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        @{userId}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="rounded-full shrink-0 ml-3 text-xs px-3 font-bold"
                    size="sm"
                  >
                    フォロー
                  </Button>
                </div>
              ))}
        <div className="px-4 py-3 text-primary text-sm hover:bg-muted cursor-pointer transition-colors">
          さらに表示
        </div>
      </div>
    </aside>
  );
}
