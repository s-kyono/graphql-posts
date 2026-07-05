import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getBoardsQuery } from "@/lib/queries/posts";
import type { Board } from "@graphql-posts/graphql-types";

export const Route = createFileRoute("/board/$threadId")({
  component: ThreadLayout,
});

const link: React.CSSProperties = { color: "#0000cc", textDecoration: "underline" };

function ThreadLayout() {
  const { threadId } = Route.useParams();

  const { data: boards } = useQuery<Board[]>({
    queryKey: ["boards"],
    queryFn: getBoardsQuery,
  });

  const board = boards?.find((b) => b.id === threadId);
  const boardName = board?.name ?? threadId;

  const inner: React.CSSProperties = { fontFamily: '"MS Gothic", "Osaka", Meiryo, monospace, sans-serif', fontSize: "13px", lineHeight: "1.6", color: "#000000", maxWidth: "900px", margin: "0 auto" };

  return (
    <div style={{ backgroundColor: "#efefef", minHeight: "100vh" }}>
      <div style={inner}>
        {/* Header */}
        <div style={{ backgroundColor: "#99cc99", padding: "4px 8px", borderBottom: "1px solid #669966", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: "bold", fontSize: "14px" }}>■ {boardName}</span>
          <Link to="/board/$threadId/new" params={{ threadId }} style={link}>[ スレを立てる ]</Link>
        </div>

        {/* Breadcrumb */}
        <div style={{ padding: "3px 8px", fontSize: "12px", borderBottom: "1px solid #cccccc", backgroundColor: "#ffffff" }}>
          <Link to="/" style={link}>ホーム</Link> &gt;{" "}
          <Link to="/board" style={link}>掲示板</Link> &gt;{" "}
          <Link to="/board/$threadId" params={{ threadId }} style={link}>{boardName}</Link>
        </div>

        <Outlet />
      </div>
    </div>
  );
}
