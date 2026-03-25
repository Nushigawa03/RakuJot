/**
 * WebAuthn ログイン API エンドポイント
 * POST /api/auth/webauthn/login
 *
 * phase: 'challenge' — 認証チャレンジを生成
 * phase: 'verify'    — アサーション応答を検証しセッション発行
 */

import type { ActionFunction } from "react-router";
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import {
  createUserSession,
  getSessionCookieHeader,
} from "~/features/auth/utils/session.server";
import { prisma } from "~/db.server";

const RP_ID = typeof process !== "undefined" ? (process.env.WEBAUTHN_RP_ID || "localhost") : "localhost";
const ORIGIN = typeof process !== "undefined" ? (process.env.WEBAUTHN_ORIGIN || "http://localhost:3000") : "http://localhost:3000";

// チャレンジの一時保存
const challengeStore = new Map<string, { challenge: string; userId?: string }>();

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const { phase } = body;

    if (phase === "challenge") {
      // email が指定されている場合、そのユーザーのクレデンシャルのみ
      const { email } = body;

      let allowCredentials: any[] = [];
      let userId: string | undefined;

      if (email) {
        const user = await prisma.user.findUnique({
          where: { email },
          include: { webauthnCredentials: true },
        });

        if (!user || user.webauthnCredentials.length === 0) {
          return Response.json(
            { error: "この email に生体認証が登録されていません" },
            { status: 404 }
          );
        }

        userId = user.id;
        allowCredentials = user.webauthnCredentials.map((cred) => ({
          id: cred.credentialId,
          transports: cred.transports as any[],
        }));
      }

      const options = await generateAuthenticationOptions({
        rpID: RP_ID,
        userVerification: "preferred",
        allowCredentials,
      });

      // チャレンジをセッションIDで保存
      const sessionKey = `auth_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      challengeStore.set(sessionKey, { challenge: options.challenge, userId });

      return Response.json({ ...options, sessionKey });
    }

    if (phase === "verify") {
      const { assertionResponse, sessionKey } = body;

      const stored = challengeStore.get(sessionKey);
      if (!stored) {
        return Response.json(
          { error: "チャレンジが見つかりません" },
          { status: 400 }
        );
      }

      // credentialId からクレデンシャルを検索
      const credentialId = assertionResponse.id;
      const credential = await prisma.webAuthnCredential.findUnique({
        where: { credentialId },
        include: { user: true },
      });

      if (!credential) {
        return Response.json(
          { error: "クレデンシャルが見つかりません" },
          { status: 404 }
        );
      }

      // userId が指定されていた場合、一致するか確認
      if (stored.userId && credential.userId !== stored.userId) {
        return Response.json(
          { error: "ユーザーが一致しません" },
          { status: 403 }
        );
      }

      const verification = await verifyAuthenticationResponse({
        response: assertionResponse,
        expectedChallenge: stored.challenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
        credential: {
          id: credential.credentialId,
          publicKey: new Uint8Array(credential.publicKey),
          counter: Number(credential.counter),
          transports: credential.transports as any[],
        },
      });

      if (!verification.verified) {
        return Response.json({ error: "検証に失敗しました" }, { status: 400 });
      }

      // カウンター更新
      await prisma.webAuthnCredential.update({
        where: { id: credential.id },
        data: { counter: BigInt(verification.authenticationInfo.newCounter) },
      });

      // チャレンジ削除
      challengeStore.delete(sessionKey);

      // セッション発行
      const sessionValue = createUserSession(credential.userId);

      return new Response(
        JSON.stringify({
          success: true,
          user: {
            id: credential.user.id,
            email: credential.user.email,
            name: credential.user.name,
            picture: credential.user.picture,
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Set-Cookie": getSessionCookieHeader(sessionValue),
          },
        }
      );
    }

    return Response.json({ error: "無効な phase です" }, { status: 400 });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("WebAuthn login error:", error);
    return Response.json({ error: "生体認証ログインに失敗しました" }, { status: 500 });
  }
};
