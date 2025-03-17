import { Form, useActionData, useNavigation } from "@remix-run/react";

export function PostForm() {
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <Form method="post" className="space-y-4">
      {actionData?.error && (
        <div className="text-red-500">{actionData.error}</div>
      )}
      
      <div>
        <label htmlFor="title">タイトル</label>
        <input
          id="title"
          name="title"
          type="text"
          required
        />
      </div>

      <div>
        <label htmlFor="content">内容</label>
        <textarea
          id="content"
          name="content"
          required
        />
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "投稿中..." : "投稿する"}
      </button>
    </Form>
  );
}