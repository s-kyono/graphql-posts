import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { createBoardMutation } from "@/lib/queries/posts";

export const Route = createFileRoute("/board/new")({
  component: NewBoardPage,
});

const link: React.CSSProperties = { color: "#0000cc", textDecoration: "underline" };

const centered: React.CSSProperties = {
  fontFamily: '"MS Gothic", "Osaka", Meiryo, monospace, sans-serif',
  fontSize: "13px",
  lineHeight: "1.6",
  color: "#000000",
  maxWidth: "900px",
  margin: "0 auto",
};

function NewBoardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const mutation = useMutation({
    mutationFn: createBoardMutation,
    onSuccess: (board) => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      navigate({ to: "/board/$threadId", params: { threadId: board.id } });
    },
  });

  const handleSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!name.trim()) return;
    mutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
    });
  };

  return (
    <div style={{ backgroundColor: "#efefef", minHeight: "100vh" }}>
      <div style={centered}>
        {/* Header */}
        <div style={{ backgroundColor: "#99cc99", padding: "4px 8px", borderBottom: "1px solid #669966" }}>
          <span style={{ fontWeight: "bold", fontSize: "14px" }}>■ 板を作る</span>
        </div>

        {/* Breadcrumb */}
        <div style={{ padding: "3px 8px", fontSize: "12px", borderBottom: "1px solid #cccccc", backgroundColor: "#ffffff" }}>
          <Link to="/" style={link}>ホーム</Link> &gt;{" "}
          <Link to="/board" style={link}>掲示板</Link> &gt; 板を作る
        </div>

        <div style={{ padding: "8px" }}>
          <div style={{ backgroundColor: "#ffffff", border: "1px solid #999999" }}>
            <div style={{ backgroundColor: "#99cc99", padding: "3px 8px", borderBottom: "1px solid #669966", fontSize: "12px", fontWeight: "bold" }}>
              新規板作成
            </div>

            <form onSubmit={handleSubmit} style={{ padding: "8px" }}>
              <table>
                <tbody>
                  <tr>
                    <td style={{ fontSize: "12px", whiteSpace: "nowrap", verticalAlign: "middle", paddingRight: "8px" }}>
                      板名 <span style={{ color: "#cc0000" }}>*</span>
                    </td>
                    <td>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="例：雑談板、プログラム板..."
                        required
                        style={{ border: "1px solid #999999", padding: "2px 4px", fontSize: "13px", width: "300px" }}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontSize: "12px", whiteSpace: "nowrap", verticalAlign: "middle", paddingRight: "8px", paddingTop: "4px" }}>説明</td>
                    <td style={{ paddingTop: "4px" }}>
                      <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="板の説明（任意）"
                        style={{ border: "1px solid #999999", padding: "2px 4px", fontSize: "13px", width: "300px" }}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td />
                    <td style={{ paddingTop: "8px" }}>
                      <button
                        type="submit"
                        disabled={!name.trim() || mutation.isPending}
                        style={{ padding: "3px 16px", fontSize: "13px", cursor: mutation.isPending ? "not-allowed" : "pointer", marginRight: "8px" }}
                      >
                        {mutation.isPending ? "作成中..." : "板を作る"}
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate({ to: "/board" })}
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
      </div>
    </div>
  );
}
