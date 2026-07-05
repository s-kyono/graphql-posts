import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getBoardsQuery, getRecentPostsQuery } from "@/lib/queries/posts";
import type { Board, Post } from "@graphql-posts/graphql-types";

export const Route = createFileRoute("/board/")({
  component: BoardPage,
});

const bbs: React.CSSProperties = {
  fontFamily: '"MS Gothic", "Osaka", Meiryo, monospace, sans-serif',
  fontSize: "13px",
  lineHeight: "1.6",
  backgroundColor: "#efefef",
  minHeight: "100vh",
  color: "#000000",
};

const link: React.CSSProperties = { color: "#0000cc", textDecoration: "underline" };

const ASCII_BANNER = `  ∩∩         ∩∩
 ( ﾟωﾟ)      ( ﾟωﾟ)
 /  |\\      /|  \\
(___/￣￣￣￣￣\\___)`;

const ASCII_DIVIDER = "=".repeat(48);

function getHotBoards(boards: Board[], posts: Post[]) {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const countMap = new Map<string, number>();
  for (const post of posts) {
    if (now - new Date(post.createdAt).getTime() < oneDay) {
      countMap.set(post.threadId, (countMap.get(post.threadId) ?? 0) + 1);
    }
  }
  const boardMap = new Map(boards.map((b) => [b.id, b]));
  return [...countMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id, count]) => ({ board: boardMap.get(id)!, count }))
    .filter((x) => x.board);
}

function BoardPage() {
  const { data: boards, isLoading } = useQuery<Board[]>({
    queryKey: ["boards"],
    queryFn: getBoardsQuery,
  });
  const { data: recentPosts } = useQuery<Post[]>({
    queryKey: ["recentPosts"],
    queryFn: () => getRecentPostsQuery(100),
    staleTime: 30_000,
  });

  const hotBoards = boards && recentPosts ? getHotBoards(boards, recentPosts) : [];

  return (
    <div style={{ backgroundColor: "#efefef", minHeight: "100vh" }}>
    <div style={{ ...bbs, maxWidth: "900px", margin: "0 auto", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ backgroundColor: "#99cc99", padding: "4px 8px", borderBottom: "1px solid #669966", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: "bold", fontSize: "14px" }}>■ 掲示板一覧</span>
        <Link to="/board/new" style={link}>[ 板を作る ]</Link>
      </div>

      {/* Breadcrumb */}
      <div style={{ padding: "3px 8px", fontSize: "12px", borderBottom: "1px solid #cccccc", backgroundColor: "#ffffff" }}>
        <Link to="/" style={link}>ホーム</Link> &gt; 掲示板
      </div>

      {/* ASCII Art Banner — メインビジュアル */}
      <div style={{ backgroundColor: "#fffef0", borderBottom: "2px solid #99cc99", borderTop: "2px solid #99cc99", margin: "8px 0", padding: "16px 24px", overflowX: "auto" }}>
        <pre style={{ margin: "0 auto", fontSize: "22px", lineHeight: "1.5", color: "#336633", userSelect: "none", textAlign: "center" }}>{ASCII_BANNER}</pre>
        <pre style={{ margin: "12px auto 0", fontSize: "13px", lineHeight: "1.4", color: "#003300", userSelect: "none", textAlign: "center" }}>
          {ASCII_DIVIDER}{"\n"}
          {"    "}掲 示 板 へ よ う こ そ ！！{"\n"}
          {ASCII_DIVIDER}
        </pre>
        <div style={{ marginTop: "10px", fontSize: "13px", color: "#555555", textAlign: "center" }}>
          全{isLoading ? "..." : (boards ?? []).length}板 ／ 匿名書き込み可 ／ ログイン不要
        </div>
        {hotBoards.length > 0 && (
          <div style={{ marginTop: "6px", fontSize: "13px", textAlign: "center" }}>
            <span style={{ color: "#cc3300", fontWeight: "bold" }}>🔥 今日の勢い：</span>
            {hotBoards.slice(0, 3).map(({ board, count }, i) => (
              <span key={board.id}>
                {i > 0 && " / "}
                <Link to="/board/$threadId" params={{ threadId: board.id }} style={link}>
                  {board.name}
                </Link>
                <span style={{ color: "#999999" }}>({count})</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Board list */}
      <div style={{ padding: "0 8px 8px" }}>
        {isLoading ? (
          <p style={{ color: "#666", fontSize: "12px" }}>読み込み中...</p>
        ) : (boards ?? []).length === 0 ? (
          <p style={{ color: "#666", fontSize: "12px" }}>
            板がまだありません。<Link to="/board/new" style={link}>板を作る</Link>
          </p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #999999", backgroundColor: "#ffffff" }}>
            <thead>
              <tr>
                <th style={{ backgroundColor: "#99cc99", padding: "4px 8px", textAlign: "left", border: "1px solid #999999", fontSize: "12px", fontWeight: "bold" }}>勢い</th>
                <th style={{ backgroundColor: "#99cc99", padding: "4px 8px", textAlign: "left", border: "1px solid #999999", fontSize: "12px", fontWeight: "bold" }}>板名</th>
                <th style={{ backgroundColor: "#99cc99", padding: "4px 8px", textAlign: "left", border: "1px solid #999999", fontSize: "12px", fontWeight: "bold" }}>説明</th>
              </tr>
            </thead>
            <tbody>
              {(boards ?? []).map((board, i) => {
                const heat = hotBoards.find((h) => h.board.id === board.id)?.count ?? 0;
                const bar = "█".repeat(Math.min(heat, 5)) + "░".repeat(Math.max(0, 5 - Math.min(heat, 5)));
                const barColor = heat >= 5 ? "#cc3300" : heat >= 3 ? "#cc8800" : heat >= 1 ? "#669900" : "#cccccc";
                return (
                  <tr key={board.id} style={{ backgroundColor: i % 2 === 0 ? "#ffffff" : "#f5f5f0" }}>
                    <td style={{ padding: "4px 8px", border: "1px solid #cccccc", fontFamily: "monospace", fontSize: "11px", color: barColor, whiteSpace: "nowrap" }}>
                      {bar}
                    </td>
                    <td style={{ padding: "4px 8px", border: "1px solid #cccccc" }}>
                      <Link to="/board/$threadId" params={{ threadId: board.id }} style={link}>
                        {board.name}
                      </Link>
                    </td>
                    <td style={{ padding: "4px 8px", border: "1px solid #cccccc", color: "#666666", fontSize: "12px" }}>
                      {board.description ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
    </div>
  );
}
