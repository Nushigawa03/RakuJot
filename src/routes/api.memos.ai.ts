import type { ActionFunction } from "react-router";
import { aiMemoProcessor } from "~/features/App/services/aiMemoProcessor.server";
import { getTags } from "~/features/memos/models/tag.server";

export const action: ActionFunction = async ({ request }) => {
  try {
    const data = await request.json();
    const content = (data?.content || '').toString();
    if (!content.trim()) {
      return Response.json({ error: 'content required' }, { status: 400 });
    }

  console.debug('[api.memos.ai] received content:', content);
  // fetch current tags (with descriptions) to include in the AI instruction
  const tags = await getTags();
  console.debug('[api.memos.ai] tags count:', tags.length);
  const ai = await aiMemoProcessor(content, tags);
  console.debug('[api.memos.ai] ai result:', ai);
  return Response.json(ai);
  } catch (e) {
    console.error('AI route error', e);
    return Response.json({ error: 'AI processing failed' }, { status: 500 });
  }
};
