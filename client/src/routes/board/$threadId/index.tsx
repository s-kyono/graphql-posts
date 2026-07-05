import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getThreadsQuery, createPostMutation, ON_NEW_POST_SUBSCRIPTION, THREAD_VIEWER_COUNT_SUBSCRIPTION } from "@/lib/queries/posts";
import { wsClient } from "@/lib/graphql-client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { Post } from "@graphql-posts/graphql-types";

function getAnonId(): string {
  const key = "bbs_anon_id";
  const stored = sessionStorage.getItem(key);
  if (stored) return stored;
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const id = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  sessionStorage.setItem(key, id);
  return id;
}

export const Route = createFileRoute("/board/$threadId/")({
  component: ThreadIndexPage,
});

const DAYS = ["日", "月", "火", "水", "木", "金", "土"];

function formatDate(isoString: string) {
  const d = new Date(isoString);
  const ymd = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
  const day = DAYS[d.getDay()];
  const hms = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
  return `${ymd}(${day}) ${hms}`;
}

function appendPost(posts: Post[] | undefined, post: Post) {
  if (!posts) return [post];
  if (posts.some((p) => p.id === post.id)) return posts;
  return [...posts, post];
}

function ThreadIndexPage() {
  const { threadId } = Route.useParams();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  const { data: posts, isLoading } = useQuery<Post[]>({
    queryKey: ["threads", threadId],
    queryFn: () => getThreadsQuery(threadId),
  });

  const mutation = useMutation({
    mutationFn: createPostMutation,
    onSuccess: (post) => {
      queryClient.setQueryData<Post[]>(["threads", threadId], (old) => appendPost(old, post));
    },
  });

  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [viewerCount, setViewerCount] = useState<number | null>(null);

  useEffect(() => {
    setIsLive(false);
    setViewerCount(null);

    const offClosed = wsClient.on("closed", () => { setIsLive(false); setViewerCount(null); });
    const offError = wsClient.on("error", () => { setIsLive(false); setViewerCount(null); });

    const unsubscribePosts = wsClient.subscribe<{ onNewPost: Post }>(
      { query: ON_NEW_POST_SUBSCRIPTION, variables: { threadId } },
      {
        next: ({ data }) => {
          const newPost = data?.onNewPost;
          if (!newPost) return;
          queryClient.setQueryData<Post[]>(["threads", threadId], (old) => appendPost(old, newPost));
        },
        error: (err) => {
          console.error("[WSS] onNewPost subscription error", err);
        },
        complete: () => {},
      },
    );

    const unsubscribeViewers = wsClient.subscribe<{ threadViewerCount: number }>(
      { query: THREAD_VIEWER_COUNT_SUBSCRIPTION, variables: { threadId } },
      {
        next: ({ data }) => {
          if (data?.threadViewerCount !== undefined) {
            setViewerCount(data.threadViewerCount);
            setIsLive(true);
          }
        },
        error: () => {},
        complete: () => {},
      },
    );

    return () => {
      unsubscribePosts();
      unsubscribeViewers();
      offClosed();
      offError();
    };
  }, [threadId, queryClient]);

  const handleSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!content.trim()) return;
    mutation.mutate({
      threadId,
      userId: currentUser?.userId ?? getAnonId(),
      userName: name.trim() || "名無しさん",
      content: content.trim(),
    });
    setContent("");
  };

  const totalPosts = (posts ?? []).length;

  return (
    <div style={{ padding: "8px" }}>
      {/* Status bar */}
      <div style={{ fontSize: "12px", color: "#666666", marginBottom: "6px" }}>
        全 {isLoading ? "..." : totalPosts} レス{" "}
        <span style={{ color: isLive ? "#009900" : "#cc0000" }}>
          {isLive
            ? (viewerCount ?? 1) - 1 > 0
              ? `● 他${(viewerCount ?? 1) - 1}人が閲覧中`
              : "● 接続中"
            : "○ 接続中..."}
        </span>
        {" "}
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ["threads", threadId] })}
          style={{ color: "#0000cc", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", fontSize: "12px", padding: 0 }}
        >
          [再読込]
        </button>
      </div>

      {/* Post list */}
      <div style={{ backgroundColor: "#ffffff", border: "1px solid #999999", marginBottom: "16px" }}>
        {isLoading ? (
          <div style={{ padding: "16px", color: "#666666", fontSize: "12px" }}>読み込み中...</div>
        ) : (posts ?? []).length === 0 ? (
          <div style={{ padding: "16px", color: "#666666", fontSize: "12px" }}>まだ投稿がありません。最初の書き込みをどうぞ。</div>
        ) : (
          (posts ?? []).map((post, i) => (
            <PostItem key={post.id} post={post} index={i + 1} />
          ))
        )}
      </div>

      {/* Reply form */}
      <div style={{ backgroundColor: "#ffffff", border: "1px solid #999999" }}>
        <div style={{ backgroundColor: "#99cc99", padding: "3px 8px", borderBottom: "1px solid #669966", fontSize: "12px", fontWeight: "bold" }}>
          書き込む
        </div>
        <form onSubmit={handleSubmit} style={{ padding: "8px" }}>
          <table>
            <tbody>
              <tr>
                <td style={{ fontSize: "12px", whiteSpace: "nowrap", verticalAlign: "middle", paddingRight: "8px" }}>名前</td>
                <td>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="名無しさん"
                    style={{ border: "1px solid #999999", padding: "2px 4px", fontSize: "13px", width: "200px" }}
                  />
                </td>
              </tr>
              <tr>
                <td style={{ fontSize: "12px", whiteSpace: "nowrap", verticalAlign: "top", paddingRight: "8px", paddingTop: "6px" }}>本文</td>
                <td style={{ paddingTop: "4px" }}>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={5}
                    style={{ border: "1px solid #999999", padding: "2px 4px", fontSize: "13px", width: "400px", resize: "vertical", display: "block" }}
                  />
                </td>
              </tr>
              <tr>
                <td />
                <td style={{ paddingTop: "6px" }}>
                  <button
                    type="submit"
                    disabled={!content.trim() || mutation.isPending}
                    style={{ padding: "3px 16px", fontSize: "13px", cursor: mutation.isPending ? "not-allowed" : "pointer" }}
                  >
                    {mutation.isPending ? "送信中..." : "書き込む"}
                  </button>
                  {mutation.isError && (
                    <span style={{ color: "#cc0000", fontSize: "12px", marginLeft: "8px" }}>
                      {mutation.error instanceof Error ? mutation.error.message : "送信に失敗しました"}
                    </span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </form>
      </div>
    </div>
  );
}

function PostItem({ post, index }: { post: Post; index: number }) {
  return (
    <div style={{ borderBottom: "1px solid #dddddd" }}>
      {/* Post header */}
      <div style={{ backgroundColor: "#ddffdd", padding: "3px 8px", fontSize: "12px", display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "baseline" }}>
        <a
          id={`res${index}`}
          href={`#res${index}`}
          style={{ color: "#009900", fontWeight: "bold", textDecoration: "none" }}
        >
          {index}
        </a>
        {post.title && (
          <span style={{ fontWeight: "bold", color: "#cc0000" }}>【{post.title}】</span>
        )}
        <span style={{ fontWeight: "bold" }}>{post.userName ?? "名無しさん"}</span>
        <span style={{ color: "#666666" }}>{formatDate(post.createdAt)}</span>
        <span style={{ fontFamily: "monospace", color: "#666666" }}>ID:{post.userId.slice(0, 8)}</span>
      </div>
      {/* Post body */}
      <div style={{ padding: "6px 8px 6px 28px", fontSize: "13px", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        {post.content}
      </div>
    </div>
  );
}
