import type { ActionFunction, LoaderFunction } from "react-router";
import { prisma } from "~/db.server";
import { requireAuthenticatedUserId } from "~/features/auth/utils/authMode.server";

const formatCredential = (credential: {
  id: string;
  transports: string[];
  createdAt: Date;
}) => ({
  id: credential.id,
  transports: credential.transports,
  createdAt: credential.createdAt.toISOString(),
});

export const loader: LoaderFunction = async ({ request }) => {
  const userId = await requireAuthenticatedUserId(request);

  const credentials = await prisma.webAuthnCredential.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      transports: true,
      createdAt: true,
    },
  });

  return Response.json({ credentials: credentials.map(formatCredential) });
};

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== "DELETE") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const userId = await requireAuthenticatedUserId(request);
  const body = await request.json().catch(() => ({}));
  const id = typeof body?.id === "string" ? body.id : "";

  if (!id) {
    return Response.json({ error: "削除するパスキーを指定してください" }, { status: 400 });
  }

  const credential = await prisma.webAuthnCredential.findFirst({
    where: { id, userId },
    select: { id: true },
  });

  if (!credential) {
    return Response.json({ error: "パスキーが見つかりません" }, { status: 404 });
  }

  await prisma.webAuthnCredential.delete({
    where: { id: credential.id },
  });

  return Response.json({ success: true });
};
