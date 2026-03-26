import type { ActionFunction } from "react-router";
import { aiMemoProcessor, aiMemoEditor } from "~/features/App/services/aiMemoProcessor.server";
import { getTags } from "~/features/memos/models/tag.server";
import { requireAuthenticatedUserId } from "~/features/auth/utils/authMode.server";

export const action: ActionFunction = async ({ request }) => {
  try {
    const userId = await requireAuthenticatedUserId(request);
    const url = new URL(request.url);
    const data = await request.json();
    const preferredApiKey = typeof data?.googleApiKey === 'string' && data.googleApiKey.trim()
      ? data.googleApiKey.trim()
      : undefined;

    // Check if this is an edit request (path ends with /edit or has edit flag)
    if (url.pathname.endsWith('/edit') || data?.mode === 'edit') {
      // Edit mode: expects { original: string, instruction: string }
      const original = (data?.original || '').toString();
      const instruction = (data?.instruction || '').toString();
      if (!original.trim() && !instruction.trim()) {
        return Response.json({ error: 'original and instruction required for edit mode' }, { status: 400 });
      }

      console.debug('[api.memos.ai/edit] received original:', original);
      console.debug('[api.memos.ai/edit] received instruction:', instruction);
      const tags = await getTags(userId);
      console.debug('[api.memos.ai/edit] tags count:', tags.length);
      const ai = await aiMemoEditor(original, instruction, tags, preferredApiKey);
      console.debug('[api.memos.ai/edit] ai result:', ai);
      return Response.json(ai);
    } else {
      // Extraction mode: expects { content: string }
      const content = (data?.content || '').toString();
      if (!content.trim()) {
        return Response.json({ error: 'content required' }, { status: 400 });
      }

      console.debug('[api.memos.ai] received content:', content);
      const tags = await getTags(userId);
      console.debug('[api.memos.ai] tags count:', tags.length);
      const ai = await aiMemoProcessor(content, tags, preferredApiKey);
      console.debug('[api.memos.ai] ai result:', ai);
      return Response.json(ai);
    }
  } catch (e) {
    if (e instanceof Response) {
      return e;
    }
    console.error('AI route error', e);
    return Response.json({ error: 'AI processing failed' }, { status: 500 });
  }
};
