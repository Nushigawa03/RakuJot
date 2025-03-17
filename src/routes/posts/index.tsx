import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import type { LoaderFunction, ActionFunction } from "@remix-run/node";
import { getPosts, createPost } from "~/features/posts/models/post.server";
import { PostForm } from "~/features/posts/components/PostForm";
import type { Post } from "~/features/posts/types/post";

export const loader: LoaderFunction = async () => {
  const posts = await getPosts();
  return json({ posts });
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;

  if (!title || !content) {
    return json(
      { error: "タイトルと内容は必須です" },
      { status: 400 }
    );
  }

  try {
    await createPost({ title, content }, "user-id");
    return json({ success: true });
  } catch (error) {
    return json(
      { error: "投稿の作成に失敗しました" },
      { status: 500 }
    );
  }
};

export default function Posts() {
  const { posts } = useLoaderData<{ posts: Post[] }>();

  return (
    <div>
      <h1>投稿一覧</h1>
      <PostForm />
      <div>
        {posts.map((post) => (
          <article key={post.id}>
            <h2>{post.title}</h2>
            <p>{post.content}</p>
          </article>
        ))}
      </div>
    </div>
  );
}