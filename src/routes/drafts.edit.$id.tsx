import { useLoaderData, useNavigate } from "@remix-run/react";
import { json } from "@remix-run/node";
import type { LoaderFunction, ActionFunction } from "@remix-run/node";
import { PrismaClient } from "@prisma/client";
import React, { useState } from "react";
import { getMemo } from "~/features/drafts/models/memo.server";
import EditMemoForm from './EditMemoForm';

const prisma = new PrismaClient();

export const loader: LoaderFunction = async ({ params }) => {
  const { id } = params;

  if (!id) {
    return json({ error: "メモIDが指定されていません。" }, { status: 400 });
  }

  const memo = await getMemo(id);

  if (!memo) {
    return json({ error: "メモが見つかりません。" }, { status: 404 });
  }
  return json(memo);
};

export default function EditMemo() {
  const memo = useLoaderData();
  const navigate = useNavigate();
  const [title, setTitle] = useState(memo.title || "");
  const [body, setBody] = useState(memo.body || "");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.append("title", title);
    formData.append("body", body);

    try {
      const response = await fetch(`/api/memos/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: memo.id,
          title,
          body,
        }),
      });
      console.log("Response:", response);
      if (response.ok) {
        // await fetchMemos(); // メモのリストを更新
        navigate("/drafts"); // 保存後にトップページに戻る
      } else {
        const errorData = await response.json();
        setError(errorData.error || "メモの更新に失敗しました。");
      }
    } catch (err) {
      setError("ネットワークエラーが発生しました。");
    }
  };

  const handleDelete = async () => {
    console.log("Deleting memo:", memo.id);
    await fetch(`/api/memos`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: memo.id }),
    });
    navigate("/drafts");
  };

  return (
    <div>
      <h1>メモを編集</h1>
      {error && <div style={{ color: "red" }}>エラー: {error}</div>}
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="title">タイトル:</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="body">内容:</label>
          <textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
        <button type="submit">保存</button>
      </form>
      <button onClick={handleDelete}>削除</button>
    </div>
  );
}
