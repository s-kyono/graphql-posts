import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { createPostMutation } from "@/lib/queries/posts";

export const Route = createFileRoute("/board/$threadId/new")({
  component: NewThreadPage,
});

function NewThreadPage() {
  const { threadId } = Route.useParams();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const mutation = useMutation({
    mutationFn: createPostMutation,
    onSuccess: () => {
      navigate({ to: "/board/$threadId", params: { threadId } });
    },
  });

  const handleSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    mutation.mutate({
      threadId,
      userId: "anonymous",
      userName: name.trim() || "名無しさん",
      title: title.trim(),
      content: content.trim(),
    });
  };

  return (
    <div style={{ padding: "8px" }}>
      <div style={{ backgroundColor: "#ffffff", border: "1px solid #999999" }}>
        <div style={{ backgroundColor: "#99cc99", padding: "3px 8px", borderBottom: "1px solid #669966", fontSize: "12px", fontWeight: "bold" }}>
          新規スレッド作成
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
                <td style={{ fontSize: "12px", whiteSpace: "nowrap", verticalAlign: "middle", paddingRight: "8px", paddingTop: "4px" }}>
                  タイトル <span style={{ color: "#cc0000" }}>*</span>
                </td>
                <td style={{ paddingTop: "4px" }}>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="スレッドのタイトルを入力..."
                    required
                    style={{ border: "1px solid #999999", padding: "2px 4px", fontSize: "13px", width: "400px" }}
                  />
                </td>
              </tr>
              <tr>
                <td style={{ fontSize: "12px", whiteSpace: "nowrap", verticalAlign: "top", paddingRight: "8px", paddingTop: "8px" }}>
                  本文 <span style={{ color: "#cc0000" }}>*</span>
                </td>
                <td style={{ paddingTop: "4px" }}>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={6}
                    required
                    style={{ border: "1px solid #999999", padding: "2px 4px", fontSize: "13px", width: "400px", resize: "vertical", display: "block" }}
                  />
                </td>
              </tr>
              <tr>
                <td />
                <td style={{ paddingTop: "8px" }}>
                  <button
                    type="submit"
                    disabled={!title.trim() || !content.trim() || mutation.isPending}
                    style={{ padding: "3px 16px", fontSize: "13px", cursor: mutation.isPending ? "not-allowed" : "pointer", marginRight: "8px" }}
                  >
                    {mutation.isPending ? "作成中..." : "スレッドを立てる"}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate({ to: "/board/$threadId", params: { threadId } })}
                    disabled={mutation.isPending}
                    style={{ padding: "3px 16px", fontSize: "13px", cursor: "pointer" }}
                  >
                    キャンセル
                  </button>
                  {mutation.isError && (
                    <span style={{ color: "#cc0000", fontSize: "12px", marginLeft: "8px" }}>
                      {mutation.error instanceof Error ? mutation.error.message : "作成に失敗しました"}
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
