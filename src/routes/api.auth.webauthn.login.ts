/**
 * POST /api/auth/webauthn/login
 * phase: 'challenge' — 認証チャレンジを生成（discoverable credential なのでユーザー指定なし）
 * phase: 'verify'    — アサーション応答を検証しセッションを発行
 */
import type { ActionFunctionArgs } from "react-router";
import { generateAuthenticationOptions, verifyAuthenticationResponse } from "@simplewebauthn/server";
import { createUserSession, getSessionCookieHeader } from "~/features/auth/utils/session.server";
import { prisma } from "~/db.server";
import { getWebAuthnRequestConfig } from "~/features/auth/config/webauthn.server";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const challengeStore = new Map<string, { challenge: string; origin: string; rpID: string; expiresAt: number }>();

const takeChallenge = (sessionKey: string) => {
  const stored = challengeStore.get(sessionKey);
  challengeStore.delete(sessionKey);
  return stored && stored.expiresAt >= Date.now() ? stored : null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });

  try {
    const body = await request.json();

    if (body.phase === "challenge") {
      const { rpID, origin } = getWebAuthnRequestConfig(request);
      const options = await generateAuthenticationOptions({ rpID, userVerification: "required" });
      const sessionKey = `auth_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      challengeStore.set(sessionKey, { challenge: options.challenge, origin, rpID, expiresAt: Date.now() + CHALLENGE_TTL_MS });
      return Response.json({ ...options, sessionKey });
    }

    if (body.phase === "verify") {
      const { assertionResponse, sessionKey } = body;
      const stored = takeChallenge(sessionKey);
      if (!stored) return Response.json({ error: "チャレンジが見つかりません" }, { status: 400 });

      const credential = await prisma.webAuthnCredential.findUnique({
        where: { credentialId: assertionResponse.id },
        include: { user: true },
      });
      if (!credential) return Response.json({ error: "クレデンシャルが見つかりません" }, { status: 404 });

      const verification = await verifyAuthenticationResponse({
        response: assertionResponse,
        expectedChallenge: stored.challenge,
        expectedOrigin: stored.origin,
        expectedRPID: stored.rpID,
        credential: {
          id: credential.credentialId,
          publicKey: new Uint8Array(credential.publicKey),
          counter: Number(credential.counter),
          transports: credential.transports as any[],
        },
        requireUserVerification: true,
      });
      if (!verification.verified) return Response.json({ error: "検証に失敗しました" }, { status: 400 });

      await prisma.webAuthnCredential.update({
        where: { id: credential.id },
        data: { counter: BigInt(verification.authenticationInfo.newCounter) },
      });

      const { id, email, name, picture } = credential.user;
      return Response.json(
        { success: true, user: { id, email, name, picture } },
        { headers: { "Set-Cookie": getSessionCookieHeader(createUserSession(id)) } },
      );
    }

    return Response.json({ error: "無効な phase です" }, { status: 400 });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("WebAuthn login error:", error);
    return Response.json({ error: "生体認証ログインに失敗しました" }, { status: 500 });
  }
};
