/**
 * WebAuthn 登録 API エンドポイント
 * POST /api/auth/webauthn/register
 *
 * phase: 'challenge' — 登録チャレンジを生成して返す
 * phase: 'verify'    — アテステーション応答を検証してクレデンシャルを保存
 */

import type { ActionFunction } from "react-router";
import { requireAuthenticatedUserId } from "~/features/auth/utils/authMode.server";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { prisma } from "~/db.server";

const RP_NAME = "RakuJot";
const RP_ID = typeof process !== "undefined" ? (process.env.WEBAUTHN_RP_ID || "localhost") : "localhost";
const ORIGIN = typeof process !== "undefined" ? (process.env.WEBAUTHN_ORIGIN || "http://localhost:3000") : "http://localhost:3000";

// チャレンジの一時保存（本番では Redis 等が望ましい）
const challengeStore = new Map<string, string>();

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const userId = await requireAuthenticatedUserId(request);
    const body = await request.json();
    const { phase } = body;

    if (phase === "challenge") {
      // ユーザーの既存クレデンシャルを取得
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { webauthnCredentials: true },
      });

      if (!user) {
        return Response.json({ error: "ユーザーが見つかりません" }, { status: 404 });
      }

      const options = await generateRegistrationOptions({
        rpName: RP_NAME,
        rpID: RP_ID,
        userName: user.email,
        userDisplayName: user.name || user.email,
        attestationType: "none",
        excludeCredentials: user.webauthnCredentials.map((cred) => ({
          id: cred.credentialId,
          transports: cred.transports as any[],
        })),
        authenticatorSelection: {
          residentKey: "preferred",
          userVerification: "preferred",
          authenticatorAttachment: "platform",
        },
      });

      // チャレンジを保存
      challengeStore.set(userId, options.challenge);

      return Response.json(options);
    }

    if (phase === "verify") {
      const expectedChallenge = challengeStore.get(userId);
      if (!expectedChallenge) {
        return Response.json({ error: "チャレンジが見つかりません。もう一度お試しください。" }, { status: 400 });
      }

      const { attestationResponse } = body;

      const verification = await verifyRegistrationResponse({
        response: attestationResponse,
        expectedChallenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
      });

      if (!verification.verified || !verification.registrationInfo) {
        return Response.json({ error: "検証に失敗しました" }, { status: 400 });
      }

      const { credential } = verification.registrationInfo;

      // クレデンシャルをDBに保存
      await prisma.webAuthnCredential.create({
        data: {
          userId,
          credentialId: credential.id,
          publicKey: Buffer.from(credential.publicKey),
          counter: BigInt(credential.counter),
          transports: (body.attestationResponse?.response?.transports as string[]) || [],
        },
      });

      // チャレンジを削除
      challengeStore.delete(userId);

      return Response.json({ success: true, message: "生体認証が登録されました" });
    }

    return Response.json({ error: "無効な phase です" }, { status: 400 });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("WebAuthn register error:", error);
    return Response.json({ error: "生体認証の登録に失敗しました" }, { status: 500 });
  }
};
